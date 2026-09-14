import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { useFrame } from '@react-three/fiber';
import { Canvas, useLoader } from './GlobeCanvas';
import { GlobeMarkers, type GlobeMarkersHandle, type MarkerProjection } from './GlobeMarkers';
import { services, type Service } from '../data/services';
import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type GlobeProps = {
  paused: boolean;
  compact: boolean;
  suspended: boolean;
  reducedMotion: boolean;
  selected: Service | null;
  scrollMotion: React.RefObject<{ progress: number; velocity: number; updatedAt: number }>;
  onArrival: () => void;
  onSelect: (service: Service) => void;
  onInteract: () => void;
  onInteractEnd: () => void;
  onReady: () => void;
  onError: () => void;
};

const dayAsset = require(`../../assets/earth/earth_day_4096.jpg`);
const nightAsset = require(`../../assets/earth/earth_night_4096.jpg`);
const detailAsset = require(`../../assets/earth/earth_bump_roughness_clouds_4096.jpg`);
const textureSources = [dayAsset, nightAsset, detailAsset].map(source => Platform.OS === `web` ? Asset.fromModule(source).uri : source);
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

type SceneProps = GlobeProps & {
  drag: React.RefObject<{ x: number; y: number }>;
  dragging: React.RefObject<boolean>;
  onProjectMarkers: (points: MarkerProjection[]) => void;
};

type ScrollSpring = { value: number; velocity: number };

const advanceScrollSpring = (spring: ScrollSpring, target: number, delta: number) => {
  // Exact critically damped motion keeps velocity continuous when wheel/touch
  // events retarget the composition, without depending on the frame rate.
  const frequency = 2 / 0.16;
  const offset = spring.value - target;
  const step = (spring.velocity + frequency * offset) * delta;
  const decay = Math.exp(-frequency * delta);
  spring.value = target + (offset + step) * decay;
  spring.velocity = (spring.velocity - frequency * step) * decay;
  if (Math.abs(spring.value - target) < 0.00001 && Math.abs(spring.velocity) < 0.0001) {
    spring.value = target;
    spring.velocity = 0;
  }
};

