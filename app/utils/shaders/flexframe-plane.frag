// The flexible frame's surface (S1 + S3). Front: live footage under a blue duotone (+ fine grain) →
// a soft diagonal colour band sweeps across, and inside / just behind it the footage cross-dissolves
// into the INSIDE world (rendered into a full-viewport target on the same stage and seen through the
// frame like a window). Back: flat warm white.
// Rounded corners from a rounded-rect SDF in the plane's own (undeformed) pixels.
uniform vec2 uSize;
uniform float uRadius;
uniform sampler2D tVideo;          // footage (VideoTexture)
uniform sampler2D tPoster;         // footage poster (before the video has a frame / reduced motion)
uniform float uVideoReady;
uniform float uMediaAspect;
uniform sampler2D tWorld;     // INSIDE world (display-referred sRGB values, full viewport)
uniform float uWorldReady;
uniform float uWorldScreen;  // 1 = sampled in screen space (a window), 0 = cover-fitted to the frame
uniform float uWorldAspect;
uniform vec2 uResolution;    // drawing-buffer px
uniform vec3 uDuoDark;   // linear
uniform vec3 uDuoLight;
uniform vec3 uBandA;
uniform vec3 uBandB;
uniform vec3 uBack;
uniform float uWipe;     // 0 = all footage, 1 = all world
uniform float uBandWidth;
uniform float uBandSoft;
uniform float uDissolve; // cross-dissolve width behind the band (fraction of the diagonal)
uniform float uGrain;
uniform float uGrainTime;

varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vView;

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Cover-fit a texture of the given aspect to the frame's current aspect.
vec2 coverUv(vec2 uv, float aspect) {
  float frame = uSize.x / max(uSize.y, 1.0);
  vec2 s = frame > aspect ? vec2(1.0, aspect / frame) : vec2(frame / aspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  float d = sdRoundRect(vLocal, uSize * 0.5, uRadius);
  float alpha = 1.0 - smoothstep(-0.75, 0.75, d);
  if (alpha <= 0.0) discard;

  vec3 col;
  if (gl_FrontFacing) {
    // Footage → duotone (perceptual luminance) + fine animated grain: reads as live film.
    vec2 fuv = coverUv(vUv, uMediaAspect);
    vec3 src = mix(texture2D(tPoster, fuv).rgb, texture2D(tVideo, fuv).rgb, uVideoReady);
    float l = pow(dot(src, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
    l += (hash(floor(gl_FragCoord.xy) + fract(uGrainTime) * 517.0) - 0.5) * uGrain;
    vec3 footage = mix(uDuoDark, uDuoLight, smoothstep(0.06, 0.9, l));

    vec2 wuv = mix(coverUv(vUv, uWorldAspect), gl_FragCoord.xy / uResolution, uWorldScreen);
    vec3 ws = texture2D(tWorld, wuv).rgb;
    // sRGB → linear (the colour-space chunk below encodes it back).
    vec3 world = mix(ws / 12.92, pow((ws + 0.055) / 1.055, vec3(2.4)), step(0.04045, ws));
    world = mix(vec3(0.0035, 0.0039, 0.0048), world, uWorldReady);

    // The sweep: leading band edge travels top-left → bottom-right; behind it, footage dissolves into
    // the world (inside the band and a little after it).
    float dd = (vUv.x + (1.0 - vUv.y) * 0.45) / 1.45;
    float front = mix(-uBandSoft, 1.0 + uBandWidth + uDissolve + uBandSoft, uWipe);
    float reached = smoothstep(front + uBandSoft, front - uBandSoft, dd);
    float bandEnd = front - uBandWidth;
    float pastBand = smoothstep(bandEnd + uBandSoft, bandEnd - uBandSoft, dd);
    float dissolve = clamp((front - dd) / max(uBandWidth + uDissolve, 1e-3), 0.0, 1.0);
    col = mix(footage, world, smoothstep(0.2, 1.0, dissolve) * reached);
    vec3 band = mix(uBandB, uBandA, clamp((front - dd) / max(uBandWidth, 1e-3), 0.0, 1.0));
    col = mix(col, band, reached * (1.0 - pastBand) * 0.82);
  } else {
    col = uBack;
  }
  // Faint paper shading: 1.0 when flat to the viewer, a touch darker / lighter where it bends.
  vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
  vec3 L = normalize(vec3(-0.3, 0.45, 1.0));
  col *= 1.0 + 0.35 * (abs(dot(n, L)) - L.z);

  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
