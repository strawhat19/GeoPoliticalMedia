import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlobeTooltipPortal } from './GlobeTooltipPortal';
import { GLOBE_PULSE_COLOR, serviceMarkerContent } from '../config/globeMarkers';
import { services, formatServiceLocation, type Service } from '../data/services';

export type MarkerProjection = {
  id: Service[`id`];
  x: number;
  y: number;
  visible: boolean;
};

export type GlobeMarkersHandle = {
  update: (points: MarkerProjection[]) => void;
  hide: () => void;
  dismissPreview: () => void;
};

type GlobeMarkersProps = {
  onSelect: (service: Service) => void;
  onPreviewChange?: (open: boolean) => void;
  reducedMotion: boolean;
  paused: boolean;
  enabled: boolean;
  canSelectPointer?: () => boolean;
};

type MarkerHandle = {
  update: (point: MarkerProjection) => void;
  hide: () => void;
};

type PointerOffset = { x: number; y: number } | null;
type PreviewSource = `hover` | `focus`;
type Viewport = { left: number; top: number; right: number; bottom: number };
const nativeDriver = Platform.OS !== `web`;
const targetSize = 44;
const pulseDuration = 2200;
const previewGap = 16;
const previewMaxWidth = 336;

/** RN Web provides client coordinates; native touches provide local coordinates. */
const pointerOffset = (event: unknown, hover = false): PointerOffset => {
  const { nativeEvent: pointer, currentTarget } = event as {
    nativeEvent: { detail?: number; clientX?: number; clientY?: number; locationX?: number; locationY?: number };
    currentTarget: { getBoundingClientRect?: () => { left: number; top: number } };
  };
  if (Platform.OS === `web`) {
    if ((!hover && pointer.detail === 0) || typeof pointer.clientX !== `number` || typeof pointer.clientY !== `number`) return null;
    const bounds = currentTarget.getBoundingClientRect?.();
    return bounds ? { x: pointer.clientX - bounds.left - targetSize / 2, y: pointer.clientY - bounds.top - targetSize / 2 } : null;
  }
  return typeof pointer.locationX === `number` && typeof pointer.locationY === `number`
    ? { x: pointer.locationX - targetSize / 2, y: pointer.locationY - targetSize / 2 }
    : null;
};

const isPointerActivation = (event: GestureResponderEvent) => Platform.OS !== `web`
  || (event.nativeEvent as unknown as { detail?: number }).detail !== 0;

type MarkerProps = Pick<GlobeMarkersProps, `reducedMotion` | `paused` | `enabled`> & {
  service: Service;
  index: number;
  highlighted: boolean;
  onActivate: (service: Service, offset: PointerOffset, pointer: boolean) => void;
  onPreview: (service: Service, offset: PointerOffset, source: PreviewSource) => void;
  onPreviewLeave: (service: Service, source: PreviewSource) => void;
};

