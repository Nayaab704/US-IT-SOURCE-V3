// Inside (S3): the white line — on the floor (in the dunes' flat corridor), then up the beam.
attribute float aArc;
varying float vArc;
varying vec3 vWorld;
varying vec3 vNormalW;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vArc = aArc;
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
