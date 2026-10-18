import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { WebGLRenderer } from 'three'
import type { FolderApi, Pane } from 'tweakpane'
import { pointerParams, resetPointerVelocity, tickPointer, usePointer, type PointerState } from '~/composables/usePointer'

/* ─────────────────────────── Public types ─────────────────────────── */

export interface StageContext {
  readonly renderer: WebGLRenderer
  /** Snapshot at init time — later changes arrive through resize(). */
  readonly width: number
  readonly height: number
  readonly dpr: number
  readonly isMobile: boolean
  readonly isLowPower: boolean
  readonly reducedMotion: boolean
  /** Dev only: this scene's Tweakpane folder, removed on dispose. Always null in production. */
  readonly pane: FolderApi | null
}

export interface StageScene {
  readonly id: string
  /** Build GPU resources. May be async (asset loading); the scene stays dormant until it resolves. */
  init(ctx: StageContext): void | Promise<void>
  /** time: seconds since start · delta: seconds (clamped) · scrollProgress: 0 → 1 while the section crosses the viewport. */
  update(time: number, delta: number, scrollProgress: number, pointer: Readonly<PointerState>): void
  /** Draw into the shared renderer. Called right after update(), only while active. */
  render(renderer: WebGLRenderer): void
  resize(width: number, height: number): void
  setActive(active: boolean): void
  /** Release every geometry, material, texture and render target the scene created. */
  dispose(): void
}

export interface RegisterOptions {
  /** Activate this fraction of a viewport height before the section enters (and keep it after it leaves). */
  warmup?: number
  /** Draw order when several scenes are active; lower draws first. */
  order?: number
}

/** Tweakable stage-wide parameters (wired to Tweakpane in dev). */
export const stageParams = {
  exposure: 1,
  dprDesktopMax: 1.5,
  warmup: 0.25,
}

/* ─────────────────────────── Internal state ─────────────────────────── */

interface Entry {
  scene: StageScene
  order: number
  active: boolean
  ready: boolean
  initialising: boolean
  removed: boolean
  triggers: ScrollTrigger[]
  progress: ScrollTrigger
  folder: FolderApi | null
  paneRoot: Pane | null
}

// Module-level singleton: there is exactly one stage for the whole site (client only).
const entries = new Map<string, Entry>()
let drawList: Entry[] = []
let renderer: WebGLRenderer | null = null
let running = false
let contextLost = false
let width = 0
let height = 0
let dpr = 1
let teardownListeners: (() => void) | null = null

// A long pause (tab switch, debugger) must not teleport simulations forward.
const MAX_DELTA = 0.1

const stats = { rendererCreations: 0, frames: 0, calls: 0, triangles: 0 }

/* ─────────────────────────── Loop ─────────────────────────── */

function deviceFlags() {
  const { isMobile, isLowPower } = useDevice()
  return { isMobile: isMobile.value, isLowPower: isLowPower.value }
}

function computeDpr() {
  const { isMobile, isLowPower } = deviceFlags()
  return isMobile || isLowPower ? 1 : Math.min(window.devicePixelRatio || 1, stageParams.dprDesktopMax)
}

function resize() {
  if (!renderer) return
  width = window.innerWidth
  height = window.innerHeight
  dpr = computeDpr()
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height, false)
  for (const e of entries.values()) if (e.ready) e.scene.resize(width, height)
}

const frame: gsap.TickerCallback = (time, deltaMs) => {
  const r = renderer
  if (!r) return
  const delta = Math.min(deltaMs / 1000, MAX_DELTA)
  const pointer = usePointer()
  tickPointer(delta)

  r.toneMappingExposure = stageParams.exposure
  r.info.reset()
  r.clear()
  for (const e of drawList) {
    e.scene.update(time, delta, e.progress.progress, pointer)
    e.scene.render(r)
  }

  stats.frames++
  stats.calls = r.info.render.calls
  stats.triangles = r.info.render.triangles
}

/** Start/stop the ticker so we never render when hidden or when nothing is on screen. */
function syncLoop() {
  drawList = [...entries.values()].filter((e) => e.ready && e.active).sort((a, b) => a.order - b.order)
  const shouldRun = !!renderer && !contextLost && !document.hidden && drawList.length > 0
  if (shouldRun === running) return
  running = shouldRun
  if (running) {
    resetPointerVelocity()
    gsap.ticker.add(frame)
  } else {
    gsap.ticker.remove(frame)
    // Leave a transparent canvas, not the last frame of a scene that just left.
    if (renderer && !contextLost) renderer.clear()
    stats.calls = stats.triangles = 0
  }
}

/* ─────────────────────────── Scene lifecycle ─────────────────────────── */

async function initEntry(e: Entry) {
  const r = renderer
  if (!r || e.ready || e.initialising) return
  e.initialising = true
  try {
    const pane = await useDevPane()
    if (e.removed || renderer !== r) return
    e.paneRoot = pane
    e.folder = pane ? pane.addFolder({ title: e.scene.id, expanded: false }) : null

    await e.scene.init({
      renderer: r,
      width,
      height,
      dpr,
      ...deviceFlags(),
      reducedMotion: useReducedMotion().value,
      pane: e.folder,
    })

    // Unregistered (e.g. route changed) while an async init was in flight.
    if (e.removed || renderer !== r) {
      e.scene.dispose()
      disposeFolder(e)
      return
    }
    e.ready = true
    e.scene.resize(width, height)
    e.scene.setActive(e.active)
    syncLoop()
  } catch (err) {
    console.error(`[stage] init failed for scene "${e.scene.id}"`, err)
  } finally {
    e.initialising = false
  }
}

