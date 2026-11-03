#version 120 

// (way more precision than a float can actually store...)
#define LOG_2 0.6931471805599453094172321214581765680755001

// start using these antialiasing values once you start (c)
#define AA 2
const int TOTAL_SAMPLES = AA * AA;

uniform vec2 c;
uniform int MAX_ITERS;
uniform vec2 windowSizePixels;
uniform vec2 camCenterWorld;
uniform float camWorldUnitsPerPixel;

// reprojection (1d) may require extra uniforms here...

uniform int TRUE_MAX_ITERS;
uniform vec2 previousFrameLocation;
uniform float previousFrameScale;
uniform sampler2D previousRender;
uniform vec2 previousC;

// Use this to get a color from your smoothed Julia set escape times.
vec4 colorTime(float t) {
    return vec4(0.5 + 0.5 * cos(  0.1 * (t) + vec3(0.f, 0.35, 0.7)), 1.f);
}

struct EscapeTime {
    float iters;
    bool isInf;
};

// Escape time of iterating z^2 + c
EscapeTime escapeTimeSmooth(vec2 z) {
    EscapeTime esc;
    for (int n = 1; n<= MAX_ITERS; n++) {
        vec2 zPrime;
        zPrime.x = z.x*z.x;
        zPrime.y = z.y*z.y;
        if ((z.x*z.x) + (z.y*z.y) > 4) {
            esc.iters = n + 1 - log(log(sqrt(z.x*z.x+z.y*z.y)))/LOG_2;
            esc.isInf = false;
            return esc;
        }
        z.y = (2.0 * z.x * z.y) + c.y;
        z.x = zPrime.x - zPrime.y + c.x;
         
    }
    esc.iters = MAX_ITERS;
    esc.isInf = true;
    return esc;
}


vec2 windowToWorld(vec2 windowCoords) {
    vec2 cameraCenterInitial = windowSizePixels / 2 * camWorldUnitsPerPixel;
    vec2 offsetWorld = camCenterWorld - cameraCenterInitial;
    return windowCoords * camWorldUnitsPerPixel + offsetWorld;
}

// For reprojection
vec2 worldToOldWindow(vec2 worldCoords) {   
    vec2 cameraCenterInitial = windowSizePixels / 2 * previousFrameScale;
    vec2 offsetWorld = previousFrameLocation - cameraCenterInitial;
    return (worldCoords - offsetWorld) / previousFrameScale;
}

// For SSAA
// Given (dx, dy) in [0, AA)^2, suppose the unit square [0, 1)^2 was cut up into AA equal
// partitions along each dimension. delta((dx, dy)) returns the center of the sub-square
// which is in the dy'th row and dx'th column (both 0-indexed).
vec2 delta(vec2 dxy) {
    //each square is 1/AA
    //dx / AA -> dx+1/AA
    // dx/AA + dx+1/AA / 2
    // (2dx+1)/AA / 2
    // dx+0.5 / AA
    return vec2((dxy.x + 0.5) / AA, (dxy.y + 0.5) / AA);
}


void main() {
    vec3 color = vec3(0,0,0);
    float range = AA/2;
    for (float i = 0; i<AA; i++) {
        for (float j = 0; j<AA; j++) {
            vec3 interColor;
            vec2 pixel = gl_FragCoord.xy + delta(vec2(i, j));
            vec2 pixelWorld = windowToWorld(pixel);
            EscapeTime esc = escapeTimeSmooth(pixelWorld);

            vec2 previousPixel = worldToOldWindow(pixelWorld);
            vec2 previousCamera1 = worldToOldWindow(previousFrameLocation) - windowSizePixels/2;
            vec2 previousCamera2 = worldToOldWindow(previousFrameLocation) + windowSizePixels/2;
            if (previousPixel.x >= 0.0 && previousPixel.x <= windowSizePixels.x && previousPixel.y >= 0.0 && previousPixel.y <= windowSizePixels.y) {
                vec3 previousColor = texture2D(previousRender, previousPixel / windowSizePixels).xyz;
                float alpha;
                //exponentially moving average with the old buffer value and the normal calculation
                if (previousC != c) {
                    alpha = 1;
                } else {
                    alpha = esc.iters / TRUE_MAX_ITERS;
                }
                if (esc.isInf == true) {
                    interColor = vec3(0,0,0);
                } else {
                    interColor = colorTime(esc.iters).xyz;
                }
                color += (alpha * interColor) + ((1 - alpha) * previousColor);
            } else {
                if (esc.isInf == true) {
                    interColor = vec3(0,0,0);
                } else {
                    interColor = colorTime(esc.iters).xyz;
                }
                color += interColor;
            }
            
        }
    }
    color /= TOTAL_SAMPLES;

    gl_FragColor = vec4(color.xyz, 1);

    
    //gl_FragColor = colorTime(50.0f);
}
