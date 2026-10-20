// Inside (S3): near shards as soft bokeh discs (camera-facing, additive). Same instance data as the
// crystals; collapsed (not drawn) beyond the near range.
uniform float uSize;
uniform float uBokehNear;
varying vec2 vLocal;
varying float vAlpha;

#include "inside-shard.glsl"

void main() {
  float e = shardAssembly();
  vec3 c = shardCenter(e);
  float dist = length(cameraPosition - c);
  float near = 1.0 - smoothstep(uBokehNear * 0.5, uBokehNear * 0.75, dist);
  if (near <= 0.001) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec4 mv = viewMatrix * vec4(c, 1.0);
  // Bigger (more out of focus) the closer it is.
  float r = uSize * aMeta.x * (2.5 + 3.0 * near);
  mv.xy += position.xy * r;
  vLocal = position.xy * 2.0;
  vAlpha = near * (0.5 + 0.5 * aMeta.y);
  gl_Position = projectionMatrix * mv;
}
