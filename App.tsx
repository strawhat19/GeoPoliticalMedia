import { StatusBar } from 'expo-status-bar';
import { Globe } from './src/components/Globe';
import { CityView } from './src/components/CityView';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { services, formatCoordinates, type Service } from './src/data/services';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { AccessibilityInfo, Animated, AppState, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const palette = { ink: `#030812`, text: `#F0F4F6`, muted: `#9AAEBD`, cyan: `#8ADDEC` };
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
      <Text style={[styles.serviceNumber, active && { color: service.color }]}>{service.number}</Text>
      <View style={styles.serviceCopy}>
        <Text style={[styles.serviceName, compact && styles.serviceNameCompact, highlighted && { color: palette.cyan }]}>{service.name}</Text>
        {compact && <Text style={styles.locationText}>{service.city}</Text>}
      </View>
      {!compact && <Text style={styles.locationText}>{service.city}</Text>}
      <Text style={[styles.serviceArrow, highlighted && { color: palette.cyan }]}>{active ? `↘` : `↗`}</Text>
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
  const [active, setActive] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const mapOpacity = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);
  const cityVisible = Boolean(selected && arrived && mapReady && !mapError);
  const pageHeight = Math.max(height - insets.top - insets.bottom, compact ? 800 : 790);
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });

  useEffect(() => {
    const listener = AppState.addEventListener(`change`, state => setActive(state === `active`));
    if (Platform.OS !== `web`) return () => listener.remove();
    const updateVisibility = () => setActive(!document.hidden);
    document.addEventListener(`visibilitychange`, updateVisibility);
    document.title = `GeoCorp — A World of Possibility`;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === `Escape`) { setSelected(null); setPaused(false); setArrived(false); }
    };
    document.addEventListener(`keydown`, keydown);
    return () => { listener.remove(); document.removeEventListener(`keydown`, keydown); document.removeEventListener(`visibilitychange`, updateVisibility); };
  }, []);

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
    setArrived(false);
    setMapReady(false);
    setMapError(false);
    mapOpacity.setValue(0);
    setAttempt(value => value + 1);
    const destination = { ...service };
    setSelected(destination);
    setMapService(destination);
    setPaused(false);
    scroll.current?.scrollTo({ y: 0, animated: !reducedMotion });
  }, [mapOpacity, reducedMotion]);
  const reset = useCallback(() => { setSelected(null); setPaused(false); setArrived(false); setMapError(false); }, []);
  const pauseOnDrag = useCallback(() => setPaused(true), []);
  const onArrival = useCallback(() => setArrived(true), []);
  const onMapReady = useCallback(() => setMapReady(true), []);
  const onMapError = useCallback(() => setMapError(true), []);

  if (!fontsLoaded && !fontError) return <View style={styles.splash}><Image source={logo} style={styles.splashLogo} /><Text style={styles.splashText}>GEOCORP</Text></View>;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={[styles.scene, { minHeight: pageHeight }]}>
          <View style={styles.background}>
            <Globe selected={selected} paused={paused || !active} compact={compact} reducedMotion={reducedMotion} onInteract={pauseOnDrag} onArrival={onArrival} suspended={!active || cityVisible} />
          </View>
          {mapService && <Animated.View style={[styles.background, { opacity: mapOpacity, pointerEvents: cityVisible ? `auto` : `none` }]}>
            <CityView key={attempt} service={mapService} reveal={cityVisible} reducedMotion={reducedMotion} onReady={onMapReady} onError={onMapError} />
          </Animated.View>}
          <LinearGradient colors={[`rgba(3,8,18,0.94)`, `rgba(3,8,18,0.82)`, `rgba(3,8,18,0)`]} locations={[0, 0.66, 1]} style={[styles.topShade, { height: 660, opacity: selected ? 1 : 0.35 }]} />
          <LinearGradient colors={[`rgba(3,8,18,0)`, `rgba(3,8,18,0.82)`]} style={styles.bottomShade} />

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
            <View style={[styles.services, compact && styles.servicesCompact]}>
              {services.map(service => <ServiceRow key={service.id} service={service} compact={compact} active={selected?.id === service.id} onSelect={() => selectService(service)} />)}
            </View>
            <View style={styles.journeyStatus} accessibilityLiveRegion="polite">
              {mapError ? <Pressable onPress={() => selected && selectService(selected)} accessibilityRole="button"><Text style={styles.statusText}>City map unavailable · Retry ↗</Text></Pressable> : <Text style={styles.statusText}>{selected ? cityVisible ? `DRAG TO EXPLORE · PINCH OR SCROLL TO ZOOM` : arrived ? `BRINGING THE CITY INTO VIEW` : `LEAVING ORBIT` : `CHOOSE A DESTINATION. CHANGE YOUR PERSPECTIVE.`}</Text>}
            </View>
          </View>

          <View style={[styles.bottomBar, { left: compact ? 24 : 56, right: compact ? 24 : 56, bottom: 42 }]}>
            <View style={styles.telemetry}>
              <Text style={styles.locationTitle}>{selected ? `⌖  ${formatCoordinates(selected.latitude, selected.longitude)}` : `EARTH / OUR COMMON GROUND`}</Text>
              <LocalTime service={selected} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={selected ? `Return to orbit` : paused ? `Resume orbit` : `Pause orbit`} disabled={!selected && reducedMotion} onPress={selected ? reset : () => setPaused(value => !value)} style={styles.orbitButton}>
              <Text style={styles.orbitIcon}>{selected ? `↶` : paused || reducedMotion ? `▷` : `Ⅱ`}</Text><Text style={styles.orbitText}>{selected ? `RETURN TO ORBIT` : reducedMotion ? `STILL ORBIT` : paused ? `RESUME ORBIT` : `PAUSE ORBIT`}</Text>
            </Pressable>
          </View>
          {!cityVisible && <Text style={styles.attribution} accessibilityRole="link" onPress={() => void Linking.openURL(`https://www.solarsystemscope.com/textures/`)}>Earth: Solar System Scope · CC BY 4.0</Text>}
        </View>
      </ScrollView>
    </View>
  );
};

