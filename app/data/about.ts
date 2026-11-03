import media, { type MediaImg } from '#build/media-manifest.mjs'
import { people } from '~/data/contact'
import { services } from '~/data/services'

/**
 * /about — copy (owner text, verbatim), photos and look. Photos come from public/media/about/
 * (hero/<slot>-<x>.*, steps/0N.*); until those exist, the owner's own photos already on the site
 * stand in (listed in docs/PLACEHOLDERS.md). Never stock, never generated.
 */

/** One of the owner's photos already on the site, by where it lives. */
function existing(path: 'contact' | 'services', name: string): MediaImg | null {
  if (path === 'contact') {
    const i = media.contact.imageNames.indexOf(name)
    return i >= 0 ? media.contact.images[i]! : null
  }
  const [slug, file] = name.split('/') as [string, string]
  const s = media.services[slug]
  if (!s) return null
  if (file === 'bg') return s.bg
  const n = /^seq-(\d{2})$/.exec(file)?.[1]
  return n ? (s.seq[Number(n) - 1] ?? null) : null
}
const pick = (...imgs: (MediaImg | null)[]) => imgs.filter((x): x is MediaImg => !!x)

/** The headline, split around its three inline photo slots. */
export const heroParts = ['We sit with', 'your team, learn', 'how you work, and build', 'around it.'] as const
export const heroText = 'We sit with your team, learn how you work, and build around it.'

/** Stand-ins until public/media/about/hero/<slot>-* exist (the owner's photos, see PLACEHOLDERS). */
const heroFallback = [
  () => pick(existing('contact', 'photo-02'), existing('contact', 'photo-01')),
  () => pick(existing('contact', 'photo-03'), existing('services', 'training/seq-01')),
  () => pick(existing('services', 'vision/bg'), existing('services', 'software/bg')),
]
export const heroPhotos: MediaImg[][] = heroFallback.map((fallback, i) => (media.about.hero[i]?.length ? media.about.hero[i]! : fallback()))

export const lineText = 'From the shop floor to the dashboard.'

export interface Step {
  name: string
  text: string
  photo: MediaImg | null
}
const stepFallback = [
  () => existing('contact', 'photo-02'),
  () => existing('contact', 'photo-05'),
  () => existing('services', 'software/bg'),
  () => existing('services', 'training/seq-02'),
]
const stepCopy: [string, string][] = [
  ['Sit with the work', 'We spend time with the people doing the job and collect what they use today.'],
  ['Map the flow', 'Every step, handoff and exception, until you say “yes, this is how we work.”'],
  ['Build to the map', 'Apps, trackers and dashboards that follow your steps exactly.'],
  ['Run it, then grow it', 'We roll it out, train your team, and adjust as the business changes.'],
]
export const steps: Step[] = stepCopy.map(([name, text], i) => ({ name, text, photo: media.about.steps[i] ?? stepFallback[i]!() }))

/** "Your team, extended / trained": the lines are the services section's own (data/services.ts). */
const line = (slug: string) => services.find((s) => s.slug === slug)?.line ?? ''
export const teamStatements = [
  { lead: 'Your team,', word: 'extended', mark: 'underline' as const, line: line('staff') },
  { lead: 'Your team,', word: 'trained', mark: 'circle' as const, line: line('training') },
]

export interface Leader {
  name: string
  role: string
  email: string
  /** public/media/team/firstname-lastname.* — null until supplied (a labelled frame shows). */
  portrait: MediaImg | null
  bio: string
}
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '-')
export const leaders: Leader[] = people.map((p) => {
  const i = media.teamNames.indexOf(slug(p.name))
  return { ...p, portrait: i >= 0 ? media.team[i]! : null, bio: '[PLACEHOLDER: 1–2 line bio]' }
})

/** Placeholders only — no invented numbers (docs/PLACEHOLDERS.md). */
export const facts = ['[FOUNDED YEAR]', '[LOCATION]', "[WHAT WE'RE KNOWN FOR]"]

export const closingLine = 'Tell us how your business works.'

/** Look & motion of /about (wired to Tweakpane "about" in dev). */
export const aboutParams = {
  hero: {
    /** Seconds between words rising in, and each word's rise. */
    stagger: 0.06,
    rise: 0.9,
    /** A photo opening from a vertical line into its rectangle. */
    open: 0.9,
    /** Crossfade: seconds per image, fade length. */
    hold: 6,
    fade: 1.2,
  },
  line: {
    /** Pin length in viewport heights (desktop / phone). */
    pin: 1.2,
    pinMobile: 0.8,
    scrub: 1,
  },
  marks: {
    /** Viewport heights over which a mark draws once its statement enters. */
    draw: 0.4,
    pen: 5,
  },
}
