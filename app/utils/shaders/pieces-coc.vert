// Circle-of-confusion pass for the pieces (override material on the BatchedMeshes).
// Blur amount from real view depth: 0 at the focus plane (the assembled logotype) and in front of it,
// ramping to 1 between uDofStart and uDofEnd units behind it.

#include <common>
#include <batching_pars_vertex>

uniform float uFocusDistance;
uniform float uDofStart;
uniform float uDofEnd;

varying float vCoc;

void main() {
  #include <batching_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  float behind = -mvPosition.z - uFocusDistance;
  vCoc = smoothstep(uDofStart, uDofEnd, behind);
}
