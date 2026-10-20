import {
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TubeGeometry,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderTarget,
  type IUniform,
  type Texture,
} from 'three'
import type { FolderApi } from 'tweakpane'
import type { StageScene } from '~/composables/useStage'
import { RibbonWaves, type WaveStroke } from '~/utils/ribbon/waves'
import { loadShader } from '~/utils/shaders'
import { flexParams as params, type FlexParams } from './params'
import { buildLinePath, snakeArc, type LinePath, type PxRect } from './path'
import { InsideWorld } from '~/utils/inside/world'
import { insideParams } from '~/utils/inside/params'
import { buildInsidePane } from '~/utils/inside/pane'

/**
 * Footage (the small card): "An Auto Mechanic Working" (Pexels 7568439),
 * https://www.pexels.com/video/an-auto-mechanic-working-7568439/ — Pexels License (free for
 * commercial use, no attribution required). Hands at a workbench; no faces, no logos.
 * Re-encoded: 8 s seamless loop (last 0.8 s cross-faded into the start), 1280 wide, muted
 * (H.264 1.5 MB · VP9 1.9 MB). PLACEHOLDER until the owner supplies real footage.
 */
export const FLEX_MEDIA = {
  mp4: '/video/ops.mp4',
  webm: '/video/ops.webm',
  poster: '/video/ops-poster.jpg',
  aspect: 1280 / 674,
}

type Rect = { x: number; y: number; w: number; h: number }

export interface FlexFrameScene extends StageScene {
  readonly params: FlexParams
  /** Pinned scroll progress (0–1). */
  setProgress(p: number): void
  /** Reduced motion: the whole line drawn, the card at rest, no snake. */
  setStatic(on: boolean): void
  /** Layout changed (refresh / resize): re-measure the card against the section on the next frame. */
  remeasure(): void
  /** True while the cursor is over the settled frame (the page shows its "Play" label). */
  readonly hovering: boolean
  /** The settled frame's rect in viewport px (for words / clicks). */
  frameRect(): Rect
  /** The doors (S3, 0-1): the settled frame grows to the full viewport (radius to 0). */
  setDoors(d: number): void
  /** The INSIDE world's progress q (0-1). */
  setWorld(q: number): void
}

const DEG = Math.PI / 180
const easeInOut2 = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const range = (p: number, [a, b]: readonly [number, number]) => clamp01((p - a) / Math.max(b - a, 1e-6))