const LocationMarker = forwardRef<MarkerHandle, MarkerProps>(
  ({ service, index, onActivate, onPreview, onPreviewLeave, reducedMotion, paused, enabled, highlighted }, ref) => {
    const position = useRef(new Animated.ValueXY({ x: -targetSize, y: -targetSize })).current;
    const firstPulse = useRef(new Animated.Value(0)).current;
    const secondPulse = useRef(new Animated.Value(0)).current;
    const projectedVisible = useRef(false);
    const visibleRef = useRef(false);
    const [visible, setVisible] = useState(false);
    const pulseColor = serviceMarkerContent[service.id].pulseColor ?? GLOBE_PULSE_COLOR;

    const updateVisibility = (nextVisible: boolean) => {
      if (visibleRef.current === nextVisible) return;
      visibleRef.current = nextVisible;
      setVisible(nextVisible);
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
          accessibilityLabel={`Explore ${service.name} in ${formatServiceLocation(service)}`}
          accessibilityHint="Preview service details on focus, or activate to open the city view"
          accessibilityState={{ expanded: highlighted }}
          {...(Platform.OS === `web` && highlighted ? { 'aria-describedby': `globe-preview-description-${service.id}` } : {})}
          disabled={!visible || !enabled}
          onPress={event => onActivate(service, pointerOffset(event), isPointerActivation(event))}
          onHoverIn={event => {
            if (!event.nativeEvent.buttons) onPreview(service, pointerOffset(event, true), `hover`);
          }}
          onHoverOut={() => onPreviewLeave(service, `hover`)}
          onPointerMove={event => {
            if (event.nativeEvent.pointerType === `mouse` && !event.nativeEvent.buttons) {
              onPreview(service, pointerOffset(event, true), `hover`);
            }
          }}
          onFocus={() => onPreview(service, null, `focus`)}
          onBlur={() => onPreviewLeave(service, `focus`)}
          style={({ pressed }) => [styles.target, (highlighted || pressed) && styles.targetHighlighted]}
        >
          <View pointerEvents="none" style={styles.center}>
            <View style={[styles.staticRing, { borderColor: pulseColor }]} />
            {[firstPulse, secondPulse].map((value, pulseIndex) => (
              <Animated.View key={pulseIndex} style={[
                styles.pulse,
                {
                  borderColor: pulseColor,
                  opacity: value.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.55, 0] }),
                  transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.65, 2.1] }) }],
                },
              ]} />
            ))}
            <View style={[styles.glow, { backgroundColor: pulseColor }]} />
            <View style={[styles.core, { backgroundColor: service.color }]} />
          </View>
        </Pressable>
      </Animated.View>
    );
  },
);
LocationMarker.displayName = `LocationMarker`;

const PreviewImage = ({ source, alt }: { source: ImageSourcePropType; alt: string }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  if (failed) return null;
  return <Image source={source} accessibilityLabel={alt} resizeMode="cover" onError={() => setFailed(true)} style={styles.previewImage} />;
};

