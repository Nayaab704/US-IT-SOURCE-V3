// Inside (S3): the floor — gentle dunes, flat along the line's path (baked on the CPU, world.ts).
varying vec3 vWorld;
varying vec3 vNormalW;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
