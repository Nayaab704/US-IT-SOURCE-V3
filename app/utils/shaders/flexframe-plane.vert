// The flexible frame: a unit plane placed and bent in pixels. At uFlexS = 0 (rest) it is perfectly
// flat; mid-move it turns about its vertical axis, skews into a trapezoid, curls along its leading
// (right) edge like paper and carries a soft travelling wave.
uniform vec3 uCenter;   // world px
uniform vec2 uSize;     // px
uniform float uRot;     // radians about the vertical axis
uniform vec2 uTilt;     // hover tilt (x: about X, y: about Y), radians
uniform float uSkew;
uniform float uCurl;    // curled length along the leading edge (px)
uniform float uCurlR;   // curl radius (px)
uniform float uWave;    // wave amplitude (px)
uniform float uWaveK;   // waves across the width
uniform float uTime;
uniform sampler2D tRipple;
uniform float uRippleAmp;

varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vView;

vec3 rotY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
vec3 rotX(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

void main() {
  vUv = uv;
  vec2 local = position.xy * uSize;
  vLocal = local;
  float x = local.x;
  float y = local.y * (1.0 + uSkew * (local.x / uSize.x));
  float z = uWave * sin((local.x / uSize.x) * uWaveK * 6.2831853 - uTime * 2.2);
  // Hover ripple (tiny), from the wave simulation.
  float rh = texture2D(tRipple, uv).r;
  z += uRippleAmp * rh / sqrt(1.0 + rh * rh);
  // Cylindrical curl of the leading edge toward the viewer (past 90° it shows the white back).
  float x0 = uSize.x * 0.5 - uCurl;
  if (uCurl > 0.5 && x > x0) {
    float th = (x - x0) / uCurlR;
    x = x0 + uCurlR * sin(th);
    z += uCurlR * (1.0 - cos(th));
  }
  vec3 p = rotX(rotY(vec3(x, y, z), uRot + uTilt.y), uTilt.x) + uCenter;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vView = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
