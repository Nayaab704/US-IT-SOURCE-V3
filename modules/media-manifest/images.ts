import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

/**
 * Build-time image step for public/media (used by the media-manifest module, ./index.ts).
 *
 * Every source image is read by CONTENT (a PNG named .webp is still a PNG), optionally redacted
 * (public/media/redactions.json — solid blocks over private data; the original is never touched),
 * resized to a few widths for srcset and written as WebP (+ AVIF for photos) into a cache folder
 * served at /_m/. File names carry a hash of the source bytes + settings, so a replaced image always
 * gets a new URL (cache-busting) and unchanged images are never re-encoded.
 */
export interface Img {
  /** Largest WebP (fallback src). */
  src: string
  /** WebP candidates, "url 800w, url 1600w". */
  srcset: string
  /** AVIF candidates (photos only; screenshots stay WebP — AVIF smears UI text). */
  avif?: string
  /** Pixel size of the largest output (for width/height attributes → no layout shift). */
  width: number
  height: number
}

export type Role = 'screen' | 'phone' | 'photo-bg' | 'photo' | 'portrait' | 'seq' | 'poster' | 'still'

interface Recipe {
  widths: number[]
  webp: number
  avif?: number
}

/** Max widths per role (smaller ones feed srcset). Never upscaled. */
const RECIPES: Record<Role, Recipe> = {
  screen: { widths: [800, 1600], webp: 88 },
  phone: { widths: [450, 900], webp: 88 },
  'photo-bg': { widths: [1200, 1600, 2400], webp: 78, avif: 52 },
  photo: { widths: [700, 1400], webp: 80, avif: 55 },
  portrait: { widths: [600, 1200], webp: 82, avif: 55 },
  seq: { widths: [800, 1600], webp: 80, avif: 55 },
  poster: { widths: [720], webp: 80 },
  still: { widths: [720], webp: 82 },
}
/** Bump to re-encode everything after changing the encoder settings above. */
const PIPELINE_VERSION = '1'

/** Fractional rectangles (0–1 of the image) to block out, keyed by path under public/media (e.g. "projects/nester/02.png"). */
export type Redactions = Record<string, { x: number; y: number; w: number; h: number; note?: string }[]>
const REDACT_COLOR = { r: 22, g: 24, b: 29, alpha: 1 } // ink #16181d — reads as a deliberate redaction

export const PUBLIC_BASE = '/_m'

const hashOf = (...parts: (Uint8Array | string)[]) => {
  const h = createHash('sha1')
  for (const p of parts) h.update(p)
  return h.digest('hex').slice(0, 10)
}

/** Content hash for files served as they are (videos): "?v=<hash>". */
export function fileVersion(file: string) {
  return hashOf(readFileSync(file))
}

export function readRedactions(mediaRoot: string): Redactions {
  const f = join(mediaRoot, 'redactions.json')
  if (!existsSync(f)) return {}
  try {
    const raw = JSON.parse(String(readFileSync(f))) as Record<string, unknown>
    const out: Redactions = {}
    for (const [k, v] of Object.entries(raw)) if (!k.startsWith('_') && Array.isArray(v)) out[k] = v as Redactions[string]
    return out
  } catch (e) {
    console.warn('[media] redactions.json could not be read:', e)
    return {}
  }
}

export class ImagePipeline {
  /** Output files referenced by the current manifest (the rest of the cache is stale). */
  readonly used = new Set<string>()

  constructor(
    /** The public/ folder. */
    private publicRoot: string,
    private outDir: string,
    private redactions: Redactions,
  ) {
    mkdirSync(outDir, { recursive: true })
  }

  /** Pixel count of a source (0 if unreadable) — to choose between several exports of one image. */
  async pixels(rel: string): Promise<number> {
    try {
      const m = await sharp(new Uint8Array(readFileSync(join(this.publicRoot, ...rel.split('/'))))).metadata()
      return (m.width ?? 0) * (m.height ?? 0)
    } catch {
      return 0
    }
  }

