import media from '#build/media-manifest.mjs'

/**
 * The projects shown in "View our projects" (F1). Add a project = add one entry here + a folder
 * `public/media/projects/<slug>/` with screenshots named 01.png, 02.png … (02-mobile.png forces the
 * phone frame; otherwise portrait images get it automatically). Copy is owner-supplied and editable
 * (docs/PLACEHOLDERS.md).
 */
export interface ProjectScreen {
  /** Image URL, or null for a neutral labelled placeholder frame. */
  src: string | null
  /** Phone frame (else desktop). For images this is refined from the real aspect on load. */
  mobile: boolean
  /** Screen-reader / placeholder label. */
  label: string
}

export interface Project {
  slug: string
  name: string
  description: string
  chips: string[]
  caseStudy: string
  /** Neutral frames shown until real screenshots exist. */
  placeholders: { desktop: number; mobile: number }
  screens: ProjectScreen[]
}

type ProjectEntry = Omit<Project, 'screens'>

const entries: ProjectEntry[] = [
  {
    slug: 'garage-automation',
    name: 'Garage Automation',
    description:
      'A custom operations platform for an automotive business — intake, work orders, parts, vendors, purchase orders and labor in one place.',
    chips: ['Vehicle intake', 'Work orders', 'Parts & vendors', 'Purchase orders', 'Labor'],
    caseStudy: '#',
    placeholders: { desktop: 6, mobile: 2 },
  },
  {
    slug: 'nester',
    name: 'Nester',
    description: 'Material nesting software that lays out parts on sheets to cut faster and waste less.',
    chips: ['Nesting', 'Sheet layouts', 'Cut planning'],
    caseStudy: '#',
    placeholders: { desktop: 5, mobile: 0 },
  },
]

const two = (n: number) => String(n).padStart(2, '0')

function screensFor(e: ProjectEntry): ProjectScreen[] {
  const files = media.projects[e.slug] ?? []
  if (files.length) {
    return files.map((src, i) => ({ src, mobile: /-mobile\.\w+$/i.test(src), label: `${e.name} screen ${two(i + 1)}` }))
  }
  // Placeholders: desktop frames with the phone frames spread among them.
  const total = e.placeholders.desktop + e.placeholders.mobile
  const every = e.placeholders.mobile ? Math.floor(total / e.placeholders.mobile) : 0
  return Array.from({ length: total }, (_, i) => ({
    src: null,
    mobile: every > 0 && i % every === every - 1,
    label: `${e.name} screen ${two(i + 1)}`,
  }))
}

export const projects: Project[] = entries.map((e) => ({ ...e, screens: screensFor(e) }))

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
