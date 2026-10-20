// Inside (S3): a crystal shard (instanced octahedra / elongated tetrahedra, flat facets).
uniform float uSize;
uniform float uBokehNear;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vSeed;
varying float vKeep;

#include "inside-shard.glsl"

void main() {
  float e = shardAssembly();
  vec3 c = shardCenter(e);
  // Tumbling in the cloud; aligned (no rotation) once in the lattice.
  float angle = (uTime * aSpin.w + aMeta.y * 6.2831853) * (1.0 - e);
  vec3 axis = normalize(aSpin.xyz);
  vec3 p = rotateAxis(position * uSize * aMeta.x, axis, angle);
  vNormalW = rotateAxis(normal, axis, angle);
  vec3 w = c + p;
  vWorld = w;
  vSeed = aMeta.y;
  // Near the camera the crystal dissolves into its bokeh disc.
  vKeep = smoothstep(uBokehNear * 0.5, uBokehNear * 0.75, length(cameraPosition - c));
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
