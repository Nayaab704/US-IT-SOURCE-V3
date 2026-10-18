// Every .glsl/.frag/.vert in this folder, bundled as raw strings.
const sources = import.meta.glob('./*.{glsl,frag,vert}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// `#include "name.glsl"` — quotes, so three.js' own `#include <chunk>` lines pass through untouched.
const INCLUDE_RE = /^[ \t]*#include\s+"([\w.-]+)"[ \t]*$/gm

function resolve(name: string, stack: string[]): string {
  const src = sources[`./${name}`]
  if (src === undefined) throw new Error(`[shaders] unknown shader "${name}"`)
  if (stack.includes(name)) throw new Error(`[shaders] include cycle: ${[...stack, name].join(' → ')}`)
  return src.replace(INCLUDE_RE, (_, inc: string) => resolve(inc, [...stack, name]))
}

/** Load a shader from app/utils/shaders with its `#include "…"` chunks inlined. */
export function loadShader(name: string): string {
  return resolve(name, [])
}
