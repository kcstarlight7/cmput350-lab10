#version 120 

uniform sampler2D toCopy;

void main() {
    // TODO (reprojection)
    gl_FragColor = texture2D(toCopy, gl_TexCoord[0].xy);
}
