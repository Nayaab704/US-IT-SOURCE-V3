import gsap from 'gsap'
import {
  ACESFilmicToneMapping,
  AlwaysDepth,
  AgXToneMapping,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
  type Texture,
  type WebGLRenderer,
} from 'three'
import type { FolderApi } from 'tweakpane'
import type { StageScene } from '~/composables/useStage'
import { loadShader } from '~/utils/shaders'
import { RibbonEnvironment } from './environment'
import { buildRibbonGeometry, selfClearance, type RibbonGeometry } from './geometry'
import { ribbonParams as params, type RibbonParams } from './params'
import { RibbonWaves, type WaveStroke } from './waves'

export interface RibbonScene extends StageScene {
  readonly params: RibbonParams
  /** Switch to framing 0–2. */
  setFraming(index: number): void
  /** Crumpled → inflated (0 → 1) over params.inflate.playDuration. */
  playInflate(): void
  /** Drive inflation directly (the opening): 0 = crumpled, 1 = taut. Stops a running Play. */
  setInflate(value: number): void
  /** Camera distance as a fraction of the framing's rest offset (0.85 = 15 % closer). */
  setDolly(scale: number): void
  /** True once the environment is baked and the ribbon has rendered at least one frame. */
  isReady(): boolean
  /**
   * The rectangle rule: draw the whole hero (void + ribbon) shrunk into this rounded rect (viewport
   * CSS px, y down), cover-scaled about its centre. null = full screen (the normal path).
   */
  setPresentRect(rect: { x: number; y: number; w: number; h: number; radius: number } | null): void
  /** Reduced motion: crossfade the hero to paper (0 = hero, 1 = paper). */
  setFade(amount: number): void
}

const TAU = Math.PI * 2
const DEG = Math.PI / 180

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Thickness of the cross-section for an inflation value: thin when deflated, full by ~0.8, then a
 * short pop-taut overshoot (peak at `overshootAt`) that settles back to exactly 1 at full inflation.
 */
export function inflateThickness(i: number, p: RibbonParams['inflate']) {
  const base = 1 - p.thinning * (1 - smoothstep(0, p.overshootAt - 0.05, i))
  const bell = i <= p.overshootAt ? smoothstep(p.overshootAt - 0.15, p.overshootAt, i) : 1 - smoothstep(p.overshootAt, 1, i)
  return base + p.overshoot * bell
}

// ── The latex surface, shared by both stages: one height along the normal, in world units ──
// waves (liquid, from the simulation) − folds (crumple, when deflated) + shiver (always, tiny).
// Coordinates s = (along, around) the ribbon in world units, so features are the same size
// everywhere; v wraps round the perimeter, so the noise fields are cross-faded across the seam.
const SURFACE_COMMON = /* glsl */ `
uniform sampler2D tWaves;
uniform float uWaveAmp;      // world units at full wave height
uniform vec2 uExtent;        // world length of the workflow path, perimeter of the cross-section
uniform float uThickness;    // world thickness (nominal, inflated)
uniform float uFoldAmp;      // world fold depth (already eased by (1 − inflate)²)
uniform vec3 uFold;          // scale (cycles / unit), anisotropy (across ÷ along), sharpness
uniform float uShiverAmp;    // world units
uniform float uShiverFreq;   // cycles / unit
uniform float uShiverTime;
varying vec2 vWaveUv;        // the wave grid covers the workflow path only (tails clamp to its calm edge)
varying float vConvex;

float waveHeightOf(vec4 s) {
  // Soft-saturate: a violent swipe bulges, it never tears through the ribbon.
  return uWaveAmp * s.r / sqrt(1.0 + s.r * s.r);
}

// Crumple: one soft fold octave + ridged (1 − |n|)^k crease octaves; creases run mostly across the
// ribbon (lower frequency around it). 0 = flat, 1 = deepest crease.
float foldAt(vec2 s) {
  vec2 p = vec2(s.x, s.y * uFold.y) * uFold.x;
  // Big soft folds dominate; each finer crease octave is much weaker (latex, not foil).
  float f = 0.4 * (0.5 + 0.5 * snoise(vec3(p * 0.5, 3.1)));
  float norm = 0.4;
  float a = 0.45;
  for (int i = 0; i < 3; i++) {
    float n = snoise(vec3(p, 11.7 * float(i)));
    // 1 − |n| with the cusp slightly rounded: creases stay sharp-ish without hard lighting seams.
    f += a * pow(1.0 - sqrt(n * n + 0.004), uFold.z);
    norm += a;
    p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.03 + 5.3;
    a *= 0.4;
  }
  return f / norm;
}
float foldField(vec2 s) {
  float f = foldAt(s);
  float seam = smoothstep(0.85, 1.0, s.y / uExtent.y);
  if (seam > 0.0) f = mix(f, foldAt(s - vec2(0.0, uExtent.y)), seam);
  return f;
}
float shiverAt(vec2 s) {
  return snoise(vec3(s * uShiverFreq, uShiverTime));
}
float shiverField(vec2 s) {
  float n = shiverAt(s);
  float seam = smoothstep(0.85, 1.0, s.y / uExtent.y);
  if (seam > 0.0) n = mix(n, shiverAt(s - vec2(0.0, uExtent.y)), seam);
  return n;
}
// x = liquid wave height, y = folds, z = shiver (all world units along the normal).
vec3 surfaceHeight(vec2 wuv, vec4 waveSample, float convex) {
  vec2 s = wuv * uExtent;
  float fold = uFoldAmp > 0.0 ? foldField(s) : 0.0;
  // Shiver: strongest on convex top curves, damped inside folds.
  float foldMask = 1.0 - clamp(uFoldAmp / (0.25 * uThickness), 0.0, 1.0) * fold;
  float shiver = uShiverAmp > 0.0 ? shiverField(s) * uShiverAmp * convex * foldMask : 0.0;
  return vec3(waveHeightOf(waveSample), -uFoldAmp * fold, shiver);
}
`
const SURFACE_VERTEX = /* glsl */ `
#include <begin_vertex>
vWaveUv = vec2((uv.x - uWaveRange.x) * uWaveRange.y, uv.y);
// Where on the cushion: the top curve (profile normal pointing up) shivers most.
vConvex = 0.35 + 0.65 * max(aSection.w, 0.0);
// Deflation thins the cross-section toward the centre line (and the pop overshoot swells it).
transformed -= aBinormal * aSection.y * (1.0 - uThickScale);
{
  vec3 hh = surfaceHeight(vWaveUv, texture2D(tWaves, vWaveUv), vConvex);
  transformed += objectNormal * (hh.x + hh.y + hh.z);
  // Global wobble: the ribbon bends a little toward a fast swipe around where it was touched.
  float wu = (uv.x - uWobbleU) / uWobbleSpan;
  transformed += uWobble * exp(-wu * wu);
}
`
const SURFACE_FRAGMENT_PARS = /* glsl */ `
uniform vec2 uWaveSize;
uniform float uBump;
uniform float uShiverNormal;
uniform float uGrain;
uniform float uGrainSeed;
uniform float uDither;
uniform float uFrame;
// Waves: cubic B-spline samples (one cell spans many pixels up close; bilinear would facet), with
// extra tilt so reflections wobble visibly.
float waveHeightFrag(vec2 uv) {
  return waveHeightOf(textureBSpline(tWaves, uv, uWaveSize)) * uBump;
}
// Folds + shiver: noise is the expensive part, so it is evaluated once per pixel and its slope taken
// from screen-space derivatives (fold features span many pixels). Folds are true slope; the shiver's
// tilt is scaled down — on a mirror even a 0.5 % ripple would otherwise read as hammered metal.
float noiseHeightFrag(vec2 uv) {
  vec3 hh = surfaceHeight(uv, vec4(0.0), vConvex);
  return hh.y + hh.z * uShiverNormal;
}
// Bump-map style normal tilt from height differences across the pixel (as three's perturbNormalArb).
vec3 surfacePerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos);
  vec3 sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`

