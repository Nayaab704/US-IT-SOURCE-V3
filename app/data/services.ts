import media from '#build/media-manifest.mjs'

/**
 * "Five ways we build around you" (F2). Names and lines are owner text (editable, listed in
 * docs/PLACEHOLDERS.md); the scope lines are not supplied yet and are simply not shown until they are.
 * Backgrounds come from public/media/services/<slug>/bg.(avif|webp|jpg) (auto-detected).
 */
export type ServiceVisual = 'phone' | 'desktop' | 'cards' | 'media' | 'none'

export interface Service {
  slug: string
  name: string
  line: string
  /** Small scope text, bottom-right. null = not supplied yet (shown as a placeholder label). */
  scope: string | null
  /** Colour mood: an overlay colour and how it blends with the photo. */
  grade: { color: string; blend: 'soft-light' | 'multiply' | 'screen' | 'overlay'; opacity: number }
  visual: ServiceVisual
  /** Background candidates, best format first (empty = graphite placeholder). */
  bg: string[]
  /** One <source> per format: srcset with the 1600 px variant when it exists (2400 px otherwise). */
  sources: { type: string; srcset: string }[]
  /** Photo aspect (w / h). */
  aspect: number
  /** Media visual (training): a muted loop, else a photo sequence. */
  loop?: string[]
  seq?: string[]
}

const svc = (slug: string) => media.services[slug] ?? { bg: [], bgSmall: [], loop: [], seq: [] }
const ext = (src: string) => src.split('.').pop()!.toLowerCase()

/** Per format: "bg-1600.x 1600w, bg.x 2400w" — the browser picks by viewport width × DPR. */
function sourcesFor(slug: string) {
  const m = svc(slug)
  return m.bg.map((full) => {
    const small = m.bgSmall.find((s) => ext(s) === ext(full))
    const type = ext(full) === 'jpg' || ext(full) === 'jpeg' ? 'image/jpeg' : `image/${ext(full)}`
    return { type, srcset: small ? `${small} 1600w, ${full} 2400w` : `${full} 2400w` }
  })
}

export const services: Service[] = [
  {
    slug: 'software',
    name: 'Software & Apps',
    line: 'Apps and systems that follow your exact steps.',
    scope: null,
    grade: { color: '#ffb066', blend: 'soft-light', opacity: 0.55 },
    visual: 'phone',
    bg: svc('software').bg,
    sources: sourcesFor('software'),
    aspect: 3 / 2,
  },
  {
    slug: 'ai',
    name: 'AI Modeling',
    line: 'Models trained on your data, for a job you actually have.',
    scope: null,
    grade: { color: '#3a4766', blend: 'multiply', opacity: 0.6 },
    visual: 'desktop',
    bg: svc('ai').bg,
    sources: sourcesFor('ai'),
    aspect: 3 / 2,
  },
  {
    slug: 'vision',
    name: 'Computer Vision & ML',
    line: 'Cameras and models that see what matters in your operation.',
    scope: null,
    grade: { color: '#5d7fa8', blend: 'soft-light', opacity: 0.6 },
    // The photo carries this chapter on its own (with the slow Ken Burns); no side visual.
    visual: 'none',
    bg: svc('vision').bg,
    sources: sourcesFor('vision'),
    aspect: 3 / 2,
  },
  {
    slug: 'staff',
    name: 'Staff Augmentation',
    line: 'Engineers who join your team and work your way.',
    scope: null,
    grade: { color: '#b9dcb0', blend: 'soft-light', opacity: 0.5 },
    // Real team portraits only: until they exist, no side visual (never stock faces).
    visual: media.team.length ? 'cards' : 'none',
    bg: svc('staff').bg,
    sources: sourcesFor('staff'),
    aspect: 3 / 2,
  },
  {
    slug: 'training',
    name: 'Technical Training',
    line: 'Hands-on training that makes your team confident with the tools they use every day.',
    scope: null,
    grade: { color: '#fff1d6', blend: 'screen', opacity: 0.16 },
    // A real training loop or photo sequence only: until then, no side visual.
    visual: svc('training').loop.length || svc('training').seq.length ? 'media' : 'none',
    bg: svc('training').bg,
    sources: sourcesFor('training'),
    aspect: 3 / 2,
    loop: svc('training').loop,
    seq: svc('training').seq,
  },
]

/** Team portraits for the Staff Augmentation cards (first three; placeholders until supplied). */
export const teamPortraits: string[] = media.team.slice(0, 3)

/** Look & motion of the services section (wired to Tweakpane "services" in dev). */
export const servicesParams = {
  pin: {
    /** Viewport heights: intro, each chapter, outro; the transition into a chapter takes `transition`. */
    intro: 0.2,
    chapter: 1,
    outro: 0.2,
    transition: 0.3,
    scrub: 1,
  },
  kenBurns: { from: 1.04, to: 1.1, outgoing: 0.96 },
  /** Wipe feather, fraction of the screen height. */
  feather: 0.12,
  /** Device screens crossfade interval (s). */
  crossfade: 1.6,
  /** Staff cards: fan angle (deg) and spread (px). */
  fan: { angle: 6, spread: 46 },
}