export default function App() {
  return <SafeAreaProvider><GeoCorp /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scene: { overflow: `hidden`, position: `relative` },
  background: { position: `absolute`, inset: 0 },
  splash: { flex: 1, gap: 12, alignItems: `center`, justifyContent: `center`, backgroundColor: palette.ink },
  splashLogo: { width: 110, height: 110 },
  splashText: { fontSize: 13, letterSpacing: 6, color: palette.text },
  topShade: { position: `absolute`, top: 0, left: 0, right: 0, pointerEvents: `none` },
  bottomShade: { position: `absolute`, bottom: 0, left: 0, right: 0, height: 150, pointerEvents: `none` },
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
  services: { width: `100%`, maxWidth: 670, marginTop: 29 },
  servicesCompact: { marginTop: 22 },
  serviceRow: { gap: 23, minHeight: 64, paddingHorizontal: 17, paddingVertical: 13, flexDirection: `row`, alignItems: `center`, borderBottomWidth: 1, borderBottomColor: `rgba(139,171,191,0.22)`, backgroundColor: `rgba(3,8,18,0.2)` },
  serviceRowCompact: { gap: 14, minHeight: 65, paddingHorizontal: 9, paddingVertical: 10 },
  serviceRowActive: { backgroundColor: `rgba(92,164,190,0.13)`, borderBottomColor: `#8ADDEC` },
  serviceNumber: { fontSize: 12, letterSpacing: 1.1, color: `#8CA7B9`, fontFamily: `Manrope_500Medium` },
  serviceCopy: { flex: 1, gap: 4 },
  serviceName: { fontSize: 25, letterSpacing: -0.65, color: palette.text, fontFamily: `Manrope_500Medium` },
  serviceNameCompact: { fontSize: 20, letterSpacing: -0.4 },
  locationText: { fontSize: 13, color: `#9BB0C1`, fontFamily: `Manrope_400Regular` },
  serviceArrow: { marginLeft: 8, fontSize: 26, color: `#BCD1E0` },
  journeyStatus: { marginTop: 20, minHeight: 22, alignItems: `center` },
  statusText: { fontSize: 12, lineHeight: 18, letterSpacing: 0.7, textAlign: `center`, color: `#9AB0C1`, fontFamily: `Manrope_500Medium` },
  bottomBar: { position: `absolute`, gap: 20, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, pointerEvents: `box-none` },
  telemetry: { gap: 8, flex: 1, pointerEvents: `none` },
  locationTitle: { fontSize: 12, lineHeight: 18, letterSpacing: 0.6, color: `#BED0DD`, fontFamily: `Manrope_500Medium` },
  clock: { fontSize: 12, letterSpacing: 0.7, color: `#A5BDCC`, fontFamily: `Manrope_500Medium` },
  orbitButton: { gap: 10, minHeight: 44, flexDirection: `row`, alignItems: `center` },
  orbitIcon: { fontSize: 21, color: palette.cyan },
  orbitText: { fontSize: 12, letterSpacing: 0.6, color: `#D0E0EB`, fontFamily: `Manrope_500Medium` },
  attribution: { position: `absolute`, bottom: 10, alignSelf: `center`, fontSize: 12, color: `#9CB1C2`, fontFamily: `Manrope_400Regular` },
});
