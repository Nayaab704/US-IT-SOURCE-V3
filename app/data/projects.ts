import media from '#build/media-manifest.mjs'

/**
 * The projects: one entry per project drives its tab in "View our projects" AND its case-study page
 * (/work/<slug>). To add a project (full guide: docs/ADDING_A_PROJECT.md):
 *   1. screenshots in public/media/projects/<slug>/ — 01.png, 02.png … (NN-mobile.png = phone frame;
 *      portrait images get it automatically),
 *   2. its page text in docs/case-studies/<slug>.md,
 *   3. one entry below.
 */
export interface ProjectScreen {
  /** Image URL, or null for a neutral labelled placeholder frame. */
  src: string | null
  /** Phone frame (else desktop). For images this is refined from the real aspect on load. */
  mobile: boolean
  /** Screen-reader / placeholder label. */
  label: string
  /** Pixel width / height read from the file at build time (lets pages reserve the space). */
  width?: number
  height?: number
}

export interface ProjectEntry {
  /** URL name: /work/<slug>. */
  slug: string
  name: string
  /** Client name (shown on the case-study page; leave '' if it should not be named). */
  client: string
  /** One sentence for the projects section. */
  oneLiner: string
  /** Scope chips. */
  chips: string[]
  /** Screenshots folder in public/media/projects/ (defaults to the slug). */
  media?: string
  /** The case-study text: a file in docs/case-studies/. */
  caseStudy: string
  /** Neutral frames shown only while the folder has no screenshots yet. */
  placeholders?: { desktop: number; mobile: number }
}

export interface Project extends ProjectEntry {
  /** The case-study page. */
  href: string
  screens: ProjectScreen[]
}

const entries: ProjectEntry[] = [
  {
    slug: 'garage-automation',
    name: 'Garage Automation',
    client: 'Makkah Autosales',
    oneLiner:
      'A custom operations platform for an automotive business — intake, work orders, parts, vendors, purchase orders and labor in one place.',
    chips: ['Vehicle intake', 'Work orders', 'Parts & vendors', 'Purchase orders', 'Labor'],
    caseStudy: 'garage-automation.md',
  },
  {
    slug: 'nester',
    name: 'Nester',
    client: '',
    oneLiner: 'Material nesting software that lays out parts on sheets to cut faster and waste less.',
    chips: ['Nesting', 'Sheet layouts', 'Cut planning'],
    caseStudy: 'nester.md',
  },
]

const two = (n: number) => String(n).padStart(2, '0')

function screensFor(e: ProjectEntry): ProjectScreen[] {
  const files = media.projects[e.media ?? e.slug] ?? []
  if (files.length) {
    // Labelled by the file's own number (01.png and 01-mobile.png are the desktop and phone views of screen 01).
    return files.map((src, i) => {
      const mobile = /-mobile\.\w+$/i.test(src)
      const num = /\/(\d{2})(?:-mobile)?\.\w+$/.exec(src)?.[1] ?? two(i + 1)
      const [width, height] = media.sizes[src] ?? []
      return { src, mobile, label: `${e.name} ${mobile ? 'phone ' : ''}screen ${num}`, width, height }
    })
  }
  // Placeholders: desktop frames with the phone frames spread among them.
  const ph = e.placeholders ?? { desktop: 4, mobile: 0 }
  const total = ph.desktop + ph.mobile
  const every = ph.mobile ? Math.floor(total / ph.mobile) : 0
  return Array.from({ length: total }, (_, i) => ({
    src: null,
    mobile: every > 0 && i % every === every - 1,
    label: `${e.name} screen ${two(i + 1)}`,
  }))
}

export const projects: Project[] = entries.map((e) => ({ ...e, href: `/work/${e.slug}`, screens: screensFor(e) }))

/** Look & motion of the projects section (wired to Tweakpane "projects" in dev). */
export const projectsParams = {
  pin: {
    /** Viewport heights: the sentence emerging, moving to the title, then reading. */
    emerge: 0.8,
    toTitle: 0.4,
    read: 1.5,
    emergeMobile: 0.6,
    toTitleMobile: 0.3,
    readMobile: 1,
    scrub: 1,
  },
  stream: {
    /** px / s of the top row; the bottom row runs at `bottomRow` of that. */
    speed: 28,
    bottomRow: 0.7,
    /** Tilt of the whole stream (degrees, the left side recedes). */
    tilt: 8,
    perspective: 1600,
    /** Speed while a screen is hovered (× normal). */
    hoverSlow: 0.2,
    /** Scroll velocity → extra speed: px/s of scroll for +1×, the cap, and how fast it eases back (s). */
    boostPerPx: 1 / 900,
    boostMax: 3,
    boostEase: 0.8,
  },
}
