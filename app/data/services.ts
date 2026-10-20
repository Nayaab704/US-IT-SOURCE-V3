import media from '#build/media-manifest.mjs'

/**
 * "Five ways we build around you" (F2). Names and lines are owner text (editable, listed in
 * docs/PLACEHOLDERS.md); the scope lines are not supplied yet and render as visible placeholders.
 * Backgrounds come from public/media/services/<slug>/bg.(avif|webp|jpg) (auto-detected).
 */
export type ServiceVisual = 'phone' | 'desktop' | 'detect' | 'cards' | 'media'

/** A detection box in photo space (0–1 of the photo's width / height) with a generic label. */
export interface DetectBox {
  x: number
  y: number
  w: number
  h: number
  label: string
}

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
  /** Photo aspect (w / h) — the detection boxes are placed in photo space. */
  aspect: number
  boxes?: DetectBox[]
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
    visual: 'detect',
    bg: svc('vision').bg,
    sources: sourcesFor('vision'),
    aspect: 3 / 2,
    // Placed on the current photo (pick-and-place head over PCB panels). Re-place if the photo changes.
    boxes: [
      { x: 0.15, y: 0.36, w: 0.575, h: 0.12, label: 'sheet' },
      { x: 0.25, y: 0.495, w: 0.1725, h: 0.06, label: 'part' },
      { x: 0.585, y: 0.491, w: 0.1775, h: 0.06, label: 'part' },
      { x: 0.77, y: 0.53, w: 0.15, h: 0.055, label: 'edge' },
      { x: 0.44, y: 0.06, w: 0.12, h: 0.19, label: 'tool' },
    ],
  },
  {
    slug: 'staff',
    name: 'Staff Augmentation',
    line: 'Engineers who join your team and work your way.',
    scope: null,
    grade: { color: '#b9dcb0', blend: 'soft-light', opacity: 0.5 },
    visual: 'cards',
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
    visual: 'media',
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
