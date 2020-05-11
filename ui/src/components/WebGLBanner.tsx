import React, { useEffect, useRef } from 'react';

import logo from './WebGLBanner.png';
import './WebGLBanner.scss';

interface BannerProps {
  onNotDisplayable: () => void;
}

export default function Banner({onNotDisplayable}: BannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(null)

  useEffect((): () => void => {
    animate(canvasRef, animationRef, onNotDisplayable)

    // The ref value 'animationRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'animationRef.current' to a variable inside the effect, and use that variable in the cleanup function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { animationRef.current && cancelAnimationFrame(animationRef.current) }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={canvasRef} className="Banner"/>
}

function animate(
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  animationRef: React.MutableRefObject<number | null>,
  notDisplayable: () => void
): void {
  const image = new Image();
  image.src = logo;
  image.onload = () => {
    render(canvasRef, animationRef, image, notDisplayable);
  }
}

function render(
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  animationRef: React.MutableRefObject<number | null>,
  image: HTMLImageElement,
  notDisplayable: () => void
): void {
  const canvas = canvasRef.current
  // Component has been unmounted already
  if (!canvas) return

  canvas.setAttribute('width', image.width.toString());
  canvas.setAttribute('height', image.height.toString());

  let gl = canvas.getContext('webgl');
  if (!gl) {
    console.log("WebGL unavailable")
    notDisplayable()
    return
  }

  let program: WebGLProgram
  try {
    program = createProgram(
      gl,
      createShader(gl, gl.VERTEX_SHADER, vertexShaderSource),
      createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource),
    );
  } catch(err) {
    console.log(err)
    notDisplayable()
    return
  }

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const canvasResolutionUniformLocation = gl.getUniformLocation(program, 'u_vertexResolution');
  const imageResolutionUniformLocation = gl.getUniformLocation(program, 'u_imageResolution');
  const timeUniformLocation = gl.getUniformLocation(program, 'iTime');

  // Rectangle with the same size as the image in positionBuffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  setRectangle(gl, 0, 0, image.width, image.height);

  // Upload image into texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  animationRef.current = requestAnimationFrame(drawScene);

  function drawScene(now: number): void {
    now *= 0.001;
    gl = gl as WebGLRenderingContext

    gl.viewport(0, 0, image.width, image.height);
    gl.clearColor(0.149, 0.145, 0.141, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Bind attributes to buffers
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(canvasResolutionUniformLocation, image.width, image.height);
    gl.uniform2f(imageResolutionUniformLocation, image.width, image.height);
    gl.uniform1f(timeUniformLocation, now);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animationRef.current = requestAnimationFrame(drawScene);
  }

}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    let shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create shader")
    }
    shader = shader as WebGLShader

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    throw new Error("Failed to get shader params")
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Failed to create program")
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  throw new Error("Failed to get program parameter")
}

function setRectangle(gl: WebGLRenderingContext, x: number, y: number, width: number, height: number): void {
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}

const vertexShaderSource = `
attribute vec2 a_position;
uniform vec2 u_vertexResolution;

attribute vec2 a_texCoord;

void main() {
  vec2 clipSpace = (a_position / u_vertexResolution)*2.0-1.0;
  gl_Position = vec4(clipSpace*vec2(1, -1), 0, 1);
}
`;

const fragmentShaderSource = `
precision mediump float;

// Copied from https://www.shadertoy.com/view/ldXGW4

uniform vec2 u_imageResolution;
uniform float     iTime;               // shader playback time (in seconds)
uniform sampler2D u_image;

// change these values to 0.0 to turn off individual effects
float vertJerkOpt = 1.0;
float vertMovementOpt = 1.0;
float bottomStaticOpt = 1.0;
float scalinesOpt = 1.0;
float rgbOffsetOpt = 0.3; // down from 1.0
float horzFuzzOpt = 0.5; // down from 1.0

// Noise generation functions borrowed from:
// https://github.com/ashima/webgl-noise/blob/master/src/noise2D.glsl

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
  {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float staticV(vec2 uv) {
    float staticHeight = snoise(vec2(9.0,iTime*1.2+3.0))*0.3+5.0;
    float staticAmount = snoise(vec2(1.0,iTime*1.2-6.0))*0.1+0.3;
    float staticStrength = snoise(vec2(-9.75,iTime*0.6-3.0))*2.0+2.0;
	return (1.0-step(snoise(vec2(5.0*pow(iTime,2.0)+pow(uv.x*7.0,1.2),pow((mod(iTime,100.0)+100.0)*uv.y*0.3+3.0,staticHeight))),staticAmount))*staticStrength;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv =  fragCoord.xy/u_imageResolution.xy;

	float jerkOffset = (1.0-step(snoise(vec2(iTime*1.3,5.0)),0.8))*0.05;

	float fuzzOffset = snoise(vec2(iTime*15.0,uv.y*80.0))*0.003;
	float largeFuzzOffset = snoise(vec2(iTime*1.0,uv.y*25.0))*0.004;

    float vertMovementOn = (1.0-step(snoise(vec2(iTime*0.2,8.0)),0.4))*vertMovementOpt;
    float vertJerk = (1.0-step(snoise(vec2(iTime*1.5,5.0)),0.6))*vertJerkOpt;
    float vertJerk2 = (1.0-step(snoise(vec2(iTime*5.5,5.0)),0.2))*vertJerkOpt;
    float yOffset = abs(sin(iTime)*4.0)*vertMovementOn+vertJerk*vertJerk2*0.3;
    float y = mod(uv.y+yOffset,1.0);


	float xOffset = (fuzzOffset + largeFuzzOffset) * horzFuzzOpt;

    float staticVal = 0.0;

    for (float y = -1.0; y <= 1.0; y += 1.0) {
        float maxDist = 5.0/200.0;
        float dist = y/200.0;
    	staticVal += staticV(vec2(uv.x,uv.y+dist))*(maxDist-abs(dist))*1.5;
    }

    staticVal *= bottomStaticOpt;

	float red 	=   texture2D(	u_image, 	vec2(uv.x + xOffset -0.01*rgbOffsetOpt,y)).r+staticVal;
	float green = 	texture2D(	u_image, 	vec2(uv.x + xOffset,	  y)).g+staticVal;
	float blue 	=	texture2D(	u_image, 	vec2(uv.x + xOffset +0.01*rgbOffsetOpt,y)).b+staticVal;

	vec3 color = vec3(red,green,blue);
	float scanline = sin(uv.y*800.0)*0.04*scalinesOpt;
	color -= scanline;

	fragColor = vec4(color,1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy*vec2(1, -1));
}
`;
