// Circle-of-confusion pass for the pieces (override material on the BatchedMeshes).
// Blur amount = max of:
//  • depth: 0 at the focus plane (the assembled logotype) and in front of it, ramping to 1 between
//    uDofStart and uDofEnd units behind it;
//  • radial (hero exit push): grows with lateral distance from the O's counter, scaled by the push —
//    the O stays sharp while the letters around it soften as they slide out of frame.

#include <common>
#include <batching_pars_vertex>

uniform float uFocusDistance;
uniform float uDofStart;
uniform float uDofEnd;
uniform vec2 uRadialCenter;
uniform float uRadialAmount;
uniform float uRadialStart;
uniform float uRadialEnd;

varying float vCoc;

void main() {
  #include <batching_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  float behind = -mvPosition.z - uFocusDistance;
  float coc = smoothstep(uDofStart, uDofEnd, behind);
  if (uRadialAmount > 0.0) {
    vec4 worldPosition = modelMatrix * batchingMatrix * vec4(transformed, 1.0);
    float lateral = length(worldPosition.xy - uRadialCenter);
    coc = max(coc, uRadialAmount * smoothstep(uRadialStart, uRadialEnd, lateral));
  }
  vCoc = coc;
}