function teardownEntry(e: Entry) {
  if (e.ready) {
    if (e.active) e.scene.setActive(false)
    e.scene.dispose()
  }
  e.ready = false
  disposeFolder(e)
}

function disposeFolder(e: Entry) {
  if (!e.folder) return
  e.paneRoot?.remove(e.folder)
  e.folder.dispose()
  e.folder = null
}

function setEntryActive(e: Entry, active: boolean) {
  if (e.active === active) return
  e.active = active
  if (e.ready) e.scene.setActive(active)
  syncLoop()
}

export function registerScene(scene: StageScene, section: HTMLElement, options: RegisterOptions = {}) {
  if (entries.has(scene.id)) {
    console.warn(`[stage] scene "${scene.id}" registered twice — replacing the old one`)
    unregisterScene(scene.id)
  }
  const warmup = options.warmup ?? stageParams.warmup
  const margin = () => window.innerHeight * warmup

  const e = {
    scene,
    order: options.order ?? 0,
    active: false,
    ready: false,
    initialising: false,
    removed: false,
    folder: null,
    paneRoot: null,
  } as Omit<Entry, 'triggers' | 'progress'> as Entry

  const activation = ScrollTrigger.create({
    trigger: section,
    start: () => `top bottom+=${margin()}`,
    end: () => `bottom top-=${margin()}`,
    onToggle: (self) => setEntryActive(e, self.isActive),
  })
  // Separate trigger so scrollProgress is measured over the visible crossing, not the warm-up range.
  e.progress = ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top' })
  e.triggers = [activation, e.progress]

  entries.set(scene.id, e)
  setEntryActive(e, activation.isActive)
  void initEntry(e)
}

export function unregisterScene(id: string) {
  const e = entries.get(id)
  if (!e) return
  entries.delete(id)
  e.removed = true
  e.triggers.forEach((t) => t.kill())
  teardownEntry(e)
  syncLoop()
}

/* ─────────────────────────── Renderer ownership (Stage.client.vue) ─────────────────────────── */

export function hasStageRenderer() {
  return renderer !== null
}

export function attachRenderer(r: WebGLRenderer) {
  if (renderer) throw new Error('[stage] a WebGLRenderer already exists — the site has exactly one')
  renderer = r
  stats.rendererCreations++
  usePointer()
  resize()

  const canvas = r.domElement
  const onVisibility = () => syncLoop()
  const onLost = (ev: Event) => {
    ev.preventDefault() // allows the browser to restore the context
    contextLost = true
    syncLoop()
  }
  const onRestored = () => {
    contextLost = false
    syncLoop()
  }
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  // Crossing the mobile breakpoint / low-power flag changes the DPR cap.
  const stopDeviceWatch = watch(deviceFlags, resize)

  let stageFolder: FolderApi | null = null
  if (import.meta.dev) {
    void useDevPane().then((pane) => {
      if (!pane || renderer !== r) return
      stageFolder = pane.addFolder({ title: 'Stage', expanded: false })
      stageFolder.addBinding(stageParams, 'exposure', { min: 0, max: 3, step: 0.01 })
      stageFolder.addBinding(stageParams, 'dprDesktopMax', { min: 0.5, max: 2, step: 0.25 }).on('change', resize)
      stageFolder.addBinding(pointerParams, 'lerp', { label: 'pointer lerp', min: 0.01, max: 1, step: 0.01 })
      stageFolder.addBinding(pointerParams, 'velocitySmoothing', { label: 'pointer vel', min: 0.01, max: 1, step: 0.01 })
    })
    window.__stage = { info: getStageInfo }
  }

  teardownListeners = () => {
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    stopDeviceWatch()
    stageFolder?.dispose()
  }

  // Scenes may have registered before the (lazy) stage mounted.
  for (const e of entries.values()) void initEntry(e)
  syncLoop()
}

/** Only on Stage unmount (in practice: HMR). Scenes stay registered and re-init on the next attach. */
export function detachRenderer() {
  for (const e of entries.values()) teardownEntry(e)
  teardownListeners?.()
  teardownListeners = null
  gsap.ticker.remove(frame)
  running = false
  renderer?.dispose()
  renderer = null
  drawList = []
}

/* ─────────────────────────── Introspection ─────────────────────────── */

export interface StageInfo {
  rendererCreations: number
  frames: number
  running: boolean
  registered: number
  active: number
  calls: number
  triangles: number
  geometries: number
  textures: number
  programs: number
  dpr: number
}

export function getStageInfo(): StageInfo {
  return {
    rendererCreations: stats.rendererCreations,
    frames: stats.frames,
    running,
    registered: entries.size,
    active: drawList.length,
    calls: stats.calls,
    triangles: stats.triangles,
    geometries: renderer?.info.memory.geometries ?? 0,
    textures: renderer?.info.memory.textures ?? 0,
    programs: renderer?.info.programs?.length ?? 0,
    dpr,
  }
}

declare global {
  interface Window {
    /** Dev only: lets tests and the console inspect the stage. */
    __stage?: { info: () => StageInfo }
  }
}

/* ─────────────────────────── Component-facing API ─────────────────────────── */

/**
 * Register a scene for the lifetime of the calling component.
 * `section` is the DOM element whose position in the viewport activates the scene.
 */
export function useStageScene(factory: () => StageScene, section: Ref<HTMLElement | null>, options?: RegisterOptions) {
  let id: string | null = null
  onMounted(() => {
    if (!section.value) return
    const scene = factory()
    id = scene.id
    registerScene(scene, section.value, options)
  })
  onBeforeUnmount(() => {
    if (id) unregisterScene(id)
  })
}

export function useStage() {
  return {
    params: stageParams,
    register: registerScene,
    unregister: unregisterScene,
    info: getStageInfo,
  }
}
