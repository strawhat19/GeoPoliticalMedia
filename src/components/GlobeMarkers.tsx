import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { services, type Service } from '../data/services';

export type MarkerProjection = {
  id: Service[`id`];
  x: number;
  y: number;
  visible: boolean;
};

export type GlobeMarkersHandle = {
  update: (points: MarkerProjection[]) => void;
  hide: () => void;
};

type GlobeMarkersProps = {
  onSelect: (service: Service) => void;
  reducedMotion: boolean;
  paused: boolean;
  enabled: boolean;
  canSelectPointer?: () => boolean;
};

type MarkerHandle = {
  update: (point: MarkerProjection) => void;
  hide: () => void;
};

const nativeDriver = Platform.OS !== `web`;
const targetSize = 44;
const pulseDuration = 2200;

type MarkerProps = Omit<GlobeMarkersProps, `onSelect`> & {
  service: Service;
  index: number;
  onActivate: (service: Service, offset: { x: number; y: number } | null) => void;
};

const LocationMarker = forwardRef<MarkerHandle, MarkerProps>(
  ({ service, index, onActivate, reducedMotion, paused, enabled }, ref) => {
    const position = useRef(new Animated.ValueXY({ x: -targetSize, y: -targetSize })).current;
    const firstPulse = useRef(new Animated.Value(0)).current;
    const secondPulse = useRef(new Animated.Value(0)).current;
    const projectedVisible = useRef(false);
    const visibleRef = useRef(false);
    const [visible, setVisible] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const city = service.id === `data` ? `Atlanta, Georgia` : service.city;
    const highlighted = hovered || focused;

    const activate = (event: GestureResponderEvent) => {
      // Nearby cities can share part of their 44px touch targets. Resolve a
      // pointer to the closest dot, while keyboard activation keeps its focus.
      let offset: { x: number; y: number } | null = null;
      if (Platform.OS === `web`) {
        const pointer = event.nativeEvent as unknown as { detail?: number; clientX?: number; clientY?: number };
        const target = event.currentTarget as unknown as { getBoundingClientRect?: () => { left: number; top: number } };
        if (pointer.detail !== 0 && typeof pointer.clientX === `number` && typeof pointer.clientY === `number`) {
          const bounds = target.getBoundingClientRect?.();
          if (bounds) offset = { x: pointer.clientX - bounds.left - targetSize / 2, y: pointer.clientY - bounds.top - targetSize / 2 };
        }
      } else {
        const { locationX, locationY } = event.nativeEvent;
        if (Number.isFinite(locationX) && Number.isFinite(locationY)) offset = { x: locationX - targetSize / 2, y: locationY - targetSize / 2 };
      }
      onActivate(service, offset);
    };

    const updateVisibility = (nextVisible: boolean) => {
      if (visibleRef.current === nextVisible) return;
      visibleRef.current = nextVisible;
      setVisible(nextVisible);
      if (!nextVisible) {
        setHovered(false);
        setFocused(false);
      }
    };

    useImperativeHandle(ref, () => ({
      update(point) {
        projectedVisible.current = point.visible;
        const nextVisible = enabled && point.visible;
        if (nextVisible) position.setValue({ x: point.x - targetSize / 2, y: point.y - targetSize / 2 });
        updateVisibility(nextVisible);
      },
      hide() {
        projectedVisible.current = false;
        updateVisibility(false);
      },
    }), [enabled, position]);

    useEffect(() => {
      updateVisibility(enabled && projectedVisible.current);
    }, [enabled]);

    useEffect(() => {
      if (reducedMotion) {
        firstPulse.setValue(0);
        secondPulse.setValue(0);
        return;
      }
      if (!visible || paused || !enabled) return;

      const pulse = (value: Animated.Value, delay: number) => Animated.sequence([
        Animated.delay(delay),
        Animated.loop(Animated.timing(value, {
          toValue: 1,
          duration: pulseDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: nativeDriver,
          isInteraction: false,
        })),
      ]);
      const animation = Animated.parallel([
        pulse(firstPulse, index * 240),
        pulse(secondPulse, index * 240 + pulseDuration / 2),
      ]);
      animation.start();
      return () => animation.stop();
    }, [enabled, firstPulse, index, paused, reducedMotion, secondPulse, visible]);

    return (
      <Animated.View
        pointerEvents={visible && enabled ? `box-none` : `none`}
        accessibilityElementsHidden={!visible || !enabled}
        importantForAccessibility={visible && enabled ? `auto` : `no-hide-descendants`}
        aria-hidden={!visible || !enabled}
        style={[styles.marker, { opacity: visible && enabled ? 1 : 0, transform: position.getTranslateTransform() }]}
      >
        <Pressable
          testID={`globe-marker-${service.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Explore ${service.name} in ${city}`}
          accessibilityHint="Zooms from the globe into the city view"
          disabled={!visible || !enabled}
          onPress={activate}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={({ pressed }) => [styles.target, (highlighted || pressed) && styles.targetHighlighted]}
        >
          <View pointerEvents="none" style={styles.center}>
            <View style={[styles.staticRing, { borderColor: service.color }]} />
            {[firstPulse, secondPulse].map((value, pulseIndex) => (
              <Animated.View key={pulseIndex} style={[
                styles.pulse,
                {
                  borderColor: service.color,
                  opacity: value.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.55, 0] }),
                  transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.65, 2.1] }) }],
                },
              ]} />
            ))}
            <View style={[styles.glow, { backgroundColor: service.color }]} />
            <View style={[styles.core, { backgroundColor: service.color }]} />
          </View>
        </Pressable>
        {highlighted && visible && enabled && (
          <View pointerEvents="none" style={styles.label}>
            <Text style={styles.labelText}>{city}</Text>
          </View>
        )}
      </Animated.View>
    );
  },
);
LocationMarker.displayName = `LocationMarker`;

