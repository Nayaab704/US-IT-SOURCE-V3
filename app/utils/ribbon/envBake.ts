import {
  CubeUVReflectionMapping,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  NearestFilter,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Scene,
  Texture,
  WebGLRenderTarget,
  DataUtils,
  type WebGLRenderer,
} from 'three'
import { bakedEnvUrl, envKey, fetchBakedEnv } from './envKey'
import type { RibbonParams } from './params'

/**
 * The ribbon's studio environment, pre-baked. three's PMREM pre-filter (GGX, 256 samples) stalls the
 * main thread for one to several seconds on first use, on every visit; its result only depends on the
 * softbox / floor params. So the result is shipped as public/ribbon/env-<key>.png (RGBE, lossless,
 * three's cube-UV layout) and decoded on the GPU into the same half-float texture. A missing or
 * outdated file (params changed) simply falls back to the live bake.
 *
 * Regenerate after changing the panels: dev server → `__ribbon().downloadEnv()` in the console →
 * move the downloaded env-<key>.png into public/ribbon/ (delete the old one).
 */
export { envKey }
/** Fetch + GPU-decode the shipped bake for these params. Resolves null when there is none. */
export async function loadBakedEnv(renderer: WebGLRenderer, softboxes: RibbonParams['softboxes'], floor: RibbonParams['floor']): Promise<WebGLRenderTarget | null> {
  const url = bakedEnvUrl(softboxes, floor)
  if (!url) return null
  try {
    const blob = await fetchBakedEnv(url)
    if (!blob) return null
    // No premultiplication / colour management: the alpha channel is the RGBE exponent.
    const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
    const source = new Texture(bitmap)
    source.flipY = false
    source.premultiplyAlpha = false
    source.generateMipmaps = false
    source.minFilter = NearestFilter
    source.magFilter = NearestFilter
    source.colorSpace = NoColorSpace
    source.needsUpdate = true

    const { width, height } = bitmap
    // Same target three's PMREMGenerator returns (half float, linear, no mips, cube-UV mapping).
    const target = new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
      colorSpace: LinearSRGBColorSpace,
    })
    target.texture.mapping = CubeUVReflectionMapping
    target.texture.name = 'PMREM.cubeUv'

    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { tMap: { value: source } },
      vertexShader: /* glsl */ `
        in vec3 position;
        void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      // Texel-exact: pixel (x, y) of the target reads texel (x, y) of the PNG — rows were written in
      // the render target's own (bottom-up) order, and the bitmap is uploaded without flipping.
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D tMap;
        out vec4 outColor;
        void main() {
          vec4 c = texelFetch(tMap, ivec2(gl_FragCoord.xy), 0);
          outColor = vec4(c.rgb * exp2(c.a * 255.0 - 128.0), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new Mesh(new PlaneGeometry(2, 2), material)
    const scene = new Scene().add(quad)
    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(target)
    renderer.render(scene, new OrthographicCamera())
    renderer.setRenderTarget(prev)
    quad.geometry.dispose()
    material.dispose()
    source.dispose()
    bitmap.close()
    return target
  } catch (err) {
    console.warn('[ribbon] baked environment unavailable, baking live', err)
    return null
  }
}

/** Dev: the current (live-baked) environment as a PNG file to ship (see the header comment). */
export async function encodeEnvPng(renderer: WebGLRenderer, target: WebGLRenderTarget): Promise<Blob> {
  const { width, height } = target
  const half = new Uint16Array(width * height * 4)
  renderer.readRenderTargetPixels(target, 0, 0, width, height, half)
  // RGBE: a shared exponent per pixel in alpha, 8-bit mantissas (relative precision ~0.4 %).
  const rgbe = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const r = DataUtils.fromHalfFloat(half[i * 4]!)
    const g = DataUtils.fromHalfFloat(half[i * 4 + 1]!)
    const b = DataUtils.fromHalfFloat(half[i * 4 + 2]!)
    const m = Math.max(r, g, b)
    if (!(m > 1e-20)) continue // black (alpha 0 → exponent −128: decodes to 0)
    const e = Math.ceil(Math.log2(m))
    const s = 255 / 2 ** e
    rgbe[i * 4] = Math.min(255, Math.round(Math.max(0, r) * s))
    rgbe[i * 4 + 1] = Math.min(255, Math.round(Math.max(0, g) * s))
    rgbe[i * 4 + 2] = Math.min(255, Math.round(Math.max(0, b) * s))
    rgbe[i * 4 + 3] = e + 128
  }
  return encodePng(rgbe, width, height)
}

/** Minimal RGBA8 PNG encoder (no premultiplication, unlike a canvas): filter 0 rows + zlib. */
async function encodePng(rgba: Uint8Array, width: number, height: number): Promise<Blob> {
  const raw = new Uint8Array((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  const zlib = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer())
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (bytes: Uint8Array) => {
    let c = 0xffffffff
    for (const b of bytes) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length)
    const v = new DataView(out.buffer)
    v.setUint32(0, data.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(data, 8)
    v.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)))
    return out
  }
  const ihdr = new Uint8Array(13)
  const hv = new DataView(ihdr.buffer)
  hv.setUint32(0, width)
  hv.setUint32(4, height)
  ihdr.set([8, 6, 0, 0, 0], 8) // 8-bit, RGBA, deflate, no filter method, no interlace
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  return new Blob([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib), chunk('IEND', new Uint8Array())], { type: 'image/png' })
}
