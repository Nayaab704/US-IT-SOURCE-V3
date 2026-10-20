import { existsSync, readdirSync, statSync, watch } from 'node:fs'
import { join } from 'node:path'
import { addTemplate, defineNuxtModule, updateTemplates } from 'nuxt/kit'

/**
 * Owner media, auto-detected from `public/media/` and exposed as `#build/media-manifest.mjs`:
 * - projects/<slug>/NN.(png|jpg|jpeg|webp|avif) (NN-mobile.… forces the phone frame) → screens
 * - services/<slug>/bg.(avif|webp|jpg) → chapter background (best format first, all listed);
 *   bg-1600.(avif|webp|jpg) → optional smaller variants (srcset)
 * - services/<slug>/loop.(mp4|webm) + seq-NN.(jpg|webp) → video / photo sequence
 * - team/*.(jpg|jpeg|webp|avif) → portraits
 * - contact/*.(jpg|jpeg|webp|avif) → photos; NN.webm + NN.mp4 + NN-poster.jpg → one video loop each
 * Regenerated in dev when a file there is added or removed (public/ is outside Nuxt's watched dirs).
 */
export interface MediaManifest {
  projects: Record<string, string[]>
  services: Record<string, { bg: string[]; bgSmall: string[]; loop: string[]; seq: string[] }>
  team: string[]
  contact: { images: string[]; videos: { sources: string[]; poster: string | null }[] }
}

const SCREEN = /^\d{2}(-mobile)?\.(png|jpe?g|webp|avif)$/i
const BG_ORDER = ['avif', 'webp', 'jpg', 'jpeg']
const FILENAME = 'media-manifest.mjs'

const dirs = (d: string) => (existsSync(d) ? readdirSync(d).filter((x) => statSync(join(d, x)).isDirectory()) : [])
const files = (d: string) => (existsSync(d) ? readdirSync(d).filter((x) => !statSync(join(d, x)).isDirectory()).sort() : [])

function scan(root: string): MediaManifest {
  const out: MediaManifest = { projects: {}, services: {}, team: [], contact: { images: [], videos: [] } }
  for (const slug of dirs(join(root, 'projects'))) {
    const list = files(join(root, 'projects', slug)).filter((f) => SCREEN.test(f))
    if (list.length) out.projects[slug] = list.map((f) => `/media/projects/${slug}/${f}`)
  }
  for (const slug of dirs(join(root, 'services'))) {
    const all = files(join(root, 'services', slug))
    const url = (f: string) => `/media/services/${slug}/${f}`
    const byFormat = (re: RegExp) =>
      all
        .filter((f) => re.test(f))
        .sort((a, b) => BG_ORDER.indexOf(a.split('.').pop()!.toLowerCase()) - BG_ORDER.indexOf(b.split('.').pop()!.toLowerCase()))
        .map(url)
    const bg = byFormat(/^bg\.(avif|webp|jpe?g)$/i)
    const bgSmall = byFormat(/^bg-1600\.(avif|webp|jpe?g)$/i)
    const loop = all.filter((f) => /^loop\.(webm|mp4)$/i.test(f)).sort((a) => (a.endsWith('webm') ? -1 : 1)).map(url)
    const seq = all.filter((f) => /^seq-\d{2}\.(jpe?g|webp|avif)$/i.test(f)).map(url)
    if (bg.length || loop.length || seq.length) out.services[slug] = { bg, bgSmall, loop, seq }
  }
  out.team = files(join(root, 'team'))
    .filter((f) => /\.(jpe?g|webp|avif)$/i.test(f))
    .map((f) => `/media/team/${f}`)
  const contact = files(join(root, 'contact'))
  const c = (f: string) => `/media/contact/${f}`
  out.contact.images = contact.filter((f) => /\.(jpe?g|webp|avif)$/i.test(f) && !/-poster\./i.test(f)).map(c)
  // Videos grouped by name: WebM first (smaller), then MP4; the poster is NAME-poster.(jpg|webp).
  const names = [...new Set(contact.filter((f) => /\.(mp4|webm)$/i.test(f)).map((f) => f.replace(/\.(mp4|webm)$/i, '')))]
  out.contact.videos = names.map((n) => ({
    sources: contact.filter((f) => f === `${n}.webm`).concat(contact.filter((f) => f === `${n}.mp4`)).map(c),
    poster: ((p) => (p ? c(p) : null))(contact.find((f) => f.startsWith(`${n}-poster.`) && /\.(jpe?g|webp)$/i.test(f))),
  }))
  return out
}

export default defineNuxtModule({
  meta: { name: 'media-manifest' },
  setup(_options, nuxt) {
    const root = join(nuxt.options.rootDir, 'public', 'media')
    addTemplate({
      filename: FILENAME,
      write: true,
      getContents: () => `export default ${JSON.stringify(scan(root), null, 2)}\n`,
    })
    addTemplate({
      filename: 'media-manifest.d.ts',
      write: true,
      getContents: () =>
        [
          "declare module '#build/media-manifest.mjs' {",
          '  const media: {',
          '    projects: Record<string, string[]>',
          '    services: Record<string, { bg: string[]; bgSmall: string[]; loop: string[]; seq: string[] }>',
          '    team: string[]',
          '    contact: { images: string[]; videos: { sources: string[]; poster: string | null }[] }',
          '  }',
          '  export default media',
          '}',
          '',
        ].join('\n'),
    })
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: join(nuxt.options.buildDir, 'media-manifest.d.ts') })
    })
    // Dev: public/ is outside Nuxt's watched source dir, so watch the media folder ourselves.
    if (nuxt.options.dev && existsSync(root)) {
      let timer: ReturnType<typeof setTimeout> | null = null
      let last = JSON.stringify(scan(root))
      const watcher = watch(root, { recursive: true }, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          const now = JSON.stringify(scan(root))
          if (now === last) return
          last = now
          void updateTemplates({ filter: (t) => t.filename === FILENAME })
        }, 300)
      })
      nuxt.hook('close', () => watcher.close())
    }
  },
})