  /**
   * One source image → its variants. `rel` is the path under public/ (forward slashes), e.g.
   * "media/projects/nester/02.png". Returns null for files that are not readable images.
   * A 'screen' that turns out to be portrait is encoded as a 'phone' screen.
   */
  async process(rel: string, role: Role): Promise<(Img & { portrait: boolean }) | null> {
    const bytes = new Uint8Array(readFileSync(join(this.publicRoot, ...rel.split('/'))))
    const key = rel.replace(/^media\//, '')
    const boxes = this.redactions[key] ?? []
    const base = key.replace(/\.[^./]+$/, '').replace(/[^a-z0-9/_-]/gi, '-')

    let meta: { width?: number; height?: number; format?: string; orientation?: number }
    try {
      meta = await sharp(bytes).metadata()
    } catch {
      console.warn(`[media] skipped ${rel}: not a readable image`)
      return null
    }
    if (!meta.width || !meta.height) return null
    // EXIF orientations 5–8 swap the axes once rotated upright.
    const swap = (meta.orientation ?? 1) >= 5
    const W = swap ? meta.height : meta.width
    const H = swap ? meta.width : meta.height
    const recipe = RECIPES[role === 'screen' && H > W ? 'phone' : role]
    const hash = hashOf(bytes, JSON.stringify(boxes), JSON.stringify(recipe), PIPELINE_VERSION)
    const widths = [...new Set(recipe.widths.map((w) => Math.min(w, W)))].sort((a, b) => a - b)

    const name = (w: number, ext: string) => `${base}.${hash}.${w}.${ext}`
    const formats: ['webp' | 'avif', number][] = [['webp', recipe.webp]]
    if (recipe.avif) formats.push(['avif', recipe.avif])

    let upright: Uint8Array | null = null
    for (const w of widths) {
      for (const [ext, quality] of formats) {
        const file = name(w, ext)
        this.used.add(file)
        const target = join(this.outDir, ...file.split('/'))
        if (existsSync(target)) continue
        upright ??= await this.prepare(bytes, W, H, boxes)
        const img = sharp(upright).resize({ width: w, withoutEnlargement: true })
        const out = ext === 'webp' ? await img.webp({ quality, effort: 5 }).toBuffer() : await img.avif({ quality, effort: 4 }).toBuffer()
        mkdirSync(join(target, '..'), { recursive: true })
        // Write then rename: a build interrupted mid-write never leaves a truncated "cached" file.
        writeFileSync(`${target}.tmp`, out)
        renameSync(`${target}.tmp`, target)
      }
    }
    if (boxes.length) console.info(`[media] redacted ${boxes.length} area(s) in ${rel}`)

    const top = widths[widths.length - 1]!
    const url = (w: number, ext: string) => `${PUBLIC_BASE}/${name(w, ext)}`
    const set = (ext: string) => widths.map((w) => `${url(w, ext)} ${w}w`).join(', ')
    return {
      src: url(top, 'webp'),
      srcset: set('webp'),
      avif: recipe.avif ? set('avif') : undefined,
      width: top,
      height: Math.round((H * top) / W),
      portrait: H > W,
    }
  }

  /** Rotate upright and paint the redaction blocks, once per source (lossless PNG in between). */
  private async prepare(bytes: Uint8Array, W: number, H: number, boxes: Redactions[string]) {
    let img = sharp(bytes).rotate()
    if (boxes.length) {
      const composites = boxes.map((b) => {
        const left = Math.max(0, Math.round(b.x * W))
        const top = Math.max(0, Math.round(b.y * H))
        const width = Math.max(1, Math.min(W - left, Math.round(b.w * W)))
        const height = Math.max(1, Math.min(H - top, Math.round(b.h * H)))
        return { input: { create: { width, height, channels: 4 as const, background: REDACT_COLOR } }, left, top }
      })
      img = sharp(await img.png().toBuffer()).composite(composites)
    }
    return new Uint8Array(await img.png({ compressionLevel: 1 }).toBuffer())
  }

  /** Remove cache files no longer referenced (old hashes) so the deployed folder doesn't grow forever. */
  prune() {
    const walk = (dir: string, rel: string) => {
      if (!existsSync(dir)) return
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name
        if (e.isDirectory()) walk(join(dir, e.name), r)
        else if (!this.used.has(r) && !r.endsWith('.tmp')) rmFile(join(dir, e.name))
      }
    }
    walk(this.outDir, '')
  }
}

function rmFile(path: string) {
  try {
    unlinkSync(path)
  } catch {
    // Locked or already gone: harmless, it is only an unreferenced cache file.
  }
}
