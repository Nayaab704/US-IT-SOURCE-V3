import { existsSync, readdirSync, statSync, watch } from 'node:fs'
import { join } from 'node:path'
import { addTemplate, defineNuxtModule, updateTemplates } from 'nuxt/kit'
import { fileVersion, ImagePipeline, PUBLIC_BASE, readRedactions, type Img, type Role } from './images'

/**
 * Owner media, auto-detected from public/media/ and exposed as `#build/media-manifest.mjs`.
 * Images go through the image step (./images.ts): real format detected from content,
 * redactions applied, resized WebP/AVIF variants with content-hashed names served at /_m/. Any of
 * PNG / JPG / WebP / AVIF works under any of these names:
 * - projects/<slug>/NN.* (NN-mobile.* or a portrait image = phone screen) → screens
 * - services/<slug>/bg.* (largest of several wins) → chapter background; seq-NN.* → photo sequence;
 *   loop.(mp4|webm) → video
 * - team/* → portraits
 * - contact/* → photos; NN.webm + NN.mp4 + NN-poster.* → one video loop each
 * - menu/<key>.* → menu stills
 * - public/video/ops.(mp4|webm) + ops-poster.* → the flexible frame's footage
 * Videos are served as they are, with ?v=<content hash>. Regenerated in dev when public/media changes.
 */
export interface ProjectShot {
  img: Img
  mobile: boolean
  /** The file's number ("01"): 01.png and 01-mobile.png are two views of screen 01. */
  num: string
}
export interface MediaManifest {
  projects: Record<string, ProjectShot[]>
  services: Record<string, { bg: Img | null; seq: Img[]; loop: string[] }>
  team: Img[]
  contact: { images: Img[]; videos: { sources: string[]; poster: Img | null }[] }
  menu: Record<string, Img>
  flex: { sources: string[]; poster: Img | null }
  /** Shipped ribbon environment bakes in public/ribbon/ (app/utils/ribbon/envBake.ts). */
  ribbonEnv: string[]
}

const IMAGE = /\.(png|jpe?g|webp|avif)$/i
const VIDEO_ORDER = (f: string) => (/\.webm$/i.test(f) ? 0 : 1) // WebM first (smaller), then MP4
const FILENAME = 'media-manifest.mjs'

const dirs = (d: string) => (existsSync(d) ? readdirSync(d).filter((x) => statSync(join(d, x)).isDirectory()) : [])
const files = (d: string) => (existsSync(d) ? readdirSync(d).filter((x) => !statSync(join(d, x)).isDirectory()).sort() : [])

async function scan(publicRoot: string, cacheDir: string): Promise<MediaManifest> {
  const root = join(publicRoot, 'media')
  const pipe = new ImagePipeline(publicRoot, cacheDir, readRedactions(root))
  const img = (rel: string, role: Role) => pipe.process(rel, role)
  const video = (rel: string) => `/${rel}?v=${fileVersion(join(publicRoot, ...rel.split('/')))}`
  const out: MediaManifest = { projects: {}, services: {}, team: [], contact: { images: [], videos: [] }, menu: {}, flex: { sources: [], poster: null }, ribbonEnv: [] }

  for (const slug of dirs(join(root, 'projects'))) {
    const shots: ProjectShot[] = []
    for (const f of files(join(root, 'projects', slug))) {
      const m = /^(\d{2})(-mobile)?\.\w+$/i.exec(f)
      if (!m || !IMAGE.test(f)) continue
      const r = await img(`media/projects/${slug}/${f}`, m[2] ? 'phone' : 'screen')
      if (r) shots.push({ img: strip(r), mobile: !!m[2] || r.portrait, num: m[1]! })
    }
    if (shots.length) out.projects[slug] = shots
  }

  for (const slug of dirs(join(root, 'services'))) {
    const all = files(join(root, 'services', slug))
    const rel = (f: string) => `media/services/${slug}/${f}`
    // Several bg.* (older exports): the one with the most pixels is the source; bg-1600.* are ignored.
    let best: string | null = null
    let bestPx = 0
    for (const f of all.filter((x) => /^bg\.\w+$/i.test(x) && IMAGE.test(x))) {
      const px = await pipe.pixels(rel(f))
      if (px > bestPx) [best, bestPx] = [f, px]
    }
    const bg = best ? await img(rel(best), 'photo-bg') : null
    const seq: Img[] = []
    for (const f of all.filter((x) => /^seq-\d{2}\.\w+$/i.test(x) && IMAGE.test(x))) {
      const r = await img(rel(f), 'seq')
      if (r) seq.push(strip(r))
    }
    const loop = all.filter((f) => /^loop\.(webm|mp4)$/i.test(f)).sort((a, b) => VIDEO_ORDER(a) - VIDEO_ORDER(b)).map((f) => video(rel(f)))
    if (bg || seq.length || loop.length) out.services[slug] = { bg: bg && strip(bg), seq, loop }
  }

  for (const f of files(join(root, 'team')).filter((x) => IMAGE.test(x))) {
    const r = await img(`media/team/${f}`, 'portrait')
    if (r) out.team.push(strip(r))
  }

  const contact = files(join(root, 'contact'))
  for (const f of contact.filter((x) => IMAGE.test(x) && !/-poster\./i.test(x))) {
    const r = await img(`media/contact/${f}`, 'photo')
    if (r) out.contact.images.push(strip(r))
  }
  const names = [...new Set(contact.filter((f) => /\.(mp4|webm)$/i.test(f)).map((f) => f.replace(/\.(mp4|webm)$/i, '')))]
  for (const n of names) {
    const sources = contact.filter((f) => f === `${n}.webm` || f === `${n}.mp4`).sort((a, b) => VIDEO_ORDER(a) - VIDEO_ORDER(b))
    const posterFile = contact.find((f) => f.startsWith(`${n}-poster.`) && IMAGE.test(f))
    const poster = posterFile ? await img(`media/contact/${posterFile}`, 'poster') : null
    out.contact.videos.push({ sources: sources.map((f) => video(`media/contact/${f}`)), poster: poster && strip(poster) })
  }

  for (const f of files(join(root, 'menu')).filter((x) => IMAGE.test(x))) {
    const r = await img(`media/menu/${f}`, 'still')
    if (r) out.menu[f.replace(/\.\w+$/, '')] = strip(r)
  }

  const vids = files(join(publicRoot, 'video'))
  out.flex.sources = vids.filter((f) => /^ops\.(webm|mp4)$/i.test(f)).sort((a, b) => VIDEO_ORDER(a) - VIDEO_ORDER(b)).map((f) => video(`video/${f}`))
  const flexPoster = vids.find((f) => /^ops-poster\./i.test(f) && IMAGE.test(f))
  const fp = flexPoster ? await img(`video/${flexPoster}`, 'poster') : null
  out.flex.poster = fp && strip(fp)

  out.ribbonEnv = files(join(publicRoot, 'ribbon')).filter((f) => /^env-[0-9a-f]{8}\.png$/.test(f))

  pipe.prune()
  return out
}

