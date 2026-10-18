// Seam light sweep (override material on the BatchedMeshes, additive over the sharp pass).
// Passes world x (for the travelling band) and how far the surface turns away from the camera:
// caps face the viewer (≈ 0); bevels, seams and side walls turn away (→ 1) — that's where light catches.

#include <common>
#include <batching_pars_vertex>

varying float vWorldX;
varying float vEdge;

void main() {
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vec4 worldPosition = modelMatrix * batchingMatrix * vec4(transformed, 1.0);
  vWorldX = worldPosition.x;
  vEdge = 1.0 - abs(normalize(transformedNormal).z);
}