const EarthScene = ({ selected, paused, compact, reducedMotion, scrollMotion, drag, dragging, onReady, onArrival, onProjectMarkers }: SceneProps) => {
  const textures = useLoader(THREE.TextureLoader, textureSources);
  const clouds = useRef<THREE.Mesh>(null);
  const sunDirection = useMemo(() => new THREE.Vector3(), []);
  const targetDirection = useMemo(() => new THREE.Vector3(), []);
  const currentDirection = useRef(latLngToVector(20, -100));
  const currentDistance = useRef(compact ? 3.15 : 2.55);
  const currentHorizon = useRef(compact ? 0.66 : 0.68);
  const currentHorizontal = useRef(0);
  const renderedPresentation = useRef({ distance: currentDistance.current, horizon: currentHorizon.current, horizontal: 0 });
  const arrivalSent = useRef(false);
  const texturesConfigured = useRef(false);
  const earthRendered = useRef(false);
  const readySent = useRef(false);
  const lastDrag = useRef({ x: 0, y: 0 });
  const previousSelection = useRef<Service | null>(null);
  const presentationMotion = useRef<ScrollSpring>({ value: 0, velocity: 0 });
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const transition = useRef({ progress: 1, from: currentDirection.current.clone(), ...renderedPresentation.current });
  const markerPositions = useMemo(() => services.map(service => ({ id: service.id, position: latLngToVector(service.latitude, service.longitude, 1.013), projected: new THREE.Vector3() })), []);
  const surfaceUniforms = useMemo(() => ({ dayMap: { value: textures[0] }, nightMap: { value: textures[1] }, detailMap: { value: textures[2] }, sunDirection: { value: sunDirection } }), [textures, sunDirection]);
  const shellUniforms = useMemo(() => ({ detailMap: { value: textures[2] }, sunDirection: { value: sunDirection } }), [textures, sunDirection]);
  const atmosphereUniforms = useMemo(() => ({ sunDirection: { value: sunDirection } }), [sunDirection]);

  useEffect(() => {
    textures.forEach((texture, index) => {
      texture.colorSpace = index < 2 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    });
    texturesConfigured.current = true;
  }, [textures]);

  useLayoutEffect(() => {
    // An initial orbit is already correctly framed; only destination changes fly.
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    // Begin with the frame the user actually sees, including its scroll pose.
    // Baking that pose into the flight avoids visiting the hero framing first.
    const presentation = renderedPresentation.current;
    transition.current = { progress: 0, from: currentDirection.current.clone(), ...presentation };
    currentDistance.current = presentation.distance;
    currentHorizon.current = presentation.horizon;
    currentHorizontal.current = presentation.horizontal;
    presentationMotion.current = { value: 0, velocity: 0 };
    arrivalSent.current = false;
    lastDrag.current = { ...drag.current };
  }, [selected, drag]);

  useFrame(({ camera, size }, frameDelta) => {
    // The prior frame must have drawn the textured Earth before revealing it.
    if (earthRendered.current && !readySent.current) {
      readySent.current = true;
      onReady();
    }
    const delta = Math.min(frameDelta, 0.05);
    const flight = transition.current;
    const inFlight = flight.progress < 1;
    flight.progress = reducedMotion ? 1 : Math.min(1, flight.progress + delta / (selected ? 2.2 : 2.8));
    const eased = flight.progress < 0.5 ? 4 * flight.progress ** 3 : 1 - (-2 * flight.progress + 2) ** 3 / 2;
    // Keep Earth at regional scale even when city tiles are delayed or unavailable.
    const restingDistance = selected ? 2.2 : (compact ? 3.15 : 2.55);
    const restingHorizon = selected ? 0 : compact ? 0.66 : 0.68;
    const motion = scrollMotion.current;
    const scrollTarget = selected ? 0 : THREE.MathUtils.clamp(motion.progress, 0, 1);
    if (reducedMotion) presentationMotion.current = { value: scrollTarget, velocity: 0 };
    else advanceScrollSpring(presentationMotion.current, scrollTarget, delta);
    const progress = THREE.MathUtils.clamp(presentationMotion.current.value, 0, 1);
    const presentation = progress * progress * (3 - 2 * progress);
    // Rotation follows the visible journey, including its gentle settling.
    // The spring's continuous velocity avoids spikes from individual events.
    const presentationSpeed = Math.abs(6 * progress * (1 - progress) * presentationMotion.current.velocity);
    const orbitSpeed = 0.027 + Math.min(0.65, presentationSpeed * 0.42);
    targetDirection.copy(latLngToVector(selected?.latitude ?? 20, selected?.longitude ?? -100));
    if (inFlight) {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(flight.from, targetDirection);
      const turn = selected ? Math.min(1, flight.progress / 0.7) : eased;
      const turnEase = selected ? turn * turn * (3 - 2 * turn) : turn;
      currentDirection.current.copy(flight.from).applyQuaternion(new THREE.Quaternion().slerp(quaternion, turnEase));
      const descent = Math.max(0, (flight.progress - 0.32) / 0.68);
      const descentEase = descent * descent * (3 - 2 * descent);
      const lift = Math.min(1, flight.progress / 0.32);
      const liftEase = lift * lift * (3 - 2 * lift);
      const liftedDistance = THREE.MathUtils.lerp(flight.distance, Math.max(flight.distance, 3.2), liftEase);
      currentDistance.current = selected ? THREE.MathUtils.lerp(liftedDistance, restingDistance, descentEase) : THREE.MathUtils.lerp(flight.distance, restingDistance, eased);
      currentHorizon.current = THREE.MathUtils.lerp(flight.horizon, restingHorizon, eased);
      currentHorizontal.current = THREE.MathUtils.lerp(flight.horizontal, 0, eased);
    } else {
      currentDistance.current = reducedMotion ? restingDistance : THREE.MathUtils.damp(currentDistance.current, restingDistance, 7, delta);
      currentHorizon.current = reducedMotion ? restingHorizon : THREE.MathUtils.damp(currentHorizon.current, restingHorizon, 7, delta);
      currentHorizontal.current = reducedMotion ? 0 : THREE.MathUtils.damp(currentHorizontal.current, 0, 7, delta);
      const dx = drag.current.x - lastDrag.current.x;
      const dy = drag.current.y - lastDrag.current.y;
      if (dx || dy) {
        currentDirection.current.applyAxisAngle(up, -dx * 0.004);
        right.crossVectors(up, currentDirection.current).normalize();
        const candidate = currentDirection.current.clone().applyAxisAngle(right, -dy * 0.003);
        if (Math.abs(candidate.y) < 0.94) currentDirection.current.copy(candidate);
      } else if (!paused && !dragging.current && !selected && !reducedMotion) {
        // Continue from the user's orientation, including after the idle delay.
        currentDirection.current.applyAxisAngle(up, delta * orbitSpeed);
      }
    }
    lastDrag.current = { ...drag.current };

    // Scroll changes composition without changing the geographic direction.
    // Destination flights inherit that composition when they begin.
    let distance = currentDistance.current;
    let horizon = currentHorizon.current;
    let horizontal = currentHorizontal.current;
    if (camera instanceof THREE.PerspectiveCamera && size.width && size.height) {
      const targetDiameter = compact ? size.width * 0.56 : Math.min(size.width * 0.45, size.height * 0.68);
      // A sphere's silhouette subtends asin(radius / distance), so retain an
      // exact apparent diameter across viewport aspect ratios and breakpoints.
      // Interpolate the visible size rather than camera distance: otherwise a
      // large mobile Earth collapses too quickly at the start of the journey.
      if (presentation > 0) {
        const focalHeight = size.height / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        const initialDiameter = focalHeight / Math.sqrt(distance * distance - 1);
        const diameter = THREE.MathUtils.lerp(initialDiameter, targetDiameter, presentation);
        distance = Math.sqrt(1 + (focalHeight / diameter) ** 2);
      }
      horizon = THREE.MathUtils.lerp(horizon, compact ? -0.26 : 0, presentation);
      horizontal = THREE.MathUtils.lerp(horizontal, compact ? 0.28 : 0.26, presentation);
      camera.setViewOffset(size.width, size.height, -size.width * horizontal, -size.height * horizon, size.width, size.height);
    }
    renderedPresentation.current = { distance, horizon, horizontal };
    camera.position.copy(currentDirection.current).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    // Project after updating this frame's camera so the tap targets stay attached
    // to their actual coordinates through dragging, scrolling, and orbiting.
    camera.updateMatrixWorld();
    onProjectMarkers(markerPositions.map(({ id, position, projected }) => {
      projected.copy(position).project(camera);
      const x = (projected.x + 1) * size.width / 2;
      const y = (1 - projected.y) * size.height / 2;
      return {
        id, x, y,
        visible: !selected && flight.progress === 1 && position.dot(camera.position) > position.lengthSq()
          && projected.z >= -1 && projected.z <= 1 && x >= 0 && x <= size.width && y >= 0 && y <= size.height,
      };
    }));
    right.crossVectors(up, currentDirection.current).normalize();
    sunDirection.copy(currentDirection.current).multiplyScalar(0.55).addScaledVector(right, -0.75).addScaledVector(up, 0.65).normalize();
    if (clouds.current && !paused && !dragging.current && !reducedMotion) clouds.current.rotation.y += delta * 0.008;
    if (selected && flight.progress === 1 && !arrivalSent.current) { arrivalSent.current = true; onArrival(); }
  });

  return (
    <>
      <Starfield />
      <mesh name="earth-surface" onAfterRender={() => { if (texturesConfigured.current) earthRendered.current = true; }}>
        <sphereGeometry args={[1, compact ? 64 : 128, compact ? 48 : 96]} />
        <shaderMaterial vertexShader={globeVertex} fragmentShader={surfaceFragment} uniforms={surfaceUniforms} />
      </mesh>
      <mesh name="earth-clouds" ref={clouds}>
        <sphereGeometry args={[1.005, 64, 48]} />
        <shaderMaterial transparent depthWrite={false} vertexShader={globeVertex} fragmentShader={cloudsFragment} uniforms={shellUniforms} />
      </mesh>
      <mesh name="earth-atmosphere">
        <sphereGeometry args={[1.027, 64, 48]} />
        <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} vertexShader={globeVertex} fragmentShader={atmosphereFragment} uniforms={atmosphereUniforms} />
      </mesh>
    </>
  );
};

