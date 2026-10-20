import media from '#build/media-manifest.mjs'

/**
 * "let's work together" + contact (F3). People and emails are owner-supplied (names / roles inferred
 * from the emails — to confirm, docs/PLACEHOLDERS.md). The rectangles' media is auto-detected from
 * public/media/contact/ (photos, then *.mp4/webm loops); empty slots show a labelled placeholder.
 */
export interface Person {
  name: string
  role: string
  email: string
}

export const people: Person[] = [
  { name: 'Mahwish Akhtar', role: 'President & CEO', email: 'Mahwish.akhtar@usitsource.com' },
  { name: 'Monis Aziz', role: 'COO', email: 'Monis.aziz@usitsource.com' },
  { name: 'Lauren Peet', role: 'Sales & Business Development Leader', email: 'Lauren.peet@usitsource.com' },
]

export const contactLine = "Tell us how your business works. We'll show you what software built around it could look like."
export const ctaEmail = 'Lauren.peet@usitsource.com'
export const ctaHref = `mailto:${ctaEmail}?subject=${encodeURIComponent('Project enquiry')}`

/**
 * One rectangle of the composition. x / y: top-left in % of the HEADLINE box (so the layout follows
 * the lettering); w: width in vw; aspect: w / h (portrait); front: above the ink (covers part of a
 * letter) or behind it; depth: parallax (0 = none … 1 = most); kind: which media it prefers.
 */
export interface Rect {
  x: number
  y: number
  w: number
  aspect: number
  front: boolean
  depth: number
  kind: 'photo' | 'video'
  /** Which letter it partly covers (for the record; positions are tuned against the real lettering). */
  covers?: string
}

/** Desktop: 8 rectangles; four in front of the ink, each over part of one letter. */
export const rectsDesktop: Rect[] = [
  { x: -9, y: 2, w: 11, aspect: 4 / 5, front: true, depth: 0.5, kind: 'photo', covers: 'l (ascender)' },
  { x: 31, y: -17, w: 9.5, aspect: 3 / 4, front: false, depth: 0.8, kind: 'video' },
  { x: 94.5, y: 21, w: 12, aspect: 4 / 5, front: true, depth: 0.35, kind: 'photo', covers: 'k (arm)' },
  { x: 106, y: 40, w: 14, aspect: 3 / 4, front: false, depth: 0.7, kind: 'photo' },
  { x: 29, y: 83, w: 10, aspect: 4 / 5, front: true, depth: 0.45, kind: 'photo', covers: 'g (descender curl)' },
  { x: -16, y: 50, w: 13, aspect: 3 / 4, front: false, depth: 0.9, kind: 'photo' },
  { x: 87.5, y: 57, w: 9, aspect: 3 / 4, front: true, depth: 0.55, kind: 'photo', covers: 'r (last stroke)' },
  { x: 53, y: 90, w: 15, aspect: 4 / 5, front: false, depth: 0.6, kind: 'video' },
]

/** Phones: 5 rectangles around the three-line headline. */
export const rectsMobile: Rect[] = [
  { x: -19, y: 2, w: 22, aspect: 4 / 5, front: true, depth: 0.4, kind: 'photo', covers: 'l (top)' },
  { x: 72, y: -6, w: 24, aspect: 3 / 4, front: false, depth: 0.7, kind: 'video' },
  { x: 52, y: 33, w: 20, aspect: 4 / 5, front: true, depth: 0.5, kind: 'photo', covers: 'k' },
  { x: -10, y: 56, w: 22, aspect: 3 / 4, front: false, depth: 0.8, kind: 'photo' },
  { x: 30, y: 92, w: 20, aspect: 4 / 5, front: true, depth: 0.5, kind: 'photo', covers: 'g (descender)' },
]

/**
 * Media for each rectangle: videos go to 'video' slots first, photos to the rest (in file order);
 * whatever is left over stays a labelled placeholder.
 */
export type RectMedia = { type: 'image'; src: string } | { type: 'video'; sources: string[]; poster: string | null }

export function mediaFor(rects: Rect[]): (RectMedia | null)[] {
  const images = [...media.contact.images]
  const videos = [...media.contact.videos]
  return rects.map((r): RectMedia | null => {
    if (r.kind === 'video' && videos.length) return { type: 'video', ...videos.shift()! }
    // A photo slot (or a video slot with no loop left) takes the next photo.
    if (images.length) return { type: 'image', src: images.shift()! }
    return null
  })
}

/** Look & motion of the contact scene (wired to Tweakpane "contact" in dev). */
export const contactParams = {
  pin: {
    /** Viewport heights: rectangles in, then writing, then a short hold. */
    rects: 0.25,
    write: 1,
    hold: 0.15,
    mobileScale: 0.75,
    scrub: 1,
  },
  /** Pen size (layout units; x-height = 100) and ink-pool dot size (× pen). */
  pen: 4.6,
  pool: 0.18,
  /** Parallax travel at depth 1 (px across the pin), cursor drift (deg). */
  parallax: 90,
  drift: 1,
}