/** Camera projections update positions directly; React only handles visibility and preview ownership. */
export const GlobeMarkers = forwardRef<GlobeMarkersHandle, GlobeMarkersProps>((props, ref) => {
  const markers = useRef<Partial<Record<Service[`id`], MarkerHandle | null>>>({});
  const projections = useRef<Partial<Record<Service[`id`], MarkerProjection>>>({});
  const propsRef = useRef(props);
  propsRef.current = props;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const overlay = useRef<View>(null);
  const viewport = useRef<Viewport>({ left: 12, top: 12, right: width - 12, bottom: height - insets.top - insets.bottom - 12 });
  const [cardSize, setCardSize] = useState({ width: Math.min(previewMaxWidth, width - 24), maxHeight: height - insets.top - insets.bottom - 24 });
  const cardHeight = useRef(330);
  const overlayOrigin = useRef({ x: 0, y: insets.top });
  const [actionHovered, setActionHovered] = useState(false);
  const [actionFocused, setActionFocused] = useState(false);
  const actionPointerOrigin = useRef({ x: 0, y: 0 });
  const actionMoved = useRef(false);
  const cardWidth = useRef(cardSize.width);
  cardWidth.current = cardSize.width;
  const cardPosition = useRef(new Animated.ValueXY()).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const [preview, setPreview] = useState<Service | null>(null);
  const active = useRef<Service | null>(null);
  const previewOpen = useRef(false);
  const hoveredMarker = useRef<Service[`id`] | null>(null);
  const focusedMarker = useRef<Service[`id`] | null>(null);
  const cardHovered = useRef(false);
  const actionHoverOwner = useRef(false);
  const cardFocused = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationGeneration = useRef(0);

  const clearExit = useCallback(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = null;
  }, []);

  const placeCard = useCallback(() => {
    const point = active.current ? projections.current[active.current.id] : null;
    if (!point) return;
    const bounds = viewport.current;
    const panelHeight = Math.min(cardHeight.current, bounds.bottom - bounds.top);
    const panelWidth = Math.min(cardWidth.current, bounds.right - bounds.left);
    const above = point.y - targetSize / 2 - previewGap - panelHeight;
    const below = point.y + targetSize / 2 + previewGap;
    // Prefer the space above the location; use below when it has more room.
    const roomAbove = point.y - bounds.top;
    const roomBelow = bounds.bottom - point.y;
    const preferredY = above >= bounds.top || roomAbove >= roomBelow ? above : below;
    cardPosition.setValue({
      x: overlayOrigin.current.x + Math.max(bounds.left, Math.min(point.x - panelWidth / 2, bounds.right - panelWidth)),
      y: overlayOrigin.current.y + Math.max(bounds.top, Math.min(preferredY, bounds.bottom - panelHeight)),
    });
  }, [cardPosition]);

  const dismissPreview = useCallback(() => {
    clearExit();
    hoveredMarker.current = null;
    focusedMarker.current = null;
    cardHovered.current = false;
    actionHoverOwner.current = false;
    cardFocused.current = false;
    if (!previewOpen.current && !active.current) return;
    active.current = null;
    previewOpen.current = false;
    propsRef.current.onPreviewChange?.(false);
    const generation = ++animationGeneration.current;
    reveal.stopAnimation();
    Animated.timing(reveal, {
      toValue: 0,
      duration: propsRef.current.reducedMotion ? 0 : 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: nativeDriver,
      isInteraction: false,
    }).start(({ finished }) => {
      if (finished && generation === animationGeneration.current) setPreview(null);
    });
  }, [clearExit, reveal]);

  const nearestService = useCallback((service: Service, offset: PointerOffset) => {
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
    return destination;
  }, []);

  const showPreview = useCallback((service: Service, offset: PointerOffset, source: PreviewSource) => {
    if (!propsRef.current.enabled) return;
    const destination = source === `hover` ? nearestService(service, offset) : service;
    if (!projections.current[destination.id]?.visible) return;
    if (source === `hover`) hoveredMarker.current = destination.id;
    else focusedMarker.current = service.id;
    clearExit();
    if (active.current?.id === destination.id && previewOpen.current) return;
    active.current = destination;
    if (!previewOpen.current) propsRef.current.onPreviewChange?.(true);
    previewOpen.current = true;
    ++animationGeneration.current;
    setPreview(destination);
    placeCard();
    reveal.stopAnimation();
    reveal.setValue(propsRef.current.reducedMotion ? 1 : 0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: propsRef.current.reducedMotion ? 0 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
      isInteraction: false,
    }).start();
  }, [clearExit, nearestService, placeCard, reveal]);

  const scheduleExit = useCallback(() => {
    clearExit();
    if (hoveredMarker.current || cardHovered.current || actionHoverOwner.current || cardFocused.current) return;
    exitTimer.current = setTimeout(() => {
      // Retain the hovered service while crossing into its card. Once the
      // pointer has left both, restore the service that still owns focus.
      if (hoveredMarker.current || cardHovered.current || actionHoverOwner.current || cardFocused.current) return;
      const focusedService = services.find(service => service.id === focusedMarker.current);
      if (focusedService) showPreview(focusedService, null, `focus`);
      else dismissPreview();
    }, 150);
  }, [clearExit, dismissPreview, showPreview]);

  const leavePreview = useCallback((service: Service, source: PreviewSource) => {
    if (source === `hover`) hoveredMarker.current = null;
    else if (focusedMarker.current === service.id) focusedMarker.current = null;
    scheduleExit();
  }, [scheduleExit]);

  const measureViewport = useCallback(() => {
    overlay.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (!measuredWidth || !measuredHeight) return;
      overlayOrigin.current = { x, y };
      const next = {
        left: Math.max(12, insets.left - x + 12),
        top: Math.max(12, insets.top - y + 12),
        right: Math.min(measuredWidth - 12, width - insets.right - x - 12),
        bottom: Math.min(measuredHeight - 12, height - insets.bottom - y - 12),
      };
      viewport.current = next;
      const nextWidth = Math.max(1, Math.min(previewMaxWidth, next.right - next.left));
      const nextHeight = Math.max(1, next.bottom - next.top);
      cardWidth.current = nextWidth;
      setCardSize(previous => previous.width === nextWidth && previous.maxHeight === nextHeight ? previous : { width: nextWidth, maxHeight: nextHeight });
      placeCard();
    });
  }, [height, insets.bottom, insets.left, insets.right, insets.top, placeCard, width]);

  useEffect(measureViewport, [measureViewport]);
  useEffect(() => { if (!props.enabled) dismissPreview(); }, [dismissPreview, props.enabled]);
  useEffect(() => {
    if (props.reducedMotion && previewOpen.current) {
      reveal.stopAnimation();
      reveal.setValue(1);
    }
  }, [props.reducedMotion, reveal]);
  useEffect(() => {
    if (Platform.OS !== `web`) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === `Escape` && previewOpen.current) {
        event.preventDefault();
        event.stopPropagation();
        dismissPreview();
      }
    };
    document.addEventListener(`keydown`, onKeyDown, true);
    return () => document.removeEventListener(`keydown`, onKeyDown, true);
  }, [dismissPreview]);
  useEffect(() => () => {
    clearExit();
    ++animationGeneration.current;
    reveal.stopAnimation();
    if (previewOpen.current) propsRef.current.onPreviewChange?.(false);
  }, [clearExit, reveal]);

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
      if (active.current) {
        if (!projections.current[active.current.id]?.visible) dismissPreview();
        else placeCard();
      }
    },
    hide() {
      projections.current = {};
      for (const service of services) markers.current[service.id]?.hide();
      dismissPreview();
    },
    dismissPreview,
  }), [dismissPreview, placeCard]);

  const activate = useCallback((service: Service, offset: PointerOffset, pointer: boolean) => {
    if (!propsRef.current.enabled || (pointer && propsRef.current.canSelectPointer && !propsRef.current.canSelectPointer())) return;
    const destination = nearestService(service, offset);
    dismissPreview();
    propsRef.current.onSelect(destination);
  }, [dismissPreview, nearestService]);

  const content = preview ? serviceMarkerContent[preview.id] : null;
  return (
    <View ref={overlay} pointerEvents="box-none" onLayout={measureViewport} style={styles.overlay}>
      {services.map((service, index) => (
        <LocationMarker
          key={service.id}
          ref={handle => { markers.current[service.id] = handle; }}
          reducedMotion={props.reducedMotion}
          paused={props.paused}
          enabled={props.enabled}
          service={service}
          index={index}
          highlighted={preview?.id === service.id}
          onActivate={activate}
          onPreview={showPreview}
          onPreviewLeave={leavePreview}
        />
      ))}
      {preview && (
        <GlobeTooltipPortal>
        <Animated.View
          pointerEvents={props.enabled ? `box-none` : `none`}
          style={[styles.previewPosition, { width: cardSize.width, transform: cardPosition.getTranslateTransform() }]}
        >
          <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
            <Pressable
              testID="globe-service-preview"
              accessible={false}
              focusable={false}
              onHoverIn={() => { cardHovered.current = true; clearExit(); }}
              onHoverOut={() => { cardHovered.current = false; scheduleExit(); }}
              onFocus={() => { cardFocused.current = true; clearExit(); }}
              onBlur={() => { cardFocused.current = false; scheduleExit(); }}
              onLayout={event => { cardHeight.current = event.nativeEvent.layout.height; placeCard(); }}
              style={[styles.preview, { maxHeight: cardSize.maxHeight }]}
            >
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: cardSize.maxHeight }}>
                {content?.image && <PreviewImage key={preview.id} source={content.image} alt={content.imageAlt ?? `${preview.name} in ${formatServiceLocation(preview)}`} />}
                <View style={styles.previewBody}>
                  <View style={styles.previewEyebrow}>
                    <View style={[styles.serviceSwatch, { backgroundColor: preview.color }]} />
                    <Text style={styles.previewKicker}>SERVICE {preview.number}</Text>
                  </View>
                  <Text style={styles.previewTitle}>{preview.name}</Text>
                  <Text style={styles.previewLocation}>{preview.city} <Text style={styles.locationSeparator}>/</Text> {preview.region}</Text>
                  <Text nativeID={`globe-preview-description-${preview.id}`} style={styles.previewDescription}>{content?.description ?? preview.description}</Text>
                  <View style={styles.disciplines}>
                    {preview.disciplines.map(discipline => <Text key={discipline} style={styles.discipline}>{discipline}</Text>)}
                  </View>
                  <Pressable
                    testID="globe-preview-city-cta"
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${preview.name} in ${formatServiceLocation(preview)}`}
                    onHoverIn={() => { setActionHovered(true); actionHoverOwner.current = true; clearExit(); }}
                    onHoverOut={() => { setActionHovered(false); actionHoverOwner.current = false; scheduleExit(); }}
                    onFocus={() => { setActionFocused(true); cardFocused.current = true; clearExit(); }}
                    onBlur={() => { setActionFocused(false); cardFocused.current = false; scheduleExit(); }}
                    onPressIn={event => {
                      actionMoved.current = false;
                      actionPointerOrigin.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
                    }}
                    onTouchMove={event => {
                      if (Math.hypot(event.nativeEvent.pageX - actionPointerOrigin.current.x, event.nativeEvent.pageY - actionPointerOrigin.current.y) > 6) actionMoved.current = true;
                    }}
                    onPointerMove={event => {
                      if (event.nativeEvent.buttons && Math.hypot(event.nativeEvent.pageX - actionPointerOrigin.current.x, event.nativeEvent.pageY - actionPointerOrigin.current.y) > 6) actionMoved.current = true;
                    }}
                    onPress={event => {
                      const pointer = isPointerActivation(event);
                      if (!pointer || !actionMoved.current) activate(preview, null, pointer);
                    }}
                    style={({ pressed }) => [styles.previewAction, (actionHovered || actionFocused) && styles.previewActionHighlighted, pressed && styles.previewActionPressed]}
                  >
                    <Text style={styles.previewActionText}>Explore {preview.city}</Text>
                    <Text accessible={false} style={styles.previewActionArrow}>↗</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Animated.View>
        </GlobeTooltipPortal>
      )}
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
  previewPosition: { position: `absolute`, top: 0, left: 0, zIndex: 10 },
  preview: { cursor: `auto`, borderRadius: 20, overflow: `hidden`, borderWidth: 1, borderColor: `rgba(186,221,239,0.24)`, backgroundColor: `rgba(8,21,33,0.98)`, boxShadow: `0 20px 60px rgba(0,0,0,0.35)` },
  previewImage: { width: `100%`, height: 138, backgroundColor: `#142D40` },
  previewBody: { padding: 20 },
  previewEyebrow: { flexDirection: `row`, alignItems: `center`, gap: 7, marginBottom: 9 },
  serviceSwatch: { width: 5, height: 5, borderRadius: 3 },
  previewKicker: { color: `#94ADBC`, fontFamily: `Manrope_600SemiBold`, fontSize: 9, lineHeight: 14, letterSpacing: 1.9 },
  previewTitle: { color: `#F1F7FA`, fontFamily: `Manrope_600SemiBold`, fontSize: 21, lineHeight: 28, letterSpacing: -0.5 },
  previewLocation: { color: `#B5CBD7`, fontFamily: `Manrope_500Medium`, fontSize: 11, lineHeight: 18, marginTop: 4 },
  locationSeparator: { color: `#597B90` },
  previewDescription: { color: `#B8C9D4`, fontFamily: `Manrope_400Regular`, fontSize: 12, lineHeight: 19, marginTop: 15 },
  disciplines: { flexDirection: `row`, flexWrap: `wrap`, gap: 6, marginTop: 14 },
  discipline: { color: `#C0D4DF`, fontFamily: `Manrope_500Medium`, fontSize: 9, lineHeight: 14, borderWidth: 1, borderColor: `rgba(158,197,218,0.17)`, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  previewAction: { minHeight: 43, flexDirection: `row`, justifyContent: `space-between`, alignItems: `center`, borderRadius: 10, borderWidth: 1, borderColor: `rgba(157,218,242,0.25)`, backgroundColor: `rgba(131,204,234,0.08)`, paddingHorizontal: 12, marginTop: 18 },
  previewActionHighlighted: { backgroundColor: `rgba(131,204,234,0.18)`, borderColor: `rgba(157,218,242,0.65)` },
  previewActionPressed: { opacity: 0.72 },
  previewActionText: { color: `#D6EEF8`, fontFamily: `Manrope_600SemiBold`, fontSize: 11, lineHeight: 18 },
  previewActionArrow: { color: `#B2DDED`, fontSize: 19, lineHeight: 23 },
});
