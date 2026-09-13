import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { useFrame } from '@react-three/fiber';
import { Canvas, useLoader } from './GlobeCanvas';
import { services, type Service } from '../data/services';
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type GlobeProps = {
  paused: boolean;
  compact: boolean;
  suspended: boolean;
  reducedMotion: boolean;
  selected: Service | null;
  onArrival: () => void;
  onInteract: () => void;
};

const dayAsset = require(`../../assets/earth/earth_day_4096.jpg`);
const nightAsset = require(`../../assets/earth/earth_night_4096.jpg`);
const detailAsset = require(`../../assets/earth/earth_bump_roughness_clouds_4096.jpg`);
const globeVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1.0);
  }
`;

const surfaceFragment = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D detailMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 detail = texture2D(detailMap, vUv).rgb;
    float heightX = texture2D(detailMap, vUv + vec2(0.0005, 0.0)).r - detail.r;
    float heightY = texture2D(detailMap, vUv + vec2(0.0, 0.0005)).r - detail.r;
    vec3 tangent = normalize(vec3(-vNormal.z, 0.0, vNormal.x));
    vec3 bitangent = normalize(cross(vNormal, tangent));
    vec3 normal = normalize(vNormal + tangent * heightX * 1.8 + bitangent * heightY * 1.8);
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float light = dot(normal, sunDirection);
    float daylight = smoothstep(-0.16, 0.22, light);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float diffuse = max(light, 0.0) * 1.15 + 0.11;
    vec3 color = day * diffuse * mix(0.035, 1.0, daylight);
    color += night * (1.0 - smoothstep(-0.24, 0.18, light)) * 1.4;
    float specular = pow(max(dot(normal, normalize(sunDirection + viewDirection)), 0.0), 70.0);
    color += vec3(0.6, 0.82, 1.0) * specular * (1.0 - detail.g) * 0.45;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.5);
    color += vec3(0.10, 0.36, 0.63) * fresnel * daylight * 0.48;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudsFragment = `
  uniform sampler2D detailMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    float cloud = smoothstep(0.22, 0.95, texture2D(detailMap, vUv).b);
    float light = dot(normalize(vNormal), sunDirection);
    float brightness = max(light, 0.0) * 0.9 + 0.16;
    gl_FragColor = vec4(vec3(0.87, 0.94, 1.0) * brightness, cloud * 0.85);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereFragment = `
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 4.5);
    float daylight = smoothstep(-0.45, 0.8, dot(normalize(vNormal), sunDirection));
    gl_FragColor = vec4(vec3(0.12, 0.48, 0.9), rim * daylight * 0.52);
  }
`;

export const latLngToVector = (latitude: number, longitude: number, radius = 1) => {
  const phi = THREE.MathUtils.degToRad(latitude);
  const theta = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.sin(phi), -Math.cos(phi) * Math.sin(theta)).multiplyScalar(radius);
};

const Destination = ({ service, active, animate }: { service: Service; active: boolean; animate: boolean }) => {
  const pulse = useRef<THREE.Mesh>(null);
  const position = useMemo(() => latLngToVector(service.latitude, service.longitude, 1.013), [service]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize()), [position]);
  useFrame(({ clock }) => {
    if (pulse.current) pulse.current.scale.setScalar(active && animate ? 1.1 + Math.sin(clock.elapsedTime * 2) * 0.18 : 1);
  });
  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <circleGeometry args={[active ? 0.009 : 0.006, 24]} />
        <meshBasicMaterial color={active ? `#FFFFFF` : `#8DCEDA`} />
      </mesh>
      <mesh ref={pulse}>
        <ringGeometry args={[active ? 0.017 : 0.013, active ? 0.020 : 0.014, 40]} />
        <meshBasicMaterial transparent opacity={active ? 0.9 : 0.5} color={service.color} side={THREE.DoubleSide} />
      </mesh>
      {active && <mesh position={[0, 0, 0.012]}><ringGeometry args={[0.037, 0.038, 48]} /><meshBasicMaterial transparent opacity={0.3} color={service.color} side={THREE.DoubleSide} /></mesh>}
    </group>
  );
};

const Starfield = () => {
  const positions = useMemo(() => {
    const points = new Float32Array(2100 * 3);
    let seed = 19;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < points.length; i += 3) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const radius = 12 + random() * 12;
      points[i] = radius * Math.sin(phi) * Math.cos(theta);
      points[i + 1] = radius * Math.cos(phi);
      points[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return points;
  }, []);
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial transparent opacity={0.8} size={0.032} color="#BDD4E8" sizeAttenuation depthWrite={false} /></points>;
};

