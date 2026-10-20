// Inside (S3): the beam — an open cylinder (core and halo share this shader).
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vY;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vY = uv.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}
