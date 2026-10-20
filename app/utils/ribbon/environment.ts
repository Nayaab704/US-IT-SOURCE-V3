import {
  BackSide,
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'
import type { RibbonParams, Softbox } from './params'

/**
 * Procedural studio: big soft emissive panels plus a very faint floor + wall, baked into a
 * prefiltered (PMREM) environment. The ribbon is lit ONLY by reflections of these. The floor keeps
 * the black body's faces and silhouette readable as a solid object (it never melts into the void).
 * Rebaked only when a softbox changes — never per frame (rotation is done via
 * scene.environmentRotation, which is free).
 */
const PANEL_DISTANCE = 10

export class RibbonEnvironment {
  private target: WebGLRenderTarget | null = null
  private readonly scene = new Scene()
  private readonly geometry = new PlaneGeometry(1, 1)
  private readonly panels = new Map<string, Mesh<PlaneGeometry, ShaderMaterial>>()
  private readonly room = new Mesh(new SphereGeometry(40, 48, 24), roomMaterial())
  private key = ''
  /** How many times the environment has been baked (for verification). */
  bakes = 0

  constructor(private readonly renderer: WebGLRenderer) {
    this.scene.background = new Color(0x000000)
    this.scene.add(this.room)
  }

  /** Returns the current environment texture, rebaking first if any softbox changed. */
  update(softboxes: RibbonParams['softboxes'], floor: RibbonParams['floor']) {
    const key = JSON.stringify([softboxes, floor])
    if (key !== this.key || !this.target) {
      this.key = key
      for (const [name, box] of Object.entries(softboxes)) this.place(name, box)
      const ru = this.room.material.uniforms
      ;(ru.uColor!.value as Color).set(floor.color).multiplyScalar(floor.intensity)
      const wa = (floor.wallAzimuth * Math.PI) / 180
      ;(ru.uWall!.value as Vector3).set(Math.sin(wa), 0, Math.cos(wa))
      const pmrem = new PMREMGenerator(this.renderer)
      const next = pmrem.fromScene(this.scene, 0, 0.1, 100)
      pmrem.dispose()
      this.target?.dispose()
      this.target = next
      this.bakes++
    }
    return this.target.texture
  }

  private place(name: string, box: Softbox) {
    let panel = this.panels.get(name)
    if (!panel) {
      panel = new Mesh(this.geometry, softboxMaterial())
      this.panels.set(name, panel)
      this.scene.add(panel)
    }
    const az = (box.azimuth * Math.PI) / 180
    const el = (box.elevation * Math.PI) / 180
    panel.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(PANEL_DISTANCE)
    panel.lookAt(0, 0, 0)
    panel.rotateZ((box.roll * Math.PI) / 180)
    // Angular size → physical size at the panel's distance.
    const span = (deg: number) => 2 * PANEL_DISTANCE * Math.tan((Math.min(deg, 160) * Math.PI) / 360)
    panel.scale.set(span(box.angularWidth), span(box.angularHeight), 1)
    // HDR emission: colour × intensity (values > 1 survive in the half-float environment).
    const u = panel.material.uniforms
    ;(u.uColor!.value as Color).set(box.color).multiplyScalar(box.intensity)
    u.uSoftness!.value = box.softness
  }

  dispose() {
    this.target?.dispose()
    this.target = null
    this.geometry.dispose()
    this.room.geometry.dispose()
    this.room.material.dispose()
    for (const p of this.panels.values()) p.material.dispose()
    this.panels.clear()
    this.scene.clear()
  }
}

/**
 * A softbox's emission: full in the middle, falling off smoothly to its edges — so its reflection
 * is a soft gradient, not a hard-edged rectangle. HDR colour (half-float environment).
 */
function softboxMaterial() {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color() }, uSoftness: { value: 0.35 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uSoftness;
      varying vec2 vUv;
      void main() {
        vec2 e = min(vUv, 1.0 - vUv);              // distance to the nearest edge, 0–0.5
        float s = max(uSoftness, 1e-3) * 0.5;
        float falloff = smoothstep(0.0, s, e.x) * smoothstep(0.0, s, e.y);
        falloff *= falloff; // gaussian-like shoulder: broad sheens with no visible panel edge
        gl_FragColor = vec4(uColor * falloff, 1.0);
      }
    `,
    side: DoubleSide,
    toneMapped: false,
  })
}

/**
 * The room: a faint floor (below the horizon) and one wall, a whisper above black everywhere else.
 * Only grazing reflections pick it up (Fresnel), which is exactly what outlines the black body.
 */
function roomMaterial() {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color() }, uWall: { value: new Vector3(0, 0, 1) } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uWall;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float floorW = smoothstep(0.15, -0.35, d.y);
        float wallW = smoothstep(0.2, 0.85, dot(d, uWall)) * smoothstep(-0.2, 0.3, d.y) * 0.7;
        gl_FragColor = vec4(uColor * (0.25 + floorW + wallW), 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false,
    toneMapped: false,
  })
}