type SceneProps = GlobeProps & { drag: React.RefObject<{ x: number; y: number }>; onReady: () => void };

const EarthScene = ({ selected, paused, compact, reducedMotion, drag, onReady, onArrival }: SceneProps) => {
  const textures = useLoader(THREE.TextureLoader, [dayAsset, nightAsset, detailAsset].map(source => Platform.OS === `web` ? Asset.fromModule(source).uri : source));
  const clouds = useRef<THREE.Mesh>(null);
  const sunDirection = useMemo(() => new THREE.Vector3(), []);
  const targetDirection = useMemo(() => new THREE.Vector3(), []);
  const currentDirection = useRef(latLngToVector(20, -100));
  const currentDistance = useRef(compact ? 3.15 : 2.55);
  const currentHorizon = useRef(compact ? 0.66 : 0.68);
  const arrivalSent = useRef(false);
  const lastDrag = useRef({ x: 0, y: 0 });
  const rotation = useRef(0);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const transition = useRef({ progress: 1, from: currentDirection.current.clone(), distance: currentDistance.current, horizon: currentHorizon.current });
  const surfaceUniforms = useMemo(() => ({ dayMap: { value: textures[0] }, nightMap: { value: textures[1] }, detailMap: { value: textures[2] }, sunDirection: { value: sunDirection } }), [textures, sunDirection]);
  const shellUniforms = useMemo(() => ({ detailMap: { value: textures[2] }, sunDirection: { value: sunDirection } }), [textures, sunDirection]);
  const atmosphereUniforms = useMemo(() => ({ sunDirection: { value: sunDirection } }), [sunDirection]);

  useEffect(() => {
    textures.forEach((texture, index) => {
      texture.colorSpace = index < 2 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    });
    onReady();
  }, [textures, onReady]);

  useEffect(() => {
    transition.current = { progress: 0, from: currentDirection.current.clone(), distance: currentDistance.current, horizon: currentHorizon.current };
    arrivalSent.current = false;
    lastDrag.current = { ...drag.current };
    rotation.current = 0;
  }, [selected, compact, drag]);

  useFrame(({ camera, size }, frameDelta) => {
    const delta = Math.min(frameDelta, 0.05);
    const flight = transition.current;
    flight.progress = Math.min(1, flight.progress + delta / (reducedMotion ? 0.01 : selected ? 4.1 : 2.8));
    const eased = flight.progress < 0.5 ? 4 * flight.progress ** 3 : 1 - (-2 * flight.progress + 2) ** 3 / 2;
    const restingDistance = selected ? 1.14 : (compact ? 3.15 : 2.55);
    if (!selected && !paused && !reducedMotion && flight.progress === 1) rotation.current += delta * 0.027;
    targetDirection.copy(latLngToVector(selected?.latitude ?? 20, selected?.longitude ?? -100));
    targetDirection.applyAxisAngle(up, rotation.current);
    if (flight.progress < 1) {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(flight.from, targetDirection);
      const turn = selected ? Math.min(1, flight.progress / 0.58) : eased;
      const turnEase = selected ? turn * turn * (3 - 2 * turn) : turn;
      currentDirection.current.copy(flight.from).applyQuaternion(new THREE.Quaternion().slerp(quaternion, turnEase));
      const descent = Math.max(0, (flight.progress - 0.32) / 0.68);
      const descentEase = descent * descent * (3 - 2 * descent);
      const liftedDistance = THREE.MathUtils.lerp(flight.distance, Math.max(flight.distance, 3.2), Math.min(1, flight.progress / 0.3));
      currentDistance.current = selected ? THREE.MathUtils.lerp(liftedDistance, restingDistance, descentEase) : THREE.MathUtils.lerp(flight.distance, restingDistance, eased);
      currentHorizon.current = THREE.MathUtils.lerp(flight.horizon, selected ? 0 : compact ? 0.66 : 0.68, eased);
    } else {
      const dx = drag.current.x - lastDrag.current.x;
      const dy = drag.current.y - lastDrag.current.y;
      if (dx || dy) {
        currentDirection.current.applyAxisAngle(up, -dx * 0.004);
        right.crossVectors(up, currentDirection.current).normalize();
        const candidate = currentDirection.current.clone().applyAxisAngle(right, -dy * 0.003);
        if (Math.abs(candidate.y) < 0.94) currentDirection.current.copy(candidate);
      } else if (!paused && !selected && !reducedMotion) currentDirection.current.applyAxisAngle(up, delta * 0.027);
    }
    lastDrag.current = { ...drag.current };
    camera.position.copy(currentDirection.current).multiplyScalar(currentDistance.current);
    camera.lookAt(0, 0, 0);
    if (camera instanceof THREE.PerspectiveCamera && size.width && size.height) camera.setViewOffset(size.width, size.height, 0, -size.height * currentHorizon.current, size.width, size.height);
    right.crossVectors(up, currentDirection.current).normalize();
    sunDirection.copy(currentDirection.current).multiplyScalar(0.55).addScaledVector(right, -0.75).addScaledVector(up, 0.65).normalize();
    if (clouds.current && !paused && !reducedMotion) clouds.current.rotation.y += delta * 0.008;
    if (selected && flight.progress === 1 && !arrivalSent.current) { arrivalSent.current = true; onArrival(); }
  });

  return (
    <>
      <Starfield />
      <mesh>
        <sphereGeometry args={[1, compact ? 64 : 128, compact ? 48 : 96]} />
        <shaderMaterial vertexShader={globeVertex} fragmentShader={surfaceFragment} uniforms={surfaceUniforms} />
      </mesh>
      <mesh ref={clouds}>
        <sphereGeometry args={[1.005, 64, 48]} />
        <shaderMaterial transparent depthWrite={false} vertexShader={globeVertex} fragmentShader={cloudsFragment} uniforms={shellUniforms} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.027, 64, 48]} />
        <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} vertexShader={globeVertex} fragmentShader={atmosphereFragment} uniforms={atmosphereUniforms} />
      </mesh>
      {services.map(service => <Destination key={service.id} service={service} active={selected?.id === service.id} animate={!paused && !reducedMotion} />)}
    </>
  );
};

class GlobeBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={styles.loading}><Text style={styles.errorTitle}>The globe couldn’t load</Text><Text style={styles.errorText}>You can still explore every division below.</Text><Pressable onPress={this.props.onRetry} accessibilityRole="button" style={styles.retry}><Text style={styles.loadingText}>RETRY GLOBE ↗</Text></Pressable></View>;
    return this.props.children;
  }
}

export const Globe = (props: GlobeProps) => {
  const drag = useRef({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onReady = useMemo(() => () => setReady(true), []);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => { origin.current = { ...drag.current }; props.onInteract(); },
    onPanResponderMove: (_, gesture) => { drag.current = { x: origin.current.x + gesture.dx, y: origin.current.y + gesture.dy }; },
  }), [props.onInteract]);

  return (
    <View style={styles.container} {...responder.panHandlers} accessibilityLabel={props.selected ? `Earth focused on ${props.selected.city}` : `Interactive rotating Earth. Drag horizontally to rotate`}>
      <GlobeBoundary key={attempt} onRetry={() => { setReady(false); setAttempt(value => value + 1); }}>
        <View style={[styles.canvas, { pointerEvents: `none` }]}>
          <Canvas frameloop={props.suspended ? `never` : `always`} camera={{ fov: 38, near: 0.01, far: 80, position: [0, 0, 2.55] }} dpr={[1, props.compact ? 1.5 : 2]} gl={{ alpha: true, antialias: true, powerPreference: `high-performance` }} style={styles.canvas}>
            <Suspense fallback={null}><EarthScene {...props} drag={drag} onReady={onReady} /></Suspense>
          </Canvas>
        </View>
        {!ready && <View style={[styles.loading, { pointerEvents: `none` }]}><ActivityIndicator color="#84DDEA" /><Text style={styles.loadingText}>BRINGING THE WORLD INTO VIEW</Text></View>}
      </GlobeBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1 },
  loading: { position: `absolute`, top: 0, right: 0, bottom: 0, left: 0, gap: 18, alignItems: `center`, justifyContent: `center` },
  loadingText: { color: `#8DA6B7`, fontSize: 12, letterSpacing: 2 },
  errorTitle: { color: `#EAF1F5`, fontSize: 20 },
  errorText: { color: `#8DA6B7`, fontSize: 14 },
  retry: { padding: 16, borderWidth: 1, borderColor: `#294655`, borderRadius: 30 },
});