/** Camera projections update positions directly; React only handles visibility changes. */
export const GlobeMarkers = forwardRef<GlobeMarkersHandle, GlobeMarkersProps>((props, ref) => {
  const markers = useRef<Partial<Record<Service[`id`], MarkerHandle | null>>>({});
  const projections = useRef<Partial<Record<Service[`id`], MarkerProjection>>>({});

  useImperativeHandle(ref, () => ({
    update(points) {
      for (const point of points) {
        projections.current[point.id] = point;
        markers.current[point.id]?.update(point);
      }
      for (const service of services) {
        if (!points.some(point => point.id === service.id)) {
          delete projections.current[service.id];
          markers.current[service.id]?.hide();
        }
      }
    },
    hide() {
      projections.current = {};
      for (const service of services) markers.current[service.id]?.hide();
    },
  }), []);

  const activate = (service: Service, offset: { x: number; y: number } | null) => {
    if (offset && props.canSelectPointer && !props.canSelectPointer()) return;
    const origin = projections.current[service.id];
    let destination = service;
    if (offset && origin) {
      const x = origin.x + offset.x;
      const y = origin.y + offset.y;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of services) {
        const point = projections.current[candidate.id];
        if (!point?.visible) continue;
        const distance = Math.hypot(point.x - x, point.y - y);
        if (distance <= targetSize / 2 && distance < nearestDistance) {
          nearestDistance = distance;
          destination = candidate;
        }
      }
    }
    props.onSelect(destination);
  };

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {services.map((service, index) => (
        <LocationMarker
          key={service.id}
          ref={handle => { markers.current[service.id] = handle; }}
          {...props}
          service={service}
          index={index}
          onActivate={activate}
        />
      ))}
    </View>
  );
});
GlobeMarkers.displayName = `GlobeMarkers`;

const styles = StyleSheet.create({
  overlay: { position: `absolute`, inset: 0, overflow: `hidden` },
  marker: { position: `absolute`, top: 0, left: 0, width: targetSize, height: targetSize },
  target: { width: targetSize, height: targetSize, borderRadius: targetSize / 2, alignItems: `center`, justifyContent: `center`, borderWidth: 1, borderColor: `transparent` },
  targetHighlighted: { backgroundColor: `rgba(9,27,40,0.28)`, borderColor: `rgba(221,243,255,0.6)` },
  center: { width: targetSize, height: targetSize, alignItems: `center`, justifyContent: `center` },
  staticRing: { position: `absolute`, width: 20, height: 20, borderRadius: 10, borderWidth: 1, opacity: 0.3 },
  pulse: { position: `absolute`, width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  glow: { position: `absolute`, width: 16, height: 16, borderRadius: 8, opacity: 0.18 },
  core: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: `#F4FBFF` },
  label: { position: `absolute`, bottom: 46, left: -64, width: 172, alignItems: `center` },
  labelText: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, overflow: `hidden`, backgroundColor: `rgba(3,12,21,0.9)`, borderWidth: 1, borderColor: `rgba(170,208,231,0.2)`, color: `#E4F0F6`, fontFamily: `Manrope_600SemiBold`, fontSize: 11, lineHeight: 16, textAlign: `center` },
});