class GlobeBoundary extends Component<{ children: ReactNode; onRetry: () => void; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() {
    if (this.state.failed) return <View style={styles.loading}><Text style={styles.errorTitle}>The globe couldn’t load</Text><Text style={styles.errorText}>Choose a destination to explore its city.</Text><Pressable onPress={this.props.onRetry} accessibilityRole="button" style={styles.retry}><Text style={styles.loadingText}>RETRY GLOBE ↗</Text></Pressable></View>;
    return this.props.children;
  }
}

export const Globe = (props: GlobeProps) => {
  const drag = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const markerPressCancelled = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const markers = useRef<GlobeMarkersHandle>(null);
  const projectMarkers = useCallback((points: MarkerProjection[]) => markers.current?.update(points), []);
  const canSelectMarker = useCallback(() => !markerPressCancelled.current && !dragging.current, []);
  const [attempt, setAttempt] = useState(0);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => { markerPressCancelled.current = false; return false; },
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) > 6) markerPressCancelled.current = true;
      return Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
    },
    onPanResponderGrant: () => { markerPressCancelled.current = true; origin.current = { ...drag.current }; dragging.current = true; props.onInteract(); },
    onPanResponderMove: (_, gesture) => { drag.current = { x: origin.current.x + gesture.dx, y: origin.current.y + gesture.dy }; },
    onPanResponderRelease: () => { dragging.current = false; props.onInteractEnd(); },
    onPanResponderTerminate: () => { dragging.current = false; props.onInteractEnd(); },
  }), [props.onInteract, props.onInteractEnd]);

  return (
    <View style={styles.container} {...responder.panHandlers} accessibilityLabel={props.selected ? `Earth focused on ${props.selected.city}` : `Interactive rotating Earth. Drag horizontally to rotate, or choose a city marker`}>
      <GlobeBoundary key={attempt} onError={() => { markers.current?.hide(); props.onError(); }} onRetry={() => { useLoader.clear(THREE.TextureLoader, textureSources); setAttempt(value => value + 1); }}>
        <View style={[styles.canvas, { pointerEvents: `none` }]}>
          <Canvas frameloop={props.suspended ? `never` : `always`} camera={{ fov: 38, near: 0.01, far: 80, position: [0, 0, 2.55] }} dpr={[1, props.compact ? 1.5 : 2]} gl={{ alpha: true, antialias: true, powerPreference: `high-performance` }} style={styles.canvas}>
            <Suspense fallback={null}><EarthScene {...props} drag={drag} dragging={dragging} onProjectMarkers={projectMarkers} /></Suspense>
          </Canvas>
        </View>
      </GlobeBoundary>
      <GlobeMarkers ref={markers} onSelect={props.onSelect} canSelectPointer={canSelectMarker} reducedMotion={props.reducedMotion} paused={props.paused} enabled={!props.selected && !props.suspended} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1 },
  loading: { position: `absolute`, top: `56%`, right: 0, bottom: 100, left: 0, gap: 18, paddingHorizontal: 24, alignItems: `center`, justifyContent: `center` },
  loadingText: { color: `#8DA6B7`, fontSize: 12, letterSpacing: 2 },
  errorTitle: { color: `#EAF1F5`, fontSize: 20, textAlign: `center` },
  errorText: { color: `#8DA6B7`, fontSize: 14, textAlign: `center` },
  retry: { padding: 16, borderWidth: 1, borderColor: `#294655`, borderRadius: 30 },
});