export function createRibbonScene(options: { id?: string } = {}): RibbonScene {
  const reducedMotion = useReducedMotion()
  const pointer = usePointer()

  const scene = new Scene()
  const camera = new PerspectiveCamera(32, 1, 0.05, 200)
  const pivot = new Group()
  scene.add(pivot)

  const u = <T>(value: T): IUniform<T> => ({ value })
  const surfaceUniforms = {
    tWaves: u<Texture | null>(null),
    uWaveAmp: u(0),
    uBump: u(params.waves.bump),
    uWaveRange: u(new Vector2(0, 1)),
    uWaveSize: u(new Vector2(1, 1)),
    uExtent: u(new Vector2(1, 1)),
    uThickness: u(0.5),
    uThickScale: u(1),
    uFoldAmp: u(0),
    uFold: u(new Vector3(1, 1, 2)),
    uShiverAmp: u(0),
    uShiverFreq: u(params.shiver.frequency),
    uShiverTime: u(0),
    uShiverNormal: u(params.shiver.normal),
    uWobble: u(new Vector3()),
    uWobbleU: u(0.5),
    uWobbleSpan: u(0.12),
    uGrain: u(0),
    uGrainSeed: u(0),
    uDither: u(1),
    uFrame: u(0),
  }

  const NOISE = loadShader('noise.glsl')
  const DITHER = loadShader('dither.glsl')
  const UPSAMPLE = loadShader('upsample.glsl')
  const material = new MeshPhysicalMaterial({ metalness: 0 })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, surfaceUniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aBinormal;
        attribute vec4 aSection;
        uniform vec3 uWobble;
        uniform float uWobbleU;
        uniform float uWobbleSpan;
        uniform vec2 uWaveRange;
        uniform float uThickScale;
        ${NOISE}
        ${SURFACE_COMMON}`,
      )
      .replace('#include <begin_vertex>', SURFACE_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}\n${SURFACE_COMMON}\n${UPSAMPLE}\n${SURFACE_FRAGMENT_PARS}\n${DITHER}`)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        float sfW0 = waveHeightFrag(vWaveUv);
        float sfN0 = noiseHeightFrag(vWaveUv);
        vec2 sfGrad = vec2(waveHeightFrag(vWaveUv + dFdx(vWaveUv)) - sfW0, waveHeightFrag(vWaveUv + dFdy(vWaveUv)) - sfW0)
          + vec2(dFdx(sfN0), dFdy(sfN0));
        normal = surfacePerturb(-vViewPosition, normal, sfGrad, faceDirection);`,
      )
      // The latex's sheens come mostly from the clearcoat: bend its normal too.
      .replace(
        '#include <clearcoat_normal_fragment_begin>',
        `#include <clearcoat_normal_fragment_begin>
        clearcoatNormal = surfacePerturb(-vViewPosition, clearcoatNormal, sfGrad, faceDirection);`,
      )
      // Drawn straight to the canvas (tone mapped + sRGB by three): grain + dither in display space.
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        gl_FragColor.rgb = filmGrain(gl_FragColor.rgb, gl_FragCoord.xy, uGrainSeed, uGrain);
        if (uDither > 0.5) gl_FragColor.rgb = dither8bit(gl_FragColor.rgb, gl_FragCoord.xy, uFrame);`,
      )
  }

  // The void, drawn first, straight to the canvas.
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quadGeometry = new PlaneGeometry(2, 2)
  const voidMaterial = new ShaderMaterial({
    vertexShader: loadShader('fullscreen.vert'),
    fragmentShader: loadShader('ribbon-void.frag'),
    uniforms: {
      uVoid: u(new Vector3()),
      uVoidFalloff: u(0),
      uGrain: u(0),
      uGrainSeed: u(0),
      uDither: u(1),
      uFrame: u(0),
    },
    depthTest: false,
    depthWrite: false,
  })
  const quad = new Mesh(quadGeometry, voidMaterial)
  quad.frustumCulled = false
  const quadScene = new Scene()
  quadScene.add(quad)

  // Rounded-corner mask for the rectangle rule: writes the nearest depth OUTSIDE the rounded rect
  // (inside the scissor box), so the void and the ribbon fail the depth test in the corners. No extra
  // render target: the hero keeps its exact on-screen pipeline (tone mapping, grain, MSAA).
  const maskMaterial = new ShaderMaterial({
    vertexShader: loadShader('fullscreen.vert'),
    fragmentShader: /* glsl */ `
      uniform vec4 uRect;     // device px, GL origin (bottom-left): x, y, w, h
      uniform float uRadius;  // device px
      void main() {
        vec2 hs = uRect.zw * 0.5; // ('half' is reserved in GLSL ES)
        vec2 q = abs(gl_FragCoord.xy - (uRect.xy + hs)) - hs + uRadius;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
        if (d < 0.0) discard;
        gl_FragDepth = 0.0;
        gl_FragColor = vec4(0.0);
      }
    `,
    uniforms: { uRect: u(new Vector4()), uRadius: u(0) },
    // WebGL only writes depth while the depth test is on: test on, always pass.
    depthTest: true,
    depthFunc: AlwaysDepth,
    depthWrite: true,
    colorWrite: false,
  })
  const maskQuad = new Mesh(quadGeometry, maskMaterial)
  maskQuad.frustumCulled = false
  const maskScene = new Scene()
  maskScene.add(maskQuad)
  let presentRect: { x: number; y: number; w: number; h: number; radius: number } | null = null
  // Reduced-motion crossfade to paper: a full-screen paper quad on top (not tone mapped).
  const fadeMaterial = new MeshBasicMaterial({ color: new Color('#f1eee7'), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false })
  const fadeQuad = new Mesh(quadGeometry, fadeMaterial)
  fadeQuad.frustumCulled = false
  fadeQuad.position.z = -0.5 // inside the quad camera's 0–1 depth range
  const fadeScene = new Scene()
  fadeScene.add(fadeQuad)

  let env: RibbonEnvironment | null = null
  let waves: RibbonWaves | null = null
  let ribbon: RibbonGeometry | null = null
  let mesh: Mesh | null = null
  // Coarse twin of the ribbon (same curve, same UV space) for the cursor raycast.
  let hitMesh: Mesh | null = null
  const hitMaterial = new MeshBasicMaterial()
  let isMobile = false
  let width = 1
  let height = 1
  let elapsed = 0
  let frame = 0
  let geometryKey = ''
  let clearance = Infinity
  const target = new Vector3()
  const extent = new Vector2(1, 1)
  let inflateTween: gsap.core.Tween | null = null
  let inflateBinding: ReturnType<FolderApi['addBinding']> | null = null
  // True while the tween itself refreshes the slider (that refresh must not count as a user drag).
  let refreshingInflate = false
  let dolly = 1
  let renderedFrames = 0
  /** 0 not started, 1 compiling, 2 ready. */
  let compileState = 0

  // Cursor → surface.
  const raycaster = new Raycaster()
  const ndc = new Vector2()
  const lastHit = new Vector2()
  let hadHit = false
  const strokeFrom = new Vector2()
  const strokeTo = new Vector2()
  let lastStroke: WaveStroke | null = null
  /** Frame time handed from update() to the simulation step in render(). */
  let stepDelta = 0
  // Wobble spring (mesh-local offset) and camera parallax (smoothed pointer).
  const wobble = new Vector3()
  const wobbleVel = new Vector3()
  const wobbleGoal = new Vector3()
  let parallaxX = 0
  let parallaxY = 0

  /** Dev-only switches for measuring (e.g. the wave simulation's own cost). */
  const debug = { hideRibbon: false, forceWaves: false, wobbleMax: 0, timeScale: 1, rebuild: () => rebuildGeometry() }

  function rebuildGeometry() {
    const g = params.geometry
    const detail = isMobile
      ? { segments: g.segmentsMobile, tailSegments: Math.round(g.tailSegments / 2), ringSegments: g.ringSegmentsMobile }
      : { segments: g.segments, tailSegments: g.tailSegments, ringSegments: g.ringSegments }
    const key = JSON.stringify({ g, detail })
    if (key === geometryKey && mesh) return
    geometryKey = key
    const next = buildRibbonGeometry(g, detail)
    const coarse = buildRibbonGeometry(g, { segments: 160, tailSegments: 6, ringSegments: 16 })
    if (mesh && hitMesh) {
      mesh.geometry.dispose()
      mesh.geometry = next.geometry
      hitMesh.geometry.dispose()
      hitMesh.geometry = coarse.geometry
    } else {
      mesh = new Mesh(next.geometry, material)
      // The surface displaces in the vertex shader; never cull it on its undisplaced bounds.
      mesh.frustumCulled = false
      hitMesh = new Mesh(coarse.geometry, hitMaterial)
      hitMesh.visible = false
      mesh.add(hitMesh)
      pivot.add(mesh)
    }
    ribbon = next
    // The wave grid spans the workflow path only (the tails stay out of frame anyway).
    const [u0, u1] = next.inner
    extent.set(next.length * (u1 - u0), next.perimeter)
    surfaceUniforms.uWaveRange.value.set(u0, 1 / (u1 - u0))
    surfaceUniforms.uExtent.value.copy(extent)
    if (import.meta.dev) clearance = selfClearance(next, g.width)
    applyFraming()
  }

  /** Camera, pivot from the active framing (+ slow drift and the cursor's gentle parallax). */
  const _offset = new Vector3()
  const _right = new Vector3()
  const Y = new Vector3(0, 1, 0)
  function applyFraming() {
    if (!ribbon || !mesh) return
    const f = params.framings[params.framing] ?? params.framings[0]!
    // Framing u is along the workflow path itself (tails excluded).
    const [u0, u1] = ribbon.inner
    ribbon.curve.getPointAt(u0 + Math.min(1, Math.max(0, f.u)) * (u1 - u0), target)
    // The ribbon turns about the framed point, so the composition holds while it rotates.
    pivot.position.copy(target)
    mesh.position.copy(target).negate()
    const t = reducedMotion.value ? 0 : elapsed
    const d = params.life.drift
    _offset.set(
      f.offset.x + d * Math.sin((TAU * t) / 37),
      f.offset.y + d * 0.7 * Math.sin((TAU * t) / 53 + 1.1),
      f.offset.z + d * 0.5 * Math.sin((TAU * t) / 61 + 2.3),
    )
    _offset.multiplyScalar(dolly)
    const p = params.life.parallax * DEG
    _offset.applyAxisAngle(Y, -parallaxX * p)
    _right.crossVectors(_offset, Y).normalize()
    _offset.applyAxisAngle(_right, parallaxY * p)
    camera.position.copy(target).add(_offset)
    camera.fov = f.fov
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    camera.lookAt(target)
  }

  function setFraming(index: number) {
    params.framing = Math.min(2, Math.max(0, Math.round(index)))
    applyFraming()
  }

  function playInflate() {
    inflateTween?.kill()
    params.inflate.value = 0
    inflateTween = gsap.to(params.inflate, {
      value: 1,
      duration: params.inflate.playDuration,
      ease: 'power2.out',
      onUpdate: () => {
        refreshingInflate = true
        inflateBinding?.refresh()
        refreshingInflate = false
      },
    })
  }

  function setInflate(value: number) {
    inflateTween?.kill()
    params.inflate.value = Math.min(1, Math.max(0, value))
    refreshingInflate = true
    inflateBinding?.refresh()
    refreshingInflate = false
  }

  function setDolly(scale: number) {
    dolly = scale
    applyFraming()
  }

  /**
   * Raycast the pointer against the coarse twin; a stroke runs from the previous hit to this one,
   * with strength from the pointer's speed (fast swipe = strong wave, slow hover = gentle).
   */
  function strokeFromPointer(delta: number): WaveStroke | null {
    if (!hitMesh || !pointer.inside) {
      hadHit = false
      return null
    }
    const W = params.waves
    ndc.set(pointer.x, pointer.y)
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObject(hitMesh, false)[0]
    if (!hit?.uv || !ribbon) {
      hadHit = false
      return null
    }
    // Ribbon uv → wave-grid uv (workflow path only).
    const [u0, u1] = ribbon.inner
    const wu = (hit.uv.x - u0) / (u1 - u0)
    if (wu < 0 || wu > 1) {
      hadHit = false
      return null
    }
    // Clamped: a pointer jumping in from outside the window is not a swipe.
    const speed = Math.min(pointer.speed, 6)
    strokeTo.set(wu, hit.uv.y)
    strokeFrom.copy(hadHit && Math.abs(lastHit.x - wu) < 0.08 ? lastHit : strokeTo)
    lastHit.copy(strokeTo)
    hadHit = true
    surfaceUniforms.uWobbleU.value = hit.uv.x
    // Hover (slow) gives a gentle, capped push; only real speed above that makes a strong wave.
    const strength = (W.hoverImpulse * Math.min(speed / 0.3, 1) + W.impulse * Math.max(0, speed - 0.3)) * delta
    if (strength < 1e-4) return null
    return { from: strokeFrom, to: strokeTo, strength }
  }

  /** Heavily damped spring that bends the ribbon toward fast cursor motion, then springs back. */
  const _q = new Quaternion()
  const _drive = new Vector3()
  function updateWobble(delta: number) {
    if (!ribbon || !mesh) return
    const W = params.waves
    const maxBend = W.wobble * ribbon.length * (ribbon.inner[1] - ribbon.inner[0])
    const fast = Math.max(0, Math.min(pointer.speed, 6) - 0.8)
    if (hadHit && fast > 0) {
      // Screen-space velocity → world → mesh-local direction.
      _right.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(pointer.vx)
      _drive.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(pointer.vy).add(_right)
      mesh.getWorldQuaternion(_q).invert()
      _drive.applyQuaternion(_q)
      if (_drive.lengthSq() > 1e-8) _drive.normalize()
      wobbleGoal.copy(_drive).multiplyScalar(maxBend * Math.min(1, fast / 4))
    } else wobbleGoal.multiplyScalar(Math.exp(-delta * 6))
    const k = W.wobbleStiffness
    const c = 2 * W.wobbleDamping * k
    // Semi-implicit Euler, a few sub-steps: stable for any stiffness in the panel's range.
    const n = 4
    const h = delta / n
    for (let i = 0; i < n; i++) {
      wobbleVel.addScaledVector(wobble, -k * k * h).addScaledVector(wobbleGoal, k * k * h).addScaledVector(wobbleVel, -c * h)
      wobble.addScaledVector(wobbleVel, h)
    }
    if (wobble.length() > maxBend) wobble.setLength(maxBend)
    debug.wobbleMax = Math.max(debug.wobbleMax, wobble.length())
    surfaceUniforms.uWobble.value.copy(wobble)
  }

  const _void = new Color()
  function syncUniforms() {
    const M = params.material
    material.color.set(M.color)
    material.roughness = M.roughness
    material.clearcoat = M.clearcoat
    material.clearcoatRoughness = M.clearcoatRoughness
    material.sheen = M.sheen
    // The reflection gain (envIntensity) exists to lift the Fresnel-weak clearcoat; the sheen lobe is
    // not Fresnel-limited, so it is compensated back to the gain it would have at 1.
    material.sheenColor.set(M.sheenColor).multiplyScalar(M.sheenGain / Math.max(M.envIntensity, 1e-3))
    material.sheenRoughness = M.sheenRoughness
    scene.environmentIntensity = M.envIntensity
    if (env) scene.environment = env.update(params.softboxes, params.floor)

    const S = surfaceUniforms
    const thickness = ribbon?.thickness ?? 0.5
    const W = params.waves
    S.tWaves.value = waves?.texture ?? null
    S.uWaveAmp.value = W.amplitude * thickness
    S.uBump.value = W.bump
    S.uThickness.value = thickness
    // Inflation: folds ease out with (1 − inflate)², thickness follows the pop-taut curve.
    const I = Math.min(1, Math.max(0, params.inflate.value))
    const F = params.inflate
    S.uFoldAmp.value = F.foldAmplitude * thickness * (1 - I) ** 2
    S.uFold.value.set(F.foldScale, F.foldAnisotropy, F.foldSharpness)
    S.uThickScale.value = inflateThickness(I, F)
    const Sh = params.shiver
    S.uShiverAmp.value = Sh.amplitude * thickness
    S.uShiverFreq.value = Sh.frequency
    S.uShiverNormal.value = Sh.normal

    const P = params.post
    S.uGrain.value = P.grain
    S.uDither.value = P.dither ? 1 : 0
    const vu = voidMaterial.uniforms
    _void.set('#020306') // --void, sRGB → linear
    ;(vu.uVoid!.value as Vector3).set(_void.r, _void.g, _void.b)
    vu.uVoidFalloff!.value = P.voidFalloff
    vu.uGrain!.value = P.grain
    vu.uDither!.value = P.dither ? 1 : 0
  }

  function buildPane(f: FolderApi) {
    const P = params
    const inf = f.addFolder({ title: 'Inflate', expanded: true })
    const binding = inf.addBinding(P.inflate, 'value', { label: 'inflate', min: 0, max: 1, step: 0.001 })
    inflateBinding = binding
    binding.on('change', () => {
      // Dragging the slider takes over from a running tween.
      if (!refreshingInflate && inflateTween?.isActive()) inflateTween.kill()
    })
    inf.addButton({ title: 'Play inflate (0 → 1)' }).on('click', playInflate)
    inf.addBinding(P.inflate, 'playDuration', { label: 'play duration (s)', min: 0.3, max: 6, step: 0.05 })
    inf.addBinding(P.inflate, 'foldAmplitude', { label: 'fold amplitude (× thick.)', min: 0, max: 0.6, step: 0.005 })
    inf.addBinding(P.inflate, 'foldScale', { label: 'fold scale', min: 0.2, max: 6, step: 0.01 })
    inf.addBinding(P.inflate, 'foldAnisotropy', { label: 'fold across/along', min: 0.05, max: 1.5, step: 0.01 })
    inf.addBinding(P.inflate, 'foldSharpness', { label: 'crease sharpness', min: 0.5, max: 6, step: 0.05 })
    inf.addBinding(P.inflate, 'thinning', { min: 0, max: 0.7, step: 0.005 })
    inf.addBinding(P.inflate, 'overshoot', { min: 0, max: 0.1, step: 0.001 })
    const sh = f.addFolder({ title: 'Shiver', expanded: false })
    sh.addBinding(P.shiver, 'amplitude', { label: 'amplitude (× thick.)', min: 0, max: 0.03, step: 0.0005 })
    sh.addBinding(P.shiver, 'frequency', { label: 'frequency (cyc/unit)', min: 0.5, max: 20, step: 0.1 })
    sh.addBinding(P.shiver, 'speed', { label: 'speed (≈ Hz)', min: 0, max: 20, step: 0.1 })
    sh.addBinding(P.shiver, 'normal', { label: 'highlight quiver', min: 0, max: 1, step: 0.01 })
    const fr = f.addFolder({ title: 'Framing', expanded: false })
    fr.addBinding(P, 'framing', { options: { 'Framing 1': 0, 'Framing 2': 1, 'Framing 3': 2 } }).on('change', applyFraming)
    P.framings.forEach((fm, i) => {
      const ff = fr.addFolder({ title: `Framing ${i + 1}`, expanded: false })
      ff.addBinding(fm, 'u', { min: 0, max: 1, step: 0.001 }).on('change', applyFraming)
      ff.addBinding(fm.offset, 'x', { min: -12, max: 12, step: 0.01 }).on('change', applyFraming)
      ff.addBinding(fm.offset, 'y', { min: -12, max: 12, step: 0.01 }).on('change', applyFraming)
      ff.addBinding(fm.offset, 'z', { min: -12, max: 12, step: 0.01 }).on('change', applyFraming)
      ff.addBinding(fm, 'fov', { min: 10, max: 70, step: 0.5 }).on('change', applyFraming)
    })
    const sb = f.addFolder({ title: 'Panels (re-bakes env)', expanded: false })
    for (const [name, box] of Object.entries(P.softboxes)) {
      const bf = sb.addFolder({ title: name, expanded: false })
      bf.addBinding(box, 'color')
      bf.addBinding(box, 'intensity', { min: 0, max: 10, step: 0.05 })
      bf.addBinding(box, 'azimuth', { min: -180, max: 180, step: 0.5 })
      bf.addBinding(box, 'elevation', { min: -89, max: 89, step: 0.5 })
      bf.addBinding(box, 'angularWidth', { label: 'width (°)', min: 1, max: 150, step: 0.5 })
      bf.addBinding(box, 'angularHeight', { label: 'height (°)', min: 1, max: 150, step: 0.5 })
      bf.addBinding(box, 'roll', { min: -180, max: 180, step: 0.5 })
      bf.addBinding(box, 'softness', { min: 0, max: 1, step: 0.01 })
    }
    const fl = sb.addFolder({ title: 'floor + wall', expanded: false })
    fl.addBinding(P.floor, 'color')
    fl.addBinding(P.floor, 'intensity', { min: 0, max: 0.3, step: 0.001 })
    fl.addBinding(P.floor, 'wallAzimuth', { min: -180, max: 180, step: 1 })
    const ma = f.addFolder({ title: 'Latex', expanded: false })
    ma.addBinding(P.material, 'color')
    ma.addBinding(P.material, 'roughness', { label: 'base roughness', min: 0, max: 1, step: 0.005 })
    ma.addBinding(P.material, 'clearcoat', { min: 0, max: 1, step: 0.01 })
    ma.addBinding(P.material, 'clearcoatRoughness', { min: 0, max: 0.5, step: 0.005 })
    ma.addBinding(P.material, 'sheen', { min: 0, max: 1, step: 0.01 })
    ma.addBinding(P.material, 'sheenColor')
    ma.addBinding(P.material, 'sheenRoughness', { min: 0, max: 1, step: 0.01 })
    ma.addBinding(P.material, 'sheenGain', { label: 'sheen gain', min: 0, max: 15, step: 0.1 })
    ma.addBinding(P.material, 'envIntensity', { label: 'reflection gain', min: 0, max: 30, step: 0.1 })
    const wv = f.addFolder({ title: 'Liquid surface', expanded: false })
    wv.addBinding(P.waves, 'speed', { label: 'wave speed', min: 0.1, max: 5, step: 0.01 })
    wv.addBinding(P.waves, 'damping', { min: 0, max: 6, step: 0.01 })
    wv.addBinding(P.waves, 'viscosity', { min: 0, max: 0.02, step: 0.0005 })
    wv.addBinding(P.waves, 'restore', { min: 0, max: 3, step: 0.01 })
    wv.addBinding(P.waves, 'impulse', { label: 'impulse (swipe)', min: 0, max: 150, step: 0.5 })
    wv.addBinding(P.waves, 'hoverImpulse', { label: 'impulse (hover)', min: 0, max: 10, step: 0.05 })
    wv.addBinding(P.waves, 'radius', { label: 'impulse radius', min: 0.05, max: 1.5, step: 0.01 })
    wv.addBinding(P.waves, 'amplitude', { label: 'max amplitude (× thick.)', min: 0, max: 0.4, step: 0.005 })
    wv.addBinding(P.waves, 'bump', { label: 'normal strength', min: 0, max: 6, step: 0.05 })
    wv.addBinding(P.waves, 'wobble', { label: 'wobble (× length)', min: 0, max: 0.03, step: 0.0005 })
    wv.addBinding(P.waves, 'wobbleStiffness', { min: 1, max: 30, step: 0.1 })
    wv.addBinding(P.waves, 'wobbleDamping', { min: 0.2, max: 1.5, step: 0.01 })
    const ge = f.addFolder({ title: 'Geometry (rebuilds)', expanded: false })
    ge.addBinding(P.geometry, 'width', { min: 0.3, max: 4, step: 0.01 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'widthToThickness', { min: 1.2, max: 6, step: 0.05 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'superellipse', { min: 2, max: 6, step: 0.05 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'bulge', { label: 'inflation bulge', min: 0, max: 0.5, step: 0.005 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'ringSegments', { min: 16, max: 96, step: 1 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'segments', { min: 200, max: 1600, step: 10 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'depth', { min: 0, max: 0.4, step: 0.005 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'depthWaves', { min: 0.5, max: 6, step: 0.05 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'depthPhase', { min: -3.2, max: 3.2, step: 0.01 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'controlPoints', { min: 6, max: 24, step: 1 }).on('change', rebuildGeometry)
    ge.addBinding(P.geometry, 'smoothing', { min: 0, max: 6, step: 1 }).on('change', rebuildGeometry)
    P.geometry.twists.forEach((tw, i) => {
      ge.addBinding(tw, 'amount', { label: `twist ${i + 1}`, min: -Math.PI, max: Math.PI, step: 0.01 }).on('change', rebuildGeometry)
    })
    const po = f.addFolder({ title: 'Camera + life', expanded: false })
    po.addBinding(P.post, 'exposure', { min: 0.1, max: 4, step: 0.01 })
    po.addBinding(P.post, 'toneMapper', { options: { ACES: 0, AgX: 1 } })
    po.addBinding(P.post, 'grain', { min: 0, max: 0.05, step: 0.001 })
    po.addBinding(P.life, 'parallax', { label: 'parallax (°)', min: 0, max: 5, step: 0.05 })
    po.addBinding(P.life, 'parallaxLag', { min: 0.05, max: 3, step: 0.01 })
    po.addBinding(P.life, 'rotationPeriod', { min: 60, max: 1200, step: 5 })
    po.addBinding(P.life, 'envRotationSpeed', { min: 0, max: 0.1, step: 0.001 })
    po.addBinding(P.life, 'drift', { min: 0, max: 0.5, step: 0.005 })
    f.addButton({ title: 'Copy params as JSON' }).on('click', () => {
      const json = JSON.stringify(P, null, 2)
      console.info(`[ribbon] params:\n${json}`)
      void navigator.clipboard?.writeText(json).catch(() => {})
    })
  }

  const ribbonScene: RibbonScene = {
    id: options.id ?? 'ribbon',
    params,
    setFraming,
    playInflate,
    setInflate,
    setDolly,
    isReady: () => renderedFrames > 0 && (env?.bakes ?? 0) > 0,
    setPresentRect(rect) {
      presentRect = rect && rect.w > 0 && rect.h > 0 ? rect : null
    },
    setFade(amount) {
      fadeMaterial.opacity = Math.min(1, Math.max(0, amount))
    },

    init(ctx) {
      width = ctx.width
      height = ctx.height
      isMobile = ctx.isMobile || ctx.isLowPower
      env = new RibbonEnvironment(ctx.renderer)
      waves = isMobile ? new RibbonWaves(512, 64) : new RibbonWaves(1024, 128)
      surfaceUniforms.uWaveSize.value.set(waves.width, waves.height)
      waves.clear(ctx.renderer)
      rebuildGeometry()
      if (ctx.pane) buildPane(ctx.pane)
      if (import.meta.dev) {
        ;(window as Window & { __ribbon?: () => object }).__ribbon = () => ({
          params,
          debug,
          playInflate,
          bakes: env?.bakes ?? 0,
          vertices: mesh?.geometry.getAttribute('position').count ?? 0,
          triangles: (mesh?.geometry.getIndex()?.count ?? 0) / 3,
          segments: isMobile ? params.geometry.segmentsMobile : params.geometry.segments,
          waveGrid: waves ? `${waves.width}x${waves.height}` : null,
          wavesActive: waves?.active ?? false,
          clearance: Number(clearance.toFixed(3)),
          thickness: ribbon?.thickness,
          thickScale: surfaceUniforms.uThickScale.value,
          length: ribbon?.length,
          wobble: wobble.length(),
          pointerSpeed: pointer.speed,
          onRibbon: hadHit,
        })
      }
    },

    update(_time, frameDelta) {
      // Dev: slow motion for frame-accurate captures of the surface.
      const delta = frameDelta * debug.timeScale
      const frozen = reducedMotion.value
      if (frozen) {
        params.framing = 0
        inflateTween?.kill()
        params.inflate.value = 1
        dolly = 1
      }
      if (!frozen) elapsed += delta
      // Ribbon turns about the framed point (≥ 4 min per turn); the studio turns very slightly.
      pivot.rotation.y = frozen ? 0 : (TAU * elapsed) / Math.max(params.life.rotationPeriod, 60)
      scene.environmentRotation.y = frozen || isMobile ? 0 : params.life.envRotationSpeed * elapsed
      if (!frozen) {
        const k = 1 - Math.exp(-delta / Math.max(params.life.parallaxLag, 0.01))
        const px = pointer.inside ? pointer.x : 0
        const py = pointer.inside ? pointer.y : 0
        parallaxX += (px - parallaxX) * k
        parallaxY += (py - parallaxY) * k
        // The shiver's clock: noise moving through time (smooth, never re-randomised per frame).
        surfaceUniforms.uShiverTime.value += delta * params.shiver.speed * 0.5
      }
      applyFraming()
      camera.updateMatrixWorld()
      pivot.updateMatrixWorld()
      lastStroke = frozen ? null : strokeFromPointer(delta)
      if (!frozen) updateWobble(delta)
      if (!frozen) {
        frame++
        const seed = ((frame * 0.618034) % 1) * 1000
        surfaceUniforms.uFrame.value = frame
        surfaceUniforms.uGrainSeed.value = seed
        voidMaterial.uniforms.uFrame!.value = frame
        voidMaterial.uniforms.uGrainSeed!.value = seed
      }
      syncUniforms()
      stepDelta = frozen ? 0 : delta
    },

    render(r) {
      // 0. First frames: compile every program in parallel (KHR_parallel_shader_compile) instead of a
      //    ~1–2 s blocking link on the first draw; nothing is drawn until they are ready (the opening's
      //    cover is up then). The latex compiles under the tone mapping it is drawn with.
      if (compileState !== 2) {
        if (compileState === 0) {
          compileState = 1
          const prevTm = r.toneMapping
          const jobs = [r.compileAsync(quadScene, quadCamera), r.compileAsync(maskScene, quadCamera), r.compileAsync(fadeScene, quadCamera)]
          r.toneMapping = params.post.toneMapper === 1 ? AgXToneMapping : ACESFilmicToneMapping
          jobs.push(r.compileAsync(scene, camera))
          r.toneMapping = prevTm
          void Promise.all(jobs).then(() => (compileState = 2))
        }
        return
      }
      // 1. The liquid surface: advance the wave field (skipped once the surface has settled).
      if (waves && stepDelta > 0) {
        if (debug.forceWaves && !lastStroke) lastStroke = { from: new Vector2(0.5, 0.25), to: new Vector2(0.5, 0.25), strength: 0.001 }
        waves.step(r, stepDelta, params.waves, extent, lastStroke)
        surfaceUniforms.tWaves.value = waves.texture
      }
      r.setRenderTarget(null)
      // The rectangle rule: the full frame, cover-scaled into the rect (viewport), cut to it (scissor),
      // rounded by a depth mask in the corners.
      const pr = presentRect
      if (pr) {
        const W = width
        const H = height
        const sc = Math.max(pr.w / W, pr.h / H)
        const cx = pr.x + pr.w / 2
        const cy = pr.y + pr.h / 2
        r.setViewport(cx - (W * sc) / 2, H - (cy + (H * sc) / 2), W * sc, H * sc)
        r.setScissor(pr.x, H - (pr.y + pr.h), pr.w, pr.h)
        r.setScissorTest(true)
        r.clearDepth()
        const dpr = r.getPixelRatio()
        ;(maskMaterial.uniforms.uRect!.value as Vector4).set(pr.x * dpr, (H - (pr.y + pr.h)) * dpr, pr.w * dpr, pr.h * dpr)
        maskMaterial.uniforms.uRadius!.value = pr.radius * dpr
        r.render(maskScene, quadCamera)
        voidMaterial.depthTest = true
      } else voidMaterial.depthTest = false
      // 2. The void, then the latex — straight to the (antialiased) canvas: no offscreen HDR target.
      r.render(quadScene, quadCamera)
      if (debug.hideRibbon) return restoreViewport(r)
      // (In rect mode the depth buffer holds the corner mask; the void wrote no depth, so keep it.)
      if (!pr) r.clearDepth()
      const prevTm = r.toneMapping
      const prevExposure = r.toneMappingExposure
      r.toneMapping = params.post.toneMapper === 1 ? AgXToneMapping : ACESFilmicToneMapping
      r.toneMappingExposure = params.post.exposure
      r.render(scene, camera)
      renderedFrames++
      r.toneMapping = prevTm
      r.toneMappingExposure = prevExposure
      if (fadeMaterial.opacity > 0) r.render(fadeScene, quadCamera)
      restoreViewport(r)
    },

    resize(w, h) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      applyFraming()
    },

    setActive() {},

    dispose() {
      inflateTween?.kill()
      inflateTween = null
      inflateBinding = null
      mesh?.geometry.dispose()
      hitMesh?.geometry.dispose()
      material.dispose()
      hitMaterial.dispose()
      voidMaterial.dispose()
      maskMaterial.dispose()
      fadeMaterial.dispose()
      quadGeometry.dispose()
      waves?.dispose()
      env?.dispose()
      scene.clear()
      quadScene.clear()
      mesh = null
      hitMesh = null
      env = null
      waves = null
    },
  }
  function restoreViewport(r: WebGLRenderer) {
    if (!presentRect) return
    r.setScissorTest(false)
    r.setViewport(0, 0, width, height)
  }

  return ribbonScene
}