/** Drop the internal `portrait` flag from what goes into the client bundle. */
function strip({ portrait: _p, ...rest }: Img & { portrait: boolean }): Img {
  return rest
}

const TYPES = `declare module '#build/media-manifest.mjs' {
  interface Img { src: string; srcset: string; avif?: string; width: number; height: number }
  const media: {
    projects: Record<string, { img: Img; mobile: boolean; num: string }[]>
    services: Record<string, { bg: Img | null; seq: Img[]; loop: string[] }>
    team: Img[]
    contact: { images: Img[]; videos: { sources: string[]; poster: Img | null }[] }
    menu: Record<string, Img>
    flex: { sources: string[]; poster: Img | null }
    ribbonEnv: string[]
  }
  export type MediaImg = Img
  export default media
}
`

export default defineNuxtModule({
  meta: { name: 'media-manifest' },
  async setup(_options, nuxt) {
    const publicRoot = join(nuxt.options.rootDir, 'public')
    const mediaRoot = join(publicRoot, 'media')
    // In node_modules/.cache: survives between builds (also on Vercel), never committed.
    const cacheDir = join(nuxt.options.rootDir, 'node_modules', '.cache', 'media')

    let manifest = await scan(publicRoot, cacheDir)
    addTemplate({ filename: FILENAME, write: true, getContents: () => `export default ${JSON.stringify(manifest, null, 2)}\n` })
    addTemplate({ filename: 'media-manifest.d.ts', write: true, getContents: () => TYPES })
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: join(nuxt.options.buildDir, 'media-manifest.d.ts') })
    })

    // Hashed names never change content: cache for a year.
    nuxt.options.nitro.publicAssets ||= []
    nuxt.options.nitro.publicAssets.push({ dir: cacheDir, baseURL: PUBLIC_BASE, maxAge: 60 * 60 * 24 * 365 })

    // Dev: public/ is outside Nuxt's watched source dir, so watch the media folder ourselves.
    if (nuxt.options.dev && existsSync(mediaRoot)) {
      let timer: ReturnType<typeof setTimeout> | null = null
      let last = JSON.stringify(manifest)
      let running = Promise.resolve()
      const watcher = watch(mediaRoot, { recursive: true }, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          running = running.then(async () => {
            manifest = await scan(publicRoot, cacheDir)
            const now = JSON.stringify(manifest)
            if (now === last) return
            last = now
            await updateTemplates({ filter: (t) => t.filename === FILENAME })
          }).catch((e) => console.warn('[media] rescan failed:', e))
        }, 400)
      })
      nuxt.hook('close', () => watcher.close())
    }
  },
})
