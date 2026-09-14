import { StatusBar } from 'expo-status-bar';
import { Globe } from './src/components/Globe';
import { GlobeStage } from './src/components/GlobeStage';
import { CityView } from './src/components/CityView';
import { WorldLoader } from './src/components/WorldLoader';
import { PerspectiveSection } from './src/components/PerspectiveSection';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { services, formatCoordinates, type Service } from './src/data/services';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { AccessibilityInfo, Animated, AppState, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

const palette = { ink: `#030812`, text: `#F0F4F6`, muted: `#9AAEBD`, cyan: `#8ADDEC` };
const globeTextShadow = { textShadowColor: `rgba(3,8,18,0.95)`, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };
const logo = require(`./assets/brand/01-core-earth.png`);

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const listener = AccessibilityInfo.addEventListener(`reduceMotionChanged`, setReduced);
    return () => listener.remove();
  }, []);
  return reduced;
};

const LocalTime = ({ service }: { service: Service | null }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);
  const value = new Intl.DateTimeFormat(`en-US`, { hour: `2-digit`, minute: `2-digit`, hour12: false, timeZone: service?.timezone ?? `UTC` }).format(now);
  return <Text style={styles.clock}>{value} {service ? `LOCAL TIME` : `UTC`}</Text>;
};

const ServiceRow = ({ service, active, compact, onSelect }: { service: Service; active: boolean; compact: boolean; onSelect: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const highlighted = active || hovered;
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onBlur={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityLabel={`${service.name}, ${service.city}. Explore the city`}
      style={[styles.serviceRow, compact && styles.serviceRowCompact, highlighted && styles.serviceRowActive]}
    >
      <View style={styles.serviceHeading}>
        <Text style={[styles.serviceNumber, active && { color: service.color }]}>{service.number}</Text>
        <Text style={[styles.serviceArrow, compact && styles.serviceArrowCompact, highlighted && { color: palette.cyan }]}>{active ? `↘` : `↗`}</Text>
      </View>
      <View style={styles.serviceCopy}>
        <Text style={[styles.serviceName, compact && styles.serviceNameCompact, highlighted && { color: palette.cyan }]}>{service.name}</Text>
        <Text style={[styles.locationText, compact && styles.locationTextCompact]}>{service.city}</Text>
      </View>
    </Pressable>
  );
};

const PerspectiveButton = ({ onPress }: { onPress: () => void }) => {
  const [highlighted, setHighlighted] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Scrolls to the three perspectives section"
      onPress={onPress}
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      onFocus={() => setHighlighted(true)}
      onBlur={() => setHighlighted(false)}
      style={({ pressed }) => [styles.perspectiveButton, (highlighted || pressed) && styles.perspectiveButtonActive]}
    >
      <Text style={styles.perspectiveButtonText}>Explore our perspectives</Text>
      <Text style={styles.perspectiveButtonArrow}>↓</Text>
    </Pressable>
  );
};

