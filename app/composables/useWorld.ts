import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * The stage-level WORLD: 0 = night, 1 = day (ART_DIRECTION §1 — moving between them is a transition).
 * Pages mark sections with `data-world="night" | "day"`; the value follows scroll and crossfades over
 * a band around each night/day boundary. It drives which atmosphere renders (stage) and DOM ink
 * (`--world` on <html> → `--world-ink`, `--world-muted` in tokens.css).
 */
export type World = 'night' | 'day'

export const worldParams = {
  /** Crossfade length around a boundary, in viewport heights. */
  band: 0.6,
  /** Dev only: force a value. */
  override: false,
  value: 0,
}

interface WorldSection {
  world: number
  trigger: ScrollTrigger
}

let sections: WorldSection[] = []
let written = -1
let paneFolder: { dispose(): void } | null = null

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Current world value — a pure function of the scroll position, so it is reversible and in sync with Lenis. */
export function getWorld(): number {
  if (import.meta.dev && worldParams.override) return worldParams.value
  if (!import.meta.client || sections.length === 0) return 0
  const scroll = window.scrollY
  const half = (worldParams.band * window.innerHeight) / 2
  // Trigger positions update on refresh (resize, pins), so order them every call — there are only a few.
  const ordered = [...sections].sort((a, b) => a.trigger.start - b.trigger.start)
  let w = ordered[0]!.world
  for (let i = 1; i < ordered.length; i++) {
    const s = ordered[i]!
    // Boundary = where this section's top passes the viewport centre.
    w += (s.world - w) * smoothstep(s.trigger.start - half, s.trigger.start + half, scroll)
  }
  return w
}

const tick = () => {
  const w = getWorld()
  if (Math.abs(w - written) < 0.0005) return
  written = w
  document.documentElement.style.setProperty('--world', w.toFixed(4))
}

function start() {
  gsap.ticker.add(tick)
  if (import.meta.dev) {
    void useDevPane().then((pane) => {
      if (!pane || paneFolder) return
      const f = pane.addFolder({ title: 'World', expanded: false })
      f.addBinding(worldParams, 'band', { min: 0.05, max: 2, step: 0.01 })
      f.addBinding(worldParams, 'override', { label: 'override scroll' })
      f.addBinding(worldParams, 'value', { label: 'night ↔ day', min: 0, max: 1, step: 0.001 })
      paneFolder = {
        dispose() {
          pane.remove(f)
          f.dispose()
        },
      }
    })
  }
}

function stop() {
  gsap.ticker.remove(tick)
  paneFolder?.dispose()
  paneFolder = null
  written = -1
  document.documentElement.style.removeProperty('--world')
}

/**
 * Register every `[data-world]` element on the page as a world section for the lifetime of the
 * calling component. Call it after any pinning ScrollTriggers are set up (setup order), so its
 * trigger positions account for pin spacing.
 */
export function useWorldSections() {
  let own: WorldSection[] = []
  onMounted(() => {
    own = [...document.querySelectorAll<HTMLElement>('[data-world]')].map((el) => ({
      world: el.dataset.world === 'day' ? 1 : 0,
      trigger: ScrollTrigger.create({ trigger: el, start: 'top center', end: 'bottom center' }),
    }))
    if (sections.length === 0 && own.length > 0) start()
    sections.push(...own)
    tick()
  })
  onBeforeUnmount(() => {
    own.forEach((s) => s.trigger.kill())
    sections = sections.filter((s) => !own.includes(s))
    own = []
    if (sections.length === 0) stop()
  })
}
