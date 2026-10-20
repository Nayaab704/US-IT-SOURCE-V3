// The line: a tube along the path. aArc = arc length (px) of the vertex's ring, for the snake clip.
attribute float aArc;
varying float vArc;
varying vec3 vNormalV;

void main() {
  vArc = aArc;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