const GeoCorp = () => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 700;
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState<Service | null>(null);
  const [mapService, setMapService] = useState<Service | null>(null);
  const [paused, setPaused] = useState(false);
  const [dragPaused, setDragPaused] = useState(false);
  const dragResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mapGeneration = useRef(0);
  const [globeReady, setGlobeReady] = useState(false);
  const [globeError, setGlobeError] = useState(false);
  const [entered, setEntered] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const mapOpacity = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollMotion = useRef({ progress: 0, velocity: 0, updatedAt: 0 });
  const lastScroll = useRef({ y: 0, time: 0 });
  const [storyRevealed, setStoryRevealed] = useState(false);
  const [returningToTop, setReturningToTop] = useState(false);
  const storyWasRevealed = useRef(false);
  const cityVisible = Boolean(selected && arrived && mapReady && !mapError);
  const pageHeight = Math.max(height - insets.top - insets.bottom, compact ? 800 : 790);
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });

  const clearDragPause = useCallback(() => {
    if (dragResumeTimer.current) clearTimeout(dragResumeTimer.current);
    dragResumeTimer.current = null;
    setDragPaused(false);
  }, []);
  const reset = useCallback(() => {
    clearDragPause();
    setReturningToTop(false);
    setSelected(null); setPaused(false); setArrived(false); setMapError(false);
    scroll.current?.scrollTo({ y: 0, animated: !reducedMotion });
  }, [clearDragPause, reducedMotion]);
  const explorePerspectives = useCallback(() => {
    scroll.current?.scrollTo({ y: pageHeight, animated: !reducedMotion });
  }, [pageHeight, reducedMotion]);

  useEffect(() => () => { if (dragResumeTimer.current) clearTimeout(dragResumeTimer.current); }, []);

  useEffect(() => {
    const progress = Math.min(1, lastScroll.current.y / pageHeight);
    scrollMotion.current = { progress, velocity: 0, updatedAt: Date.now() };
    const revealed = !selected && (reducedMotion || progress >= 0.3);
    storyWasRevealed.current = revealed;
    setStoryRevealed(revealed);
  }, [pageHeight, selected, reducedMotion]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    const now = Date.now();
    const elapsed = Math.min(80, Math.max(16, now - lastScroll.current.time));
    const progress = Math.min(1, y / pageHeight);
    scrollMotion.current = { progress, velocity: selected ? 0 : (y - lastScroll.current.y) / pageHeight / (elapsed / 1000), updatedAt: now };
    lastScroll.current = { y, time: now };
    if (selected && y <= 1) setReturningToTop(false);
    const revealed = !selected && (reducedMotion || progress >= 0.3);
    if (revealed !== storyWasRevealed.current) {
      storyWasRevealed.current = revealed;
      setStoryRevealed(revealed);
    }
  }, [pageHeight, reducedMotion, selected]);

  useEffect(() => {
    const listener = AppState.addEventListener(`change`, state => setActive(state === `active`));
    if (Platform.OS !== `web`) return () => listener.remove();
    const updateVisibility = () => setActive(!document.hidden);
    document.addEventListener(`visibilitychange`, updateVisibility);
    document.title = `GeoCorp — A World of Possibility`;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === `Escape`) reset();
    };
    document.addEventListener(`keydown`, keydown);
    return () => { listener.remove(); document.removeEventListener(`keydown`, keydown); document.removeEventListener(`visibilitychange`, updateVisibility); };
  }, [reset]);

  useEffect(() => {
    opacity.setValue(reducedMotion ? 1 : 0);
    const animation = Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 550, useNativeDriver: Platform.OS !== `web` });
    animation.start();
    return () => animation.stop();
  }, [selected, opacity, reducedMotion]);

  useEffect(() => {
    const animation = Animated.timing(mapOpacity, { toValue: cityVisible ? 1 : 0, duration: reducedMotion ? 0 : 1200, useNativeDriver: Platform.OS !== `web` });
    animation.start(({ finished }) => { if (finished && !selected) setMapService(null); });
    return () => animation.stop();
  }, [cityVisible, mapOpacity, reducedMotion, selected]);

  const selectService = useCallback((service: Service) => {
    clearDragPause();
    // Keep the section in flow until the animated return reaches the header.
    setReturningToTop(lastScroll.current.y > 1);
    setArrived(globeError);
    setMapReady(false);
    setMapError(false);
    mapOpacity.setValue(0);
    setAttempt(++mapGeneration.current);
    const destination = { ...service };
    setSelected(destination);
    setMapService(destination);
    setPaused(false);
    scroll.current?.scrollTo({ y: 0, animated: !reducedMotion });
  }, [mapOpacity, reducedMotion, globeError, clearDragPause]);
  const pauseOnDrag = useCallback(() => {
    if (dragResumeTimer.current) clearTimeout(dragResumeTimer.current);
    dragResumeTimer.current = null;
    setDragPaused(true);
  }, []);
  const resumeAfterDrag = useCallback(() => {
    if (dragResumeTimer.current) clearTimeout(dragResumeTimer.current);
    dragResumeTimer.current = setTimeout(() => { dragResumeTimer.current = null; setDragPaused(false); }, 600);
  }, []);
  const toggleOrbit = useCallback(() => {
    if (paused || dragPaused) { clearDragPause(); setPaused(false); }
    else setPaused(true);
  }, [paused, dragPaused, clearDragPause]);
  const onArrival = useCallback(() => { if (attempt === mapGeneration.current) setArrived(true); }, [attempt]);
  const onMapReady = useCallback(() => { if (attempt === mapGeneration.current) setMapReady(true); }, [attempt]);
  const onMapError = useCallback(() => { if (attempt === mapGeneration.current) setMapError(true); }, [attempt]);
  const onGlobeReady = useCallback(() => { setGlobeReady(true); setGlobeError(false); }, []);
  const onGlobeError = useCallback(() => { setGlobeError(true); setArrived(true); }, []);
  const onEntered = useCallback(() => setEntered(true), []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.ScrollView ref={scroll} pointerEvents={entered ? `auto` : `none`} accessibilityElementsHidden={!entered} importantForAccessibility={entered ? `auto` : `no-hide-descendants`} aria-hidden={!entered} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== `web`, listener: handleScroll })} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={[styles.scene, { minHeight: pageHeight }]}>
          <GlobeStage height={pageHeight} scrollY={scrollY}>
            <Globe selected={selected} paused={paused || dragPaused || !active} compact={compact} reducedMotion={reducedMotion} scrollMotion={scrollMotion} onSelect={selectService} onInteract={pauseOnDrag} onInteractEnd={resumeAfterDrag} onArrival={onArrival} onReady={onGlobeReady} onError={onGlobeError} suspended={!active || cityVisible} />
          </GlobeStage>
          <View pointerEvents="box-none" style={{ minHeight: pageHeight }}>
            {mapService && <Animated.View style={[styles.background, { opacity: mapOpacity, pointerEvents: cityVisible ? `auto` : `none` }]}>
              <CityView key={attempt} service={mapService} reveal={cityVisible} reducedMotion={reducedMotion} onReady={onMapReady} onError={onMapError} />
            </Animated.View>}
            <LinearGradient colors={[`rgba(3,8,18,0.94)`, `rgba(3,8,18,0.82)`, `rgba(3,8,18,0)`]} locations={[0, 0.66, 1]} style={[styles.topShade, { height: 660, opacity: selected ? 1 : 0.35 }]} />

            <View style={[styles.header, { paddingTop: compact ? 18 : 25, paddingHorizontal: compact ? 24 : 56 }]}>
              <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="GeoCorp. Return to orbit" style={styles.brand}>
                <Image source={logo} style={styles.logo} /><Text style={styles.wordmark}>geocorp<Text style={styles.wordmarkPeriod}>.</Text></Text>
              </Pressable>
              {!compact && <Text style={styles.headerLabel}>INDEPENDENT THINKING. GLOBAL PERSPECTIVE.</Text>}
              <Pressable onPress={selected ? reset : () => selectService(services[0])} accessibilityRole="button" style={styles.headerButton}>
                <Text style={styles.headerButtonText}>{selected ? `Back to Earth` : `Explore`}</Text><Text style={styles.headerArrow}>{selected ? `↶` : `↗`}</Text>
              </Pressable>
            </View>

            <View style={[styles.hero, { paddingTop: 30, paddingHorizontal: compact ? 24 : 40 }]}>
              <Animated.View style={[styles.introduction, { opacity }]}>
                <Text style={styles.eyebrow}>{selected ? `${cityVisible ? `ON THE GROUND` : `DESTINATION`} / ${selected.region.toUpperCase()}` : `ONE PLANET. THREE PERSPECTIVES.`}</Text>
                <Text accessibilityRole="header" style={[styles.headline, compact && styles.headlineCompact]}>{selected ? (selected.id === `data` ? `Atlanta, Georgia` : selected.city) : `A world of possibility`}<Text style={styles.wordmarkPeriod}>.</Text></Text>
                <Text style={[styles.description, compact && styles.descriptionCompact]}>{selected ? selected.disciplines.join(`  ·  `) : `Creativity, intelligence, and perspective. Connected by one world.`}</Text>
              </Animated.View>
              {!selected && <PerspectiveButton onPress={explorePerspectives} />}
              <View style={[styles.services, compact && styles.servicesCompact]}>
                {services.map(service => <ServiceRow key={service.id} service={service} compact={compact} active={selected?.id === service.id} onSelect={() => selectService(service)} />)}
              </View>
              <View style={styles.journeyStatus} accessibilityLiveRegion="polite">
                {mapError ? <Pressable onPress={() => selected && selectService(selected)} accessibilityRole="button"><Text style={styles.statusText}>City map unavailable · Retry ↗</Text></Pressable> : <Text style={styles.statusText}>{selected ? cityVisible ? `DRAG TO EXPLORE · PINCH OR SCROLL TO ZOOM` : arrived ? `BRINGING THE CITY INTO VIEW` : `LEAVING ORBIT` : compact ? `CHOOSE A CITY TO EXPLORE.` : `CHOOSE A DESTINATION. CHANGE YOUR PERSPECTIVE.`}</Text>}
              </View>
            </View>

            <View style={[styles.bottomBar, { left: compact ? 24 : 56, right: compact ? 24 : 56, bottom: 42 }]}>
              <View style={styles.telemetry}>
                <Text style={styles.locationTitle}>{selected ? `⌖  ${formatCoordinates(selected.latitude, selected.longitude)}` : `EARTH / OUR COMMON GROUND`}</Text>
                <LocalTime service={selected} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={selected ? `Return to orbit` : paused || dragPaused ? `Resume orbit` : `Pause orbit`} disabled={!selected && reducedMotion} onPress={selected ? reset : toggleOrbit} style={styles.orbitButton}>
                <Text style={styles.orbitIcon}>{selected ? `↶` : paused || dragPaused || reducedMotion ? `▷` : `Ⅱ`}</Text><Text style={styles.orbitText}>{selected ? `RETURN TO ORBIT` : reducedMotion ? `STILL ORBIT` : paused ? `RESUME ORBIT` : dragPaused ? `RESUMING SOON` : `PAUSE ORBIT`}</Text>
              </Pressable>
            </View>
          </View>
          {(!selected || returningToTop) && <PerspectiveSection compact={compact} pageHeight={pageHeight} progress={scrollY} reducedMotion={reducedMotion} revealed={!selected && (storyRevealed || reducedMotion)} onSelect={selectService} />}
        </View>
      </Animated.ScrollView>
      {entered && !cityVisible && <Text style={[styles.attribution, { bottom: 10 + insets.bottom }]} accessibilityRole="link" onPress={() => void Linking.openURL(`https://www.solarsystemscope.com/textures/`)}>Earth: Solar System Scope · CC BY 4.0</Text>}
      {!entered && <WorldLoader ready={Boolean((fontsLoaded || fontError) && (globeReady || globeError))} reducedMotion={reducedMotion} active={active} onComplete={onEntered} />}
    </View>
  );
};

