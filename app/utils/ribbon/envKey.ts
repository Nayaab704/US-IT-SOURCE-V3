import media from '#build/media-manifest.mjs'
import type { RibbonParams } from './params'

/**
 * Name of the shipped, pre-baked ribbon environment for the current softbox / floor params (see
 * envBake.ts). Kept free of three.js so the page can preload the file without loading the scene.
 */
const VERSION = 'v1-256'

/** Stable key of the inputs that shape the environment (FNV-1a over their JSON). */
export function envKey(softboxes: RibbonParams['softboxes'], floor: RibbonParams['floor']) {
  const s = VERSION + JSON.stringify([softboxes, floor])
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

const pending = new Map<string, Promise<Blob | null>>()

/** The bake's bytes, fetched once: the page starts it early, the scene picks up the same request. */
export function fetchBakedEnv(url: string) {
  let p = pending.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
    pending.set(url, p)
  }
  return p
}

/** URL of the shipped bake for these params, or null when public/ribbon/ has none (live bake). */
export function bakedEnvUrl(softboxes: RibbonParams['softboxes'], floor: RibbonParams['floor']) {
  const name = `env-${envKey(softboxes, floor)}.png`
  return media.ribbonEnv.includes(name) ? `/ribbon/${name}` : null
}
