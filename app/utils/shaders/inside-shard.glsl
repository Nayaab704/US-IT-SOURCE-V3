// Inside (S3): where a shard is. Cloud position (drifting) → its lattice slot, along a spiral around
// the beam axis, staggered per shard by uAssemble. Shared by the crystals and their bokeh discs.
attribute vec3 aCloud;
attribute vec3 aSlot;     // relative to the beam axis (x, y, z)
attribute vec4 aSpin;     // xyz = rotation axis, w = angular speed
attribute vec3 aMeta;     // x = size, y = seed (0–1), z = stagger (0–1)

uniform float uTime;
uniform float uAssemble;
uniform float uLatticeSpin;
uniform vec3 uBeamBase;

float easeInOut3(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
}

/** Per-shard assembly progress (0 = cloud, 1 = in its slot), staggered by distance to the beam. */
float shardAssembly() {
  float a = clamp((uAssemble - aMeta.z * 0.45) / 0.55, 0.0, 1.0);
  return easeInOut3(a);
}

vec3 rotateAxis(vec3 p, vec3 axis, float angle) {
  float c = cos(angle), s = sin(angle);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}

vec3 shardCenter(float e) {
  float seed = aMeta.y;
  vec3 cloud = aCloud + vec3(sin(uTime * 0.05 + seed * 6.28) * 3.0, sin(uTime * 0.07 + seed * 3.1) * 1.6, cos(uTime * 0.04 + seed * 5.3) * 3.0);
  // The lattice turns slowly about the beam axis.
  float ls = uLatticeSpin * uTime;
  vec3 slot = vec3(aSlot.x * cos(ls) - aSlot.z * sin(ls), aSlot.y, aSlot.x * sin(ls) + aSlot.z * cos(ls));
  vec2 c0 = cloud.xz - uBeamBase.xz;
  vec2 c1 = slot.xz;
  float r = mix(length(c0), length(c1), e);
  float a0 = atan(c0.y, c0.x);
  float a1 = atan(c1.y, c1.x);
  // Wind once more around the beam on the way in (a spiral), ending exactly at the slot's angle.
  float da = a1 - a0;
  da -= 6.2831853 * floor(da / 6.2831853 + 0.5);
  float a = a0 + (da + 6.2831853) * e;
  return vec3(uBeamBase.x + cos(a) * r, mix(cloud.y, uBeamBase.y + slot.y, e), uBeamBase.z + sin(a) * r);
}
