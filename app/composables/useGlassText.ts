import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * "Text passing behind glass" — HTML version (ART_DIRECTION §3).
 * Positions are fractions of the viewport height measured from the top.
 */
export const glassParams = {
  /** Line centre reaches this → starts crossing the glass. Also where the edge highlight sits. */
  start: 0.25,
  /** Line centre reaches this → fully behind glass (invisible). */
  end: 0.12,
  blur: 10,
  blurMobile: 6,
  scaleY: 1.03,
  /** Refraction offset at full crossing, px (negative = up). */
  offsetY: -3,
  /** Peak opacity of the 1px glass-edge highlight. "Barely visible". */
  edgeOpacity: 0.14,
  /** Per-frame (60 fps) easing of the edge opacity. */
  edgeLerp: 0.12,
  /** Entering lines: rise distance (px), duration (s), and where on screen they trigger. */
  enterDistance: 18,
  enterDuration: 0.9,
  enterStart: 0.92,
  enterStagger: 0.06,
}

export interface GlassLine {
  el: HTMLElement
  /** 0 → 1, timed rise + fade when entering from below. */
  enter: number
  /** 0 → 1, scrubbed by scroll while crossing the glass band. */
  exit: number
  color: string
}

// Module singleton: one edge line and one ticker for every GlassText on the page.
const groups = new Set<() => readonly GlassLine[]>()
let edge: HTMLDivElement | null = null
let edgeOpacity = 0
let paneFolder: { dispose(): void } | null = null

function placeEdge() {
  if (edge) edge.style.top = `${glassParams.start * 100}vh`
}

const tick: gsap.TickerCallback = (_t, deltaMs) => {
  if (!edge) return
  // Crossing weight peaks mid-band, so the edge fades in and out with each line instead of popping.
  let weight = 0
  let strongest = 0
  let color = ''
  for (const lines of groups) {
    for (const l of lines()) {
      if (l.exit <= 0 || l.exit >= 1) continue
      const w = Math.sin(Math.PI * l.exit) * l.enter
      weight += w
      if (w > strongest) {
        strongest = w
        color = l.color
      }
    }
  }
  const reduced = useReducedMotion().value
  const target = reduced ? 0 : Math.min(1, weight) * glassParams.edgeOpacity
  const k = 1 - Math.pow(1 - glassParams.edgeLerp, (deltaMs / 1000) * 60)
  edgeOpacity += (target - edgeOpacity) * k
  if (color) edge.style.color = color
  edge.style.opacity = edgeOpacity < 0.001 ? '0' : edgeOpacity.toFixed(4)
}

function mountShared() {
  edge = document.createElement('div')
  edge.className = 'glass-edge'
  edge.setAttribute('aria-hidden', 'true')
  Object.assign(edge.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    height: '1px',
    pointerEvents: 'none',
    zIndex: '50',
    opacity: '0',
    // Fades out toward the gutters: an edge of glass catching light, not a rule.
    background: 'linear-gradient(90deg, transparent, currentColor 18%, currentColor 82%, transparent)',
  } satisfies Partial<CSSStyleDeclaration>)
  document.body.appendChild(edge)
  placeEdge()
  gsap.ticker.add(tick)

  if (import.meta.dev) {
    void useDevPane().then((pane) => {
      if (!pane || !edge) return
      const f = pane.addFolder({ title: 'Glass text', expanded: false })
      const refresh = () => {
        placeEdge()
        ScrollTrigger.refresh()
      }
      f.addBinding(glassParams, 'start', { min: 0.05, max: 0.6, step: 0.01 }).on('change', refresh)
      f.addBinding(glassParams, 'end', { min: 0, max: 0.5, step: 0.01 }).on('change', refresh)
      f.addBinding(glassParams, 'blur', { min: 0, max: 24, step: 0.5 })
      f.addBinding(glassParams, 'blurMobile', { min: 0, max: 24, step: 0.5 })
      f.addBinding(glassParams, 'scaleY', { min: 1, max: 1.1, step: 0.005 })
      f.addBinding(glassParams, 'offsetY', { min: -10, max: 10, step: 0.5 })
      f.addBinding(glassParams, 'edgeOpacity', { min: 0, max: 1, step: 0.01 })
      f.addBinding(glassParams, 'edgeLerp', { min: 0.01, max: 1, step: 0.01 })
      f.addBinding(glassParams, 'enterDistance', { min: 0, max: 60, step: 1 })
      f.addBinding(glassParams, 'enterDuration', { min: 0.1, max: 3, step: 0.05 })
      f.addBinding(glassParams, 'enterStart', { min: 0.5, max: 1, step: 0.01 }).on('change', refresh)
      f.addBinding(glassParams, 'enterStagger', { min: 0, max: 0.3, step: 0.01 })
      // Removing from the root before dispose — Tweakpane otherwise retains the folder (see useStage).
      paneFolder = {
        dispose() {
          pane.remove(f)
          f.dispose()
        },
      }
    })
  }
}

function unmountShared() {
  gsap.ticker.remove(tick)
  edge?.remove()
  edge = null
  edgeOpacity = 0
  paneFolder?.dispose()
  paneFolder = null
}

/** Register a GlassText's lines (as a getter, since re-splitting replaces them). Returns unregister. */
export function registerGlassLines(getLines: () => readonly GlassLine[]) {
  if (groups.size === 0) mountShared()
  groups.add(getLines)
  return () => {
    groups.delete(getLines)
    if (groups.size === 0) unmountShared()
  }
}