export default function App() {
  return <SafeAreaProvider><GeoCorp /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scene: { overflow: Platform.OS === `web` ? `visible` : `hidden`, position: `relative` },
  background: { position: `absolute`, inset: 0 },
  topShade: { position: `absolute`, top: 0, left: 0, right: 0, pointerEvents: `none` },
  header: { zIndex: 3, gap: 20, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, backgroundColor: `transparent` },
  brand: { gap: 8, flexDirection: `row`, alignItems: `center` },
  logo: { width: 44, height: 44, borderRadius: 22 },
  wordmark: { fontSize: 28, letterSpacing: -1.3, color: palette.text, fontFamily: `Manrope_800ExtraBold` },
  wordmarkPeriod: { color: palette.cyan },
  headerLabel: { fontSize: 12, letterSpacing: 1.1, color: palette.muted, fontFamily: `Manrope_500Medium` },
  headerButton: { gap: 17, minHeight: 44, flexDirection: `row`, alignItems: `center` },
  headerButtonText: { fontSize: 14, color: palette.text, fontFamily: `Manrope_500Medium` },
  headerArrow: { fontSize: 23, color: palette.cyan },
  hero: { zIndex: 2, alignItems: `center`, pointerEvents: `box-none` },
  introduction: { gap: 15, width: `100%`, maxWidth: 1100, alignItems: `center`, pointerEvents: `none` },
  eyebrow: { fontSize: 12, lineHeight: 18, letterSpacing: 2, textAlign: `center`, color: palette.cyan, fontFamily: `Manrope_600SemiBold` },
  headline: { fontSize: 66, lineHeight: 79, letterSpacing: -3.6, textAlign: `center`, color: palette.text, fontFamily: `Manrope_500Medium` },
  headlineCompact: { fontSize: 43, lineHeight: 49, letterSpacing: -2.2 },
  description: { fontSize: 16, lineHeight: 25, textAlign: `center`, color: palette.muted, fontFamily: `Manrope_400Regular` },
  descriptionCompact: { maxWidth: 330, fontSize: 16, lineHeight: 24 },
  perspectiveButton: { marginTop: 24, minHeight: 48, paddingVertical: 11, paddingHorizontal: 21, flexDirection: `row`, alignItems: `center`, gap: 17, borderWidth: 1, borderColor: `rgba(138,221,236,0.4)`, borderRadius: 28, backgroundColor: `rgba(52,116,139,0.14)` },
  perspectiveButtonActive: { borderColor: palette.cyan, backgroundColor: `rgba(92,164,190,0.25)` },
  perspectiveButtonText: { color: palette.text, fontSize: 14, lineHeight: 22, fontFamily: `Manrope_600SemiBold` },
  perspectiveButtonArrow: { color: palette.cyan, fontSize: 20, lineHeight: 24 },
  services: { width: `100%`, maxWidth: 960, marginTop: 29, flexDirection: `row`, alignItems: `stretch`, gap: 20 },
  servicesCompact: { marginTop: 22, gap: 8 },
  serviceRow: { flex: 1, minWidth: 0, gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: `rgba(139,171,191,0.32)`, backgroundColor: `rgba(3,8,18,0.2)` },
  serviceRowCompact: { gap: 8, paddingHorizontal: 7, paddingVertical: 10 },
  serviceRowActive: { backgroundColor: `rgba(92,164,190,0.13)`, borderBottomColor: `#8ADDEC` },
  serviceHeading: { flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  serviceNumber: { fontSize: 12, letterSpacing: 1.1, color: `#8CA7B9`, fontFamily: `Manrope_500Medium` },
  serviceCopy: { flex: 1, gap: 6 },
  serviceName: { flex: 1, fontSize: 24, lineHeight: 31, letterSpacing: -0.65, color: palette.text, fontFamily: `Manrope_500Medium` },
  serviceNameCompact: { minHeight: 57, fontSize: 14, lineHeight: 19, letterSpacing: -0.3 },
  locationText: { fontSize: 13, color: `#9BB0C1`, fontFamily: `Manrope_400Regular` },
  locationTextCompact: { fontSize: 11, lineHeight: 16 },
  serviceArrow: { fontSize: 22, lineHeight: 25, color: `#BCD1E0` },
  serviceArrowCompact: { fontSize: 18, lineHeight: 20 },
  journeyStatus: { marginTop: 20, minHeight: 22, alignItems: `center` },
  statusText: { ...globeTextShadow, fontSize: 12, lineHeight: 18, letterSpacing: 0.7, textAlign: `center`, color: `#9AB0C1`, fontFamily: `Manrope_500Medium` },
  bottomBar: { position: `absolute`, gap: 20, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, pointerEvents: `box-none` },
  telemetry: { gap: 8, flex: 1, pointerEvents: `none` },
  locationTitle: { ...globeTextShadow, fontSize: 12, lineHeight: 18, letterSpacing: 0.6, color: `#BED0DD`, fontFamily: `Manrope_500Medium` },
  clock: { ...globeTextShadow, fontSize: 12, letterSpacing: 0.7, color: `#A5BDCC`, fontFamily: `Manrope_500Medium` },
  orbitButton: { gap: 10, minHeight: 44, flexDirection: `row`, alignItems: `center` },
  orbitIcon: { ...globeTextShadow, fontSize: 21, color: palette.cyan },
  orbitText: { ...globeTextShadow, fontSize: 12, letterSpacing: 0.6, color: `#D0E0EB`, fontFamily: `Manrope_500Medium` },
  attribution: { position: `absolute`, zIndex: 5, alignSelf: `center`, maxWidth: `96%`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: `rgba(3,8,18,0.88)`, fontSize: 12, textAlign: `center`, color: `#9CB1C2`, fontFamily: `Manrope_400Regular` },
});