export function createFlexFrameScene(options: {
  id?: string
  section: () => HTMLElement | null
  card: () => HTMLElement | null
  /** Called when a timing parameter changes in the pane (the page rebuilds its timeline). */
  onTimingChange?: () => void
  /**
   * The section's top in viewport px, computed without touching layout (from the pin's start / end
   * and the scroll position). Without it the section is measured every frame (forced layout).
   */
  sectionTop?: () => number
  /** Reduced motion: the still frame's rect (viewport px) — the plane sits there, flat, live. */
  staticFrame?: () => Rect | null
}): FlexFrameScene {
  const pointer = usePointer()
  const reducedMotion = useReducedMotion()

  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 1, 10, 10000)
  const u = <T>(value: T): IUniform<T> => ({ value })

  // ── The line ──
  const lineUniforms = {
    uColor: u(new Color()),
    uShade: u(params.line.shade),
    uTail: u(0),
    uHead: u(0),
    uClip: u(1),
  }
  const lineMaterial = new ShaderMaterial({
    vertexShader: loadShader('flexframe-line.vert'),
    fragmentShader: loadShader('flexframe-line.frag'),
    uniforms: lineUniforms,
  })
  const capUniforms = { ...lineUniforms, uClip: u(0) }
  const capMaterial = new ShaderMaterial({
    vertexShader: loadShader('flexframe-line.vert'),
    fragmentShader: loadShader('flexframe-line.frag'),
    uniforms: capUniforms,
  })
  const capGeometry = new SphereGeometry(1, 24, 16)
  const headCap = new Mesh(capGeometry, capMaterial)
  const tailCap = new Mesh(capGeometry, capMaterial)
  let line: Mesh<TubeGeometry, ShaderMaterial> | null = null
  let path: LinePath | null = null
  let worldCurve: CatmullRomCurve3 | null = null
  scene.add(headCap, tailCap)

  // ── The flexible frame ──
  const video = document.createElement('video')
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  // The footage (~2 MB) loads once the page itself has loaded and the browser is idle — not in the
  // critical path — then warms the hardware video decoder (its first decode can block the GPU process
  // for a second or more, which mid-scroll would freeze the page). Still long before the card shows.
  const loadVideo = () => {
    for (const [src, type] of [
      [FLEX_MEDIA.webm, 'video/webm'],
      [FLEX_MEDIA.mp4, 'video/mp4'],
    ] as const) {
      const s = document.createElement('source')
      s.src = src
      s.type = type
      video.appendChild(s)
    }
    video.load()
    if (reducedMotion.value) return
    const settle = () => {
      if (!video.paused) video.pause()
      video.currentTime = 0
    }
    video.addEventListener('playing', settle, { once: true })
    void video.play().catch(() => {})
  }
  const whenIdle = () => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    if (ric) ric(loadVideo, { timeout: 2500 })
    else setTimeout(loadVideo, 600)
  }
  if (document.readyState === 'complete') whenIdle()
  else window.addEventListener('load', whenIdle, { once: true })
  const videoTexture = new VideoTexture(video)
  videoTexture.colorSpace = SRGBColorSpace
  const poster = new TextureLoader().load(FLEX_MEDIA.poster)
  poster.colorSpace = SRGBColorSpace
  // The INSIDE world (S3): rendered on this stage into a full-viewport target that the frame looks
  // through (screen-space, a window), then — once the frame fills the screen — straight to the canvas.
  let world: InsideWorld | null = null
  const worldTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false })
  let worldRendered = false
  let stillDirty = true
  /** Warm-up stage: 0 nothing yet, 1 compiling, 2 compiled. */
  let compileStage = 0

  const ripple = new RibbonWaves(256, 128, { wrapV: false })
  const rippleParams = { speed: 420, damping: 2.4, viscosity: 1.5, restore: 1.4, radius: 46 }
  const planeUniforms = {
    uCenter: u(new Vector3()),
    uSize: u(new Vector2(1, 1)),
    uRot: u(0),
    uTilt: u(new Vector2()),
    uSkew: u(0),
    uCurl: u(0),
    uCurlR: u(100),
    uWave: u(0),
    uWaveK: u(params.frame.waveCount),
    uTime: u(0),
    tRipple: u<Texture | null>(null),
    uRippleAmp: u(0),
    uRadius: u(params.frame.cardRadius),
    tPoster: u<Texture>(poster),
    tVideo: u<Texture>(videoTexture),
    uVideoReady: u(0),
    uMediaAspect: u(FLEX_MEDIA.aspect),
    tWorld: u<Texture>(worldTarget.texture),
    uWorldReady: u(0),
    uWorldScreen: u(1),
    uWorldAspect: u(1),
    uResolution: u(new Vector2(1, 1)),
    uDissolve: u(params.frame.dissolve),
    uGrain: u(params.frame.grain),
    uGrainTime: u(0),
    uDuoDark: u(new Color()),
    uDuoLight: u(new Color()),
    uBandA: u(new Color()),
    uBandB: u(new Color()),
    uBack: u(new Color('#fbfaf6')),
    uWipe: u(0),
    uBandWidth: u(params.frame.bandWidth),
    uBandSoft: u(params.frame.bandSoftness),
  }
  const planeMaterial = new ShaderMaterial({
    vertexShader: loadShader('flexframe-plane.vert'),
    fragmentShader: loadShader('flexframe-plane.frag'),
    uniforms: planeUniforms,
    side: DoubleSide, // the back (warm white) shows during the turn / curl
    transparent: true, // anti-aliased rounded corners
  })
  const planeGeometry = new PlaneGeometry(1, 1, 64, 48)
  const plane = new Mesh(planeGeometry, planeMaterial)
  plane.frustumCulled = false
  // Drawn first: the line's behind-the-card stretch is hidden by depth, its front stretch passes over.
  plane.renderOrder = 0
  scene.add(plane)
  // Reduced motion: the card is HTML (duotone poster); this invisible occluder keeps the loop's top
  // stretch behind it (depth only).
  const occluder = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ colorWrite: false, side: DoubleSide }))
  occluder.renderOrder = -1
  occluder.visible = false
  scene.add(occluder)

  let isMobile = false
  let worldVisible = false
  let doors = 0
  let worldQ = 0
  let dpr = 1
  let vw = 1
  let vh = 1
  let progress = 0
  let isStatic = false
  let elapsed = 0
  let pathKey = ''
  let hovering = false
  let lastStroke: WaveStroke | null = null
  let stepDelta = 0
  const tilt = new Vector2()
  const lastHit = new Vector2()
  let hadHit = false
  const sectionRect = { top: 0, left: 0 }
  const cardLocal: PxRect = { x: 0, y: 0, w: 1, h: 1 }

  const finalRect = () => {
    const F = params.frame
    const w = F.width * vw
    const h = F.height * vh
    // Viewport px; follows the section, so after the pin releases the frame scrolls away with it.
    return { x: sectionRect.left + (vw - w) / 2, y: sectionRect.top + F.top * vh, w, h }
  }

  /**
   * Section position every frame (cheap, from scroll math when provided); the card's place inside the
   * section only after a layout change. Rebuild the tube when the layout changed.
   */
  let needsMeasure = true
  function measure() {
    const sec = options.section()
    const card = options.card()
    if (!sec || !card) return
    if (needsMeasure || !options.sectionTop) {
      const s = sec.getBoundingClientRect()
      const c = card.getBoundingClientRect()
      sectionRect.left = s.left
      cardLocal.x = c.left - s.left
      cardLocal.y = c.top - s.top
      cardLocal.w = c.width
      cardLocal.h = c.height
      sectionRect.top = s.top
      needsMeasure = false
    }
    if (options.sectionTop) sectionRect.top = options.sectionTop()
    const L = params.line
    const key = JSON.stringify([vw, vh, cardLocal, isMobile, L.points, L.pointsMobile, L.radius, L.loopScale])
    if (key !== pathKey) {
      pathKey = key
      rebuildLine()
    }
  }

  function lineRadius() {
    return params.line.radius * Math.max(0.6, vw / 1440)
  }

  function rebuildLine() {
    const pts = isMobile ? params.line.pointsMobile : params.line.points
    path = buildLinePath(pts, vw, vh, cardLocal, params.line.loopScale)
    // Section px (y down) → world px (y up, origin at the viewport centre). Distances are kept.
    worldCurve = new CatmullRomCurve3(
      path.curve.points.map((p) => new Vector3(p.x - vw / 2, vh / 2 - p.y, p.z)),
      false,
      'centripetal',
    )
    const segments = Math.max(400, Math.round(path.length / 3))
    const geometry = new TubeGeometry(worldCurve, segments, lineRadius(), 16, false)
    const arc = new Float32Array(geometry.getAttribute('position').count)
    // TubeGeometry samples getPointAt(i / segments): ring i sits at arc length i / segments × length.
    for (let i = 0; i <= segments; i++) for (let j = 0; j <= 16; j++) arc[i * 17 + j] = (i / segments) * path.length
    geometry.setAttribute('aArc', new Float32BufferAttribute(arc, 1))
    if (line) {
      line.geometry.dispose()
      line.geometry = geometry
    } else {
      line = new Mesh(geometry, lineMaterial)
      line.frustumCulled = false
      line.renderOrder = 1
      scene.add(line)
    }
    const r = lineRadius()
    headCap.scale.setScalar(r)
    tailCap.scale.setScalar(r)
  }

  const _p = new Vector3()
  function placeCap(cap: Mesh, arc: number) {
    if (!path || !worldCurve || arc <= 0.5 || arc >= path.length - 0.5) {
      cap.visible = false
      return
    }
    cap.visible = true
    worldCurve.getPointAt(arc / path.length, _p)
    cap.position.copy(_p)
  }

  function updateLine() {
    if (!path || !line) return
    const L = params.line
    const pad = lineRadius() * 2
    let head: number
    let tail: number
    if (isStatic) {
      head = path.length + pad
      tail = -pad
    } else {
      head = snakeArc(path, isMobile ? L.headMobile : L.head, progress, vw, pad)
      tail = snakeArc(path, isMobile ? L.tailMobile : L.tail, progress, vw, pad)
      tail = Math.max(tail, head - L.visibleLength * vw)
      tail = Math.min(tail, head)
    }
    lineUniforms.uHead.value = head
    lineUniforms.uTail.value = tail
    // The whole line moves with the section (before / after the pin).
    line.position.y = -sectionRect.top
    placeCap(headCap, head)
    placeCap(tailCap, tail)
    headCap.position.y -= sectionRect.top
    tailCap.position.y -= sectionRect.top
    line.visible = head > tail + 0.5
    if (!line.visible) headCap.visible = tailCap.visible = false
  }

  /** The flat frame right now: the settled frame (pinned) or, in reduced motion, the still block. */
  function flatRect(): Rect {
    return (isStatic && options.staticFrame?.()) || finalRect()
  }

  function updatePlane(delta: number) {
    const F = params.frame
    const flexT = isStatic ? 1 : range(progress, params.timing.flex)
    const e = easeInOut2(flexT)
    const s = isStatic ? 0 : Math.sin(Math.PI * e)
    // From the card (live, follows the section) to the settled frame.
    const card = { x: sectionRect.left + cardLocal.x, y: sectionRect.top + cardLocal.y, w: cardLocal.w, h: cardLocal.h }
    const from = card
    const flat = flatRect()
    // Doors: the settled frame opens to the full viewport (power2.inOut), its corners squaring off.
    const dE = isStatic ? 0 : easeInOut2(doors)
    const to = {
      x: flat.x * (1 - dE),
      y: flat.y * (1 - dE),
      w: flat.w + (vw - flat.w) * dE,
      h: flat.h + (vh - flat.h) * dE,
    }
    occluder.visible = isStatic
    if (isStatic) {
      occluder.position.set(card.x + card.w / 2 - vw / 2, vh / 2 - (card.y + card.h / 2), 0)
      occluder.scale.set(card.w, card.h, 1)
    }
    const w = from.w + (to.w - from.w) * e
    const h = from.h + (to.h - from.h) * e
    const cx = from.x + from.w / 2 + (to.x + to.w / 2 - (from.x + from.w / 2)) * e
    const cy = from.y + from.h / 2 + (to.y + to.h / 2 - (from.y + from.h / 2)) * e
    const U = planeUniforms
    U.uCenter.value.set(cx - vw / 2, vh / 2 - cy, 0)
    U.uSize.value.set(w, h)
    U.uRot.value = -(isMobile ? F.rotationMaxMobile : F.rotationMax) * DEG * s
    U.uSkew.value = F.skew * s
    U.uCurl.value = isMobile ? 0 : F.curl * 0.35 * w * s
    U.uCurlR.value = Math.max(10, F.curlRadius * h)
    U.uWave.value = F.wave * w * s
    U.uWaveK.value = F.waveCount
    // Reduced motion: the still world is full-bleed (square corners).
    U.uRadius.value = isStatic ? 0 : (F.cardRadius + (F.radius - F.cardRadius) * e) * (1 - dE)
    U.uWipe.value = isStatic ? 1 : range(progress, params.timing.wipe)
    U.uVideoReady.value = !reducedMotion.value && video.readyState >= 2 ? 1 : 0
    U.uDissolve.value = F.dissolve
    U.uGrain.value = reducedMotion.value ? 0 : F.grain
    U.uGrainTime.value = elapsed
    U.uWorldReady.value = worldRendered ? 1 : 0
    // Reduced motion: the still world is cover-fitted to the still block (no window parallax).
    U.uWorldScreen.value = isStatic ? 0 : 1
    U.uWorldAspect.value = vw / vh
    U.uResolution.value.set(vw * dpr, vh * dpr)
    ;(U.uDuoDark.value as Color).set(F.duoDark)
    ;(U.uDuoLight.value as Color).set(F.duoLight)
    ;(U.uBandA.value as Color).set(F.bandA)
    ;(U.uBandB.value as Color).set(F.bandB)
    U.uBandWidth.value = F.bandWidth
    U.uBandSoft.value = F.bandSoftness
    U.uTime.value = elapsed

    // Hover (settled frame only, before the doors open): tilt toward the cursor + a very subtle ripple.
    const settled = !isStatic && doors <= 0 && progress >= params.timing.flex[1]
    const px = ((pointer.x + 1) / 2) * vw
    const py = ((1 - pointer.y) / 2) * vh
    hovering = settled && pointer.inside && px >= to.x && px <= to.x + to.w && py >= to.y && py <= to.y + to.h
    const tx = hovering ? ((px - (to.x + to.w / 2)) / (to.w / 2)) * F.hoverTilt * DEG : 0
    const ty = hovering ? ((py - (to.y + to.h / 2)) / (to.h / 2)) * F.hoverTilt * DEG : 0
    const k = 1 - Math.exp(-delta * 4)
    tilt.x += (ty - tilt.x) * k
    tilt.y += (tx - tilt.y) * k
    U.uTilt.value.set(tilt.x, tilt.y)
    U.uRippleAmp.value = F.ripple * w * (1 - dE)
    lastStroke = null
    if (hovering && pointer.speed > 0.05) {
      const uv = new Vector2((px - to.x) / to.w, 1 - (py - to.y) / to.h)
      lastStroke = { from: hadHit ? lastHit.clone() : uv, to: uv, strength: Math.min(pointer.speed, 4) * 40 * delta }
      lastHit.copy(uv)
      hadHit = true
    } else hadHit = false

    // The footage plays as soon as the card is on screen, until the world has replaced it.
    const shownY = cy - h / 2
    const onScreen = shownY < vh && shownY + h > 0
    const wantPlay = !reducedMotion.value && !isStatic && onScreen && U.uWipe.value < 1
    if (wantPlay && video.paused) void video.play().catch(() => {})
    else if (!wantPlay && !video.paused) video.pause()

    // The world renders only while the frame shows it (or fills the screen).
    worldVisible = onScreen && (isStatic || U.uWipe.value > 0)
    plane.visible = doors < 1
  }

  function createWorld() {
    world?.dispose()
    world = new InsideWorld(isMobile)
    world.setSize(vw, vh, dpr)
    world.setStill(isStatic)
    world.setProgress(worldQ)
    worldRendered = false
    stillDirty = true
  }

  function buildPane(f: FolderApi) {
    const P = params
    const rebuild = () => (pathKey = '')
    const li = f.addFolder({ title: 'Line', expanded: true })
    li.addBinding(P.line, 'radius', { min: 2, max: 24, step: 0.5 }).on('change', rebuild)
    li.addBinding(P.line, 'color')
    li.addBinding(P.line, 'shade', { min: 0, max: 0.8, step: 0.01 })
    li.addBinding(P.line, 'visibleLength', { label: 'visible length (× vw)', min: 0.3, max: 3, step: 0.01 })
    li.addBinding(P.line, 'loopScale', { label: 'loop size', min: 0.5, max: 1.6, step: 0.01 }).on('change', rebuild)
    const pts = li.addFolder({ title: 'Path points (desktop)', expanded: false })
    P.line.points.forEach((pt, i) => {
      const pf = pts.addFolder({ title: `${i} · ${pt.space}`, expanded: false })
      pf.addBinding(pt, 'x', { min: pt.space === 'card' ? -2 : -0.3, max: pt.space === 'card' ? 2 : 1.3, step: 0.001 }).on('change', rebuild)
      pf.addBinding(pt, 'y', { min: pt.space === 'card' ? -2 : -0.3, max: pt.space === 'card' ? 2 : 1.3, step: 0.001 }).on('change', rebuild)
      pf.addBinding(pt, 'z', { min: -120, max: 120, step: 1 }).on('change', rebuild)
    })
    const snake = li.addFolder({ title: 'Snake keys (p → point index + px×vw)', expanded: false })
    for (const [label, keys] of [
      ['head', P.line.head],
      ['tail', P.line.tail],
    ] as const) {
      keys.forEach((k, i) => {
        const kf = snake.addFolder({ title: `${label} ${i}`, expanded: false })
        kf.addBinding(k, 'p', { min: 0, max: 1, step: 0.005 })
        kf.addBinding(k, 'k', { min: -1, max: 99, step: 0.05 })
        kf.addBinding(k, 'px', { min: -0.5, max: 0.5, step: 0.005 })
      })
    }
    const fr = f.addFolder({ title: 'Frame', expanded: false })
    fr.addBinding(P.frame, 'rotationMax', { label: 'rotation max (°)', min: 0, max: 80, step: 0.5 })
    fr.addBinding(P.frame, 'skew', { min: 0, max: 0.5, step: 0.005 })
    fr.addBinding(P.frame, 'curl', { label: 'curl strength', min: 0, max: 2, step: 0.01 })
    fr.addBinding(P.frame, 'curlRadius', { label: 'curl radius (× h)', min: 0.1, max: 1.5, step: 0.01 })
    fr.addBinding(P.frame, 'wave', { label: 'wave amp (× w)', min: 0, max: 0.1, step: 0.001 })
    fr.addBinding(P.frame, 'waveCount', { label: 'waves across', min: 0.2, max: 4, step: 0.05 })
    fr.addBinding(P.frame, 'duoDark')
    fr.addBinding(P.frame, 'duoLight')
    fr.addBinding(P.frame, 'bandA')
    fr.addBinding(P.frame, 'bandB')
    fr.addBinding(P.frame, 'bandWidth', { min: 0.02, max: 0.6, step: 0.005 })
    fr.addBinding(P.frame, 'width', { label: 'final width', min: 0.5, max: 1, step: 0.005 })
    fr.addBinding(P.frame, 'height', { label: 'final height', min: 0.3, max: 0.9, step: 0.005 })
    fr.addBinding(P.frame, 'top', { label: 'final top', min: 0, max: 0.5, step: 0.005 })
    fr.addBinding(P.frame, 'radius', { label: 'final radius', min: 0, max: 40, step: 0.5 })
    fr.addBinding(P.frame, 'hoverTilt', { label: 'hover tilt (°)', min: 0, max: 6, step: 0.1 })
    fr.addBinding(P.frame, 'ripple', { label: 'hover ripple (× w)', min: 0, max: 0.01, step: 0.0001 })
    const ti = f.addFolder({ title: 'Timing (p)', expanded: false })
    const changed = () => options.onTimingChange?.()
    for (const name of ['copyIn', 'headlineExit', 'copyOut', 'flex', 'wipe', 'words'] as const) {
      const pair = P.timing[name]
      const obj = { start: pair[0], end: pair[1] }
      const tf = ti.addFolder({ title: name, expanded: false })
      tf.addBinding(obj, 'start', { min: 0, max: 1, step: 0.005 }).on('change', () => ((pair[0] = obj.start), changed()))
      tf.addBinding(obj, 'end', { min: 0, max: 1, step: 0.005 }).on('change', () => ((pair[1] = obj.end), changed()))
    }
    ti.addBinding(P.timing, 'pin', { label: 'pin (vh)', min: 1, max: 6, step: 0.1 }).on('change', changed)
    const fo = f.addFolder({ title: 'Footage', expanded: false })
    fo.addBinding(P.frame, 'duoDark', { label: 'duotone dark' })
    fo.addBinding(P.frame, 'duoLight', { label: 'duotone light' })
    fo.addBinding(P.frame, 'grain', { min: 0, max: 0.2, step: 0.005 })
    fo.addBinding(P.frame, 'dissolve', { label: 'dissolve width', min: 0, max: 0.6, step: 0.005 })
    ti.addBinding(P.timing, 'doors', { label: 'doors (vh)', min: 0.3, max: 3, step: 0.05 }).on('change', changed)
    ti.addBinding(P.timing, 'world', { label: 'world (vh)', min: 1, max: 8, step: 0.1 }).on('change', changed)
    buildInsidePane(f, { rebuild: createWorld, onTextChange: changed })
    f.addButton({ title: 'Copy params as JSON' }).on('click', () => {
      const json = JSON.stringify({ ...P, inside: insideParams }, null, 2)
      console.info(`[flexframe] params:\n${json}`)
      void navigator.clipboard?.writeText(json).catch(() => {})
    })
  }

  const flexScene: FlexFrameScene = {
    id: options.id ?? 'flexframe',
    params,
    get hovering() {
      return hovering
    },
    setProgress(p) {
      progress = clamp01(p)
    },
    setStatic(on) {
      isStatic = on
      world?.setStill(on)
      stillDirty = true
    },
    remeasure() {
      needsMeasure = true
    },
    frameRect: () => finalRect(),
    setDoors(d) {
      doors = clamp01(d)
    },
    setWorld(q) {
      worldQ = clamp01(q)
      world?.setProgress(worldQ)
    },

    init(ctx) {
      vw = ctx.width
      vh = ctx.height
      dpr = Math.min(1.5, ctx.dpr)
      isMobile = ctx.isMobile
      ripple.clear(ctx.renderer)
      planeUniforms.tRipple.value = ripple.texture
      worldTarget.setSize(Math.round(vw * dpr), Math.round(vh * dpr))
      // The world itself is built in the warm-up (prewarm), off the critical path of the page load.
      measure()
      if (ctx.pane) buildPane(ctx.pane)
      if (import.meta.dev) {
        ;(window as Window & { __inside?: object }).__inside = { params: insideParams, rebuild: createWorld }
        ;(window as Window & { __flexframe?: () => object }).__flexframe = () => ({
          params,
          progress,
          head: lineUniforms.uHead.value,
          tail: lineUniforms.uTail.value,
          length: path?.length ?? 0,
          hovering,
          pointer: { x: pointer.x, y: pointer.y, inside: pointer.inside },
          frame: finalRect(),
          doors,
          worldQ,
          worldVisible,
          worldRendered,
          worldFinished: world?.finished ?? false,
          videoTime: video.currentTime,
          videoPaused: video.paused,
          videoReady: video.readyState,
          triangles: ((line?.geometry.getIndex()?.count ?? 0) + (planeGeometry.getIndex()?.count ?? 0)) / 3,
        })
      }
    },

    update(_time, delta) {
      if (!reducedMotion.value) elapsed += delta
      measure()
      ;(lineUniforms.uColor.value as Color).set(params.line.color)
      lineUniforms.uShade.value = params.line.shade
      updateLine()
      updatePlane(delta)
      // On screen before the warm-up got to it (e.g. a reload mid-page): build it now.
      if (!world && worldVisible) createWorld()
      if (world && worldVisible) {
        world.setLook(pointer.inside ? pointer.x : 0, pointer.inside ? pointer.y : 0)
        world.update(Math.min(delta, 0.05))
      }
      stepDelta = reducedMotion.value ? 0 : delta
    },

    /**
     * Off screen, at load: one draw scissored to a single pixel (wiped by the stage's clear right
     * after) with the footage AND the world sampled — this initialises the hardware video decoder and
     * the video texture, and compiles every program (one full world render into its target). Done
     * once the video has a decoded frame.
     */
    prewarm(r) {
      // 1. Build the world, 2. compile every program in parallel (non-blocking), 3. draw once.
      if (!world) {
        createWorld()
        return false
      }
      if (compileStage === 0) {
        compileStage = 1
        void Promise.all([r.compileAsync(scene, camera), world.compileAsync(r, worldTarget)]).then(() => (compileStage = 2))
        return false
      }
      if (compileStage === 1) return false
      const videoOk = reducedMotion.value || video.readyState >= 2
      measure()
      updateLine()
      updatePlane(0)
      if (world && !worldRendered) {
        world.update(1 / 60)
        world.render(r, worldTarget)
        worldRendered = true
      }
      const U = planeUniforms
      const keepWipe = U.uWipe.value
      const keepVideo = U.uVideoReady.value
      U.uWipe.value = 0.5
      U.uVideoReady.value = videoOk && !reducedMotion.value ? 1 : 0
      r.setRenderTarget(null)
      r.setScissor(0, 0, 1, 1)
      r.setScissorTest(true)
      r.render(scene, camera)
      r.setScissorTest(false)
      U.uWipe.value = keepWipe
      U.uVideoReady.value = keepVideo
      if (!video.paused) video.pause()
      return videoOk && worldRendered
    },

    render(r) {
      if (world && doors >= 1) {
        // Full screen: the world straight to the canvas (no plane). Once it has settled into paper,
        // nothing draws: the transparent canvas shows the paper ground beneath.
        if (!world.finished) world.render(r, null)
        return
      }
      if (world && worldVisible && (!isStatic || stillDirty)) {
        world.render(r, worldTarget)
        worldRendered = true
        stillDirty = false
      }
      if (stepDelta > 0) {
        const size = planeUniforms.uSize.value
        ripple.step(r, stepDelta, rippleParams, new Vector2(size.x, size.y), lastStroke)
        planeUniforms.tRipple.value = ripple.texture
      }
      r.setRenderTarget(null)
      r.render(scene, camera)
    },

    resize(w, h) {
      vw = Math.max(1, w)
      vh = Math.max(1, h)
      camera.aspect = vw / vh
      // Pixel-true at z = 0: one world unit is one CSS pixel.
      camera.position.set(0, 0, vh / 2 / Math.tan((camera.fov * DEG) / 2))
      camera.updateProjectionMatrix()
      pathKey = ''
      needsMeasure = true
      worldTarget.setSize(Math.round(vw * dpr), Math.round(vh * dpr))
      world?.setSize(vw, vh, dpr)
      stillDirty = true
    },

    setActive() {},

    dispose() {
      video.pause()
      video.removeAttribute('src')
      video.querySelectorAll('source').forEach((s) => s.remove())
      video.load()
      videoTexture.dispose()
      poster.dispose()
      world?.dispose()
      world = null
      worldTarget.dispose()
      occluder.geometry.dispose()
      occluder.material.dispose()
      ripple.dispose()
      line?.geometry.dispose()
      lineMaterial.dispose()
      capMaterial.dispose()
      capGeometry.dispose()
      planeGeometry.dispose()
      planeMaterial.dispose()
      scene.clear()
      line = null
    },
  }
  // Camera before the first resize.
  flexScene.resize(window.innerWidth, window.innerHeight)
  return flexScene
}
