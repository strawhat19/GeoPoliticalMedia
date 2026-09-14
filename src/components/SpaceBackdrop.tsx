import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

type SpaceBackdropProps = {
  compact: boolean;
};

const starVertex = `
  attribute float pointSize;
  attribute float brightness;
  attribute vec3 starColor;
  uniform float pixelRatio;
  varying float vBrightness;
  varying vec3 vColor;
  void main() {
    vBrightness = brightness;
    vColor = starColor;
    // A distant, camera-relative field stays composed as the Earth changes its
    // view offset. The far depth still lets the planet cover every star.
    gl_Position = vec4(position.xy, 0.99998, 1.0);
    gl_PointSize = pointSize * pixelRatio;
  }
`;

const starFragment = `
  varying float vBrightness;
  varying vec3 vColor;
  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    float core = 1.0 - smoothstep(0.08, 0.49, radius);
    if (core < 0.015) discard;
    gl_FragColor = vec4(vColor, pow(core, 0.8) * vBrightness);
    #include <colorspace_fragment>
  }
`;

const moonVertex = `
  uniform vec2 screenScale;
  uniform vec2 anchor;
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vPosition = position;
    vNormal = normal;
    gl_Position = vec4(anchor + position.xy * screenScale,
      0.9998 - position.z * 0.00001, 1.0);
  }
`;

const moonFragment = `
  uniform vec4 craters[14];
  varying vec3 vPosition;
  varying vec3 vNormal;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.13, 0.27, 0.41));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }

  void main() {
    vec3 p = normalize(vPosition);
    float terrain = noise(p * 3.3 + vec3(2.7, 1.1, 0.4)) * 0.64
      + noise(p * 7.2) * 0.26 + noise(p * 18.0) * 0.10;
    float maria = 1.0 - smoothstep(0.38, 0.56, terrain);
    float grain = noise(p * 64.0) - 0.5;
    float albedo = 0.68 - maria * 0.26 + grain * 0.10;
    vec2 slope = vec2(0.0);

    for (int i = 0; i < 14; i++) {
      vec2 offset = p.xy - craters[i].xy;
      float distanceToCenter = length(offset);
      float radius = craters[i].z;
      float bowlWidth = radius * 0.62;
      float rimWidth = radius * 0.18;
      float bowl = exp(-pow(distanceToCenter / bowlWidth, 2.0));
      float rim = exp(-pow((distanceToCenter - radius) / rimWidth, 2.0));
      albedo += rim * 0.045 - bowl * 0.08;
      float derivative = 2.0 * distanceToCenter / (bowlWidth * bowlWidth) * bowl
        - 0.55 * (distanceToCenter - radius) / (rimWidth * rimWidth) * rim;
      slope += offset / max(distanceToCenter, 0.001) * derivative * craters[i].w;
    }

    vec3 normal = normalize(vNormal - vec3(slope, 0.0));
    vec3 lightDirection = normalize(vec3(-0.83, 0.58, 0.58));
    float light = dot(normal, lightDirection);
    float diffuse = max(light, 0.0);
    // A trace of earthshine keeps the unlit limb legible without a halo.
    vec3 color = vec3(0.85, 0.86, 0.87) * albedo * (0.018 + diffuse * 0.92);
    color += vec3(0.013, 0.020, 0.032) * (1.0 - smoothstep(-0.1, 0.22, light));
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const SpaceBackdrop = ({ compact }: SpaceBackdropProps) => {
  const { width, height } = useThree(state => state.size);
  const pixelRatio = useThree(state => state.viewport.dpr);
  const stars = useMemo(() => {
    const count = compact ? 165 : 360;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brightness = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    let seed = 217;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = random() * 2 - 1;
      positions[index * 3 + 1] = random() * 2 - 1;
      const prominence = random();
      sizes[index] = prominence > 0.965 ? 3.0 : prominence > 0.76 ? 2.0 : 1.25 + random() * 0.35;
      brightness[index] = prominence > 0.965 ? 0.96 : 0.38 + random() * 0.42;
      const warmth = random();
      colors[index * 3] = warmth > 0.92 ? 0.98 : 0.69 + random() * 0.2;
      colors[index * 3 + 1] = warmth > 0.92 ? 0.83 : 0.80 + random() * 0.15;
      colors[index * 3 + 2] = warmth > 0.92 ? 0.66 : 0.99;
    }
    return { positions, sizes, brightness, colors };
  }, [compact]);
  const starUniforms = useMemo(() => ({ pixelRatio: { value: pixelRatio } }), [pixelRatio]);
  const moonUniforms = useMemo(() => {
    const diameter = compact ? THREE.MathUtils.clamp(width * 0.065, 20, 28) : 47;
    return {
      screenScale: { value: new THREE.Vector2(diameter / width, diameter / height) },
      anchor: { value: new THREE.Vector2(compact ? -0.80 : 0.74, compact ? 0.56 : 0.36) },
      craters: { value: [
        new THREE.Vector4(-0.41, 0.48, 0.13, 0.010),
        new THREE.Vector4(-0.17, 0.61, 0.085, 0.007),
        new THREE.Vector4(0.31, 0.35, 0.16, 0.012),
        new THREE.Vector4(0.53, 0.02, 0.11, 0.009),
        new THREE.Vector4(-0.36, -0.15, 0.18, 0.012),
        new THREE.Vector4(0.05, -0.52, 0.14, 0.011),
        new THREE.Vector4(-0.57, -0.53, 0.09, 0.007),
        new THREE.Vector4(0.41, -0.46, 0.07, 0.006),
        new THREE.Vector4(-0.62, 0.12, 0.065, 0.006),
        new THREE.Vector4(0.09, 0.12, 0.055, 0.006),
        new THREE.Vector4(0.61, 0.52, 0.05, 0.005),
        new THREE.Vector4(-0.11, -0.77, 0.055, 0.005),
        new THREE.Vector4(-0.72, -0.18, 0.055, 0.005),
        new THREE.Vector4(0.17, 0.76, 0.045, 0.005),
      ] },
    };
  }, [compact, width, height]);

  return <>
    <points name="space-stars" frustumCulled={false} renderOrder={-20}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
        <bufferAttribute attach="attributes-pointSize" args={[stars.sizes, 1]} />
        <bufferAttribute attach="attributes-brightness" args={[stars.brightness, 1]} />
        <bufferAttribute attach="attributes-starColor" args={[stars.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial vertexShader={starVertex} fragmentShader={starFragment}
        uniforms={starUniforms} transparent depthWrite={false} />
    </points>
    <mesh name="distant-moon" frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial vertexShader={moonVertex} fragmentShader={moonFragment}
        uniforms={moonUniforms} />
    </mesh>
  </>;
};
