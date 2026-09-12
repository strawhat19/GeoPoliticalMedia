import { StatusBar } from 'expo-status-bar';
import { Globe } from './src/components/Globe';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { services, formatCoordinates, type Service } from './src/data/services';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { AccessibilityInfo, Animated, AppState, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const palette = { ink: `#050F1C`, text: `#F0F4F6`, muted: `#91A1B1`, cyan: `#8ADDEC`, line: `#203040` };
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

const ServiceCard = ({ service, active, compact, onSelect }: { service: Service; active: boolean; compact: boolean; onSelect: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const highlighted = active || hovered;
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      accessibilityLabel={`${service.name}, ${service.city}. Fly to this destination`}
      style={[styles.serviceCard, compact && styles.serviceCardCompact, highlighted && styles.serviceCardActive]}
    >
      <View style={styles.serviceTopline}>
        <Text style={[styles.serviceNumber, active && { color: service.color }]}>{service.number} / {service.id === `studios` ? `CREATE` : service.id === `data` ? `UNDERSTAND` : `INFORM`}</Text>
        <Text style={[styles.serviceArrow, highlighted && { color: palette.cyan, transform: [{ rotate: `45deg` }] }]}>{active ? `−` : `↗`}</Text>
      </View>
      <Text style={[styles.serviceName, compact && styles.serviceNameCompact]}>{service.name}</Text>
      <View style={styles.serviceLocation}>
        <View style={[styles.locationDot, { backgroundColor: active ? service.color : `#557080` }]} />
        <Text style={styles.locationText}>{service.city}</Text>
        {active && <Text style={styles.viewingText}>IN VIEW</Text>}
      </View>
    </Pressable>
  );
};

const GeoCorp = () => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 1000;
  const small = width < 600;
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState<Service | null>(null);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const scroll = useRef<ScrollView>(null);
  const heroHeight = compact ? (small ? 750 : 870) : Math.max(530, Math.min(820, height - 305));
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });

  useEffect(() => {
    const listener = AppState.addEventListener(`change`, state => setActive(state === `active`));
    if (Platform.OS !== `web`) return () => listener.remove();
    const updateVisibility = () => setActive(!document.hidden);
    document.addEventListener(`visibilitychange`, updateVisibility);
    document.title = `GeoCorp — A World of Possibility`;
    document.documentElement.style.backgroundColor = palette.ink;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === `Escape`) { setSelected(null); setPaused(false); }
    };
    document.addEventListener(`keydown`, keydown);
    return () => { listener.remove(); document.removeEventListener(`keydown`, keydown); document.removeEventListener(`visibilitychange`, updateVisibility); };
  }, []);

  useEffect(() => {
    opacity.setValue(reducedMotion ? 1 : 0);
    Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 650, useNativeDriver: true }).start();
  }, [selected, opacity, reducedMotion]);

  const selectService = useCallback((service: Service) => {
    setSelected({ ...service });
    setPaused(false);
    if (compact) scroll.current?.scrollTo({ y: 0, animated: !reducedMotion });
  }, [compact, reducedMotion]);
  const reset = useCallback(() => { setSelected(null); setPaused(false); }, []);
  const pauseOnDrag = useCallback(() => setPaused(true), []);
  const toggleOrbit = () => {
    if (selected) reset();
    else setPaused(value => !value);
  };

  if (!fontsLoaded && !fontError) return <View style={styles.splash}><Image source={logo} style={styles.splashLogo} /><Text style={styles.splashText}>GEOCORP</Text></View>;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView ref={scroll} contentContainerStyle={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="GeoCorp. Return to the world view" style={styles.brand}>
            <Image source={logo} style={[styles.logo, small && { width: 44, height: 44 }]} />
            <Text style={[styles.wordmark, small && { fontSize: 25 }]}>geocorp<Text style={styles.wordmarkPeriod}>.</Text></Text>
          </Pressable>
          {!compact && <View style={styles.headerCenter}><Text style={styles.headerLabel}>INDEPENDENT THINKING.</Text><Text style={styles.headerLabel}>GLOBAL PERSPECTIVE.</Text></View>}
          <Pressable onPress={selected ? reset : () => selectService(services[0])} accessibilityRole="button" style={styles.headerButton}>
            <Text style={styles.headerButtonText}>{selected ? `Our world` : `Our collective`}</Text><Text style={styles.headerButtonArrow}>{selected ? `↶` : `↗`}</Text>
          </Pressable>
        </View>

        <View style={[styles.hero, { height: heroHeight }]}>
          <View style={[styles.globeStage, compact && styles.globeStageCompact, small && styles.globeStageSmall]}>
            <Globe selected={selected} paused={paused || !active} compact={compact} reducedMotion={reducedMotion} onInteract={pauseOnDrag} />
          </View>
          {!compact && <LinearGradient pointerEvents="none" colors={[palette.ink, `rgba(5,15,28,0.92)`, `rgba(5,15,28,0)`]} locations={[0, 0.4, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.readabilityGradient} />}

          <View pointerEvents="box-none" style={[styles.heroContent, compact && styles.heroContentCompact]}>
            <Animated.View style={{ opacity }} pointerEvents="box-none">
              <View style={styles.eyebrowRow}><View style={styles.eyebrowLine} /><Text style={styles.eyebrow}>{selected ? `${selected.name.toUpperCase()} / ${selected.number}` : `ONE PLANET. THREE PERSPECTIVES.`}</Text></View>
              <Text accessibilityRole="header" style={[styles.headline, !compact && { fontSize: Math.min(88, width * 0.063), lineHeight: Math.min(96, width * 0.070) }, compact && styles.headlineCompact, small && styles.headlineSmall, selected?.id === `media` && !compact && { fontSize: Math.min(77, width * 0.057) }]}>
                {selected ? selected.title : `A world of\npossibility`}<Text style={{ color: palette.cyan }}>{selected ? `` : `.`}</Text>
              </Text>
              <Text style={[styles.description, compact && styles.descriptionCompact]}>{selected?.description ?? `Creativity, intelligence, and perspective.\nThree distinct disciplines. One connected world.`}</Text>
              {selected ? (
                <View style={styles.disciplines}>{selected.disciplines.map(discipline => <Text key={discipline} style={styles.discipline}>{discipline}</Text>)}</View>
              ) : (
                <Pressable onPress={() => selectService(services[0])} accessibilityRole="button" style={({ pressed }) => [styles.exploreButton, pressed && { backgroundColor: `#BCECF4` }]}><Text style={styles.exploreText}>Explore our world</Text><Text style={styles.exploreArrow}>↗</Text></Pressable>
              )}
            </Animated.View>
          </View>

          <View pointerEvents="none" style={[styles.locationReadout, compact && styles.locationReadoutCompact]}>
            <View style={styles.readoutLabel}><View style={styles.readoutCross}><View style={styles.crossHorizontal} /><View style={styles.crossVertical} /></View><Text style={styles.readoutTitle}>{selected ? selected.city.toUpperCase() : `EARTH / OUR COMMON GROUND`}</Text></View>
            <Text style={styles.coordinates}>{selected ? formatCoordinates(selected.latitude, selected.longitude) : `25,000 MILES OF POSSIBILITY`}</Text>
            {selected && <Text style={styles.region}>{selected.region}</Text>}
          </View>

          <View style={[styles.heroBottom, compact && styles.heroBottomCompact]}>
            {!compact && <Text style={styles.heroSideNote}>{selected ? `CONNECTED THROUGH GEOCORP` : `BUILT TO SEE THINGS DIFFERENTLY`}</Text>}
            <View style={styles.orbitControls}>
              <Text style={styles.dragHint}>DRAG TO ROTATE</Text>
              <View style={styles.controlDivider} />
              <Pressable onPress={toggleOrbit} accessibilityRole="button" accessibilityLabel={selected ? `Return to orbit` : paused ? `Resume globe rotation` : `Pause globe rotation`} style={styles.orbitButton}>
                <Text style={styles.orbitIcon}>{selected ? `↶` : paused || reducedMotion ? `▷` : `Ⅱ`}</Text><Text style={styles.orbitText}>{selected ? `RETURN TO ORBIT` : paused ? `RESUME ORBIT` : reducedMotion ? `MOTION REDUCED` : `PAUSE ORBIT`}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.collective, compact && styles.collectiveCompact]}>
          <View style={styles.collectiveTop}><Text style={styles.collectiveLabel}>THE GEOCORP COLLECTIVE</Text><Text style={styles.selectLabel}>{small ? `03 DESTINATIONS` : `SELECT A DESTINATION TO EXPLORE ↘`}</Text></View>
          <View style={[styles.services, small && styles.servicesStacked]}>
            {services.map(service => <ServiceCard key={service.id} service={service} compact={small} active={selected?.id === service.id} onSelect={() => selectService(service)} />)}
          </View>
        </View>

        <View style={[styles.footer, compact && styles.footerCompact]}>
          <Text style={styles.copyright}>© {new Date().getFullYear()} GeoCorp</Text>
          {!small && <Text style={styles.footerMessage}>Different disciplines. Shared horizons.</Text>}
          <LocalTime service={selected} />
        </View>
        <View style={styles.attribution}><Text style={styles.attributionText}>Earth imagery: Solar System Scope / INOVE · CC BY 4.0 · via Three.js</Text></View>
      </ScrollView>
    </View>
  );
};

export default function App() {
  return <SafeAreaProvider><GeoCorp /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  page: { flexGrow: 1 },
  splash: { flex: 1, gap: 12, alignItems: `center`, justifyContent: `center`, backgroundColor: palette.ink },
  splashLogo: { width: 110, height: 110 },
  splashText: { fontSize: 13, letterSpacing: 6, color: palette.text },
  header: { zIndex: 2, height: 112, marginHorizontal: 64, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between`, borderBottomWidth: 1, borderBottomColor: palette.line },
  headerCompact: { height: 88, marginHorizontal: 24 },
  brand: { gap: 8, flexDirection: `row`, alignItems: `center` },
  logo: { width: 54, height: 54, borderRadius: 12 },
  wordmark: { fontSize: 30, letterSpacing: -1.4, color: palette.text, fontFamily: `Manrope_800ExtraBold` },
  wordmarkPeriod: { color: palette.cyan },
  headerCenter: { gap: 4, marginLeft: -28 },
  headerLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 1.3, color: palette.muted, fontFamily: `Manrope_500Medium` },
  headerButton: { gap: 24, paddingVertical: 13, flexDirection: `row`, alignItems: `center` },
  headerButtonText: { fontSize: 14, color: palette.text, fontFamily: `Manrope_500Medium` },
  headerButtonArrow: { fontSize: 23, color: palette.cyan },
  hero: { position: `relative`, overflow: `hidden` },
  globeStage: { position: `absolute`, top: -25, bottom: -25, left: `31%`, right: `-9%` },
  globeStageCompact: { top: 315, bottom: 24, left: `-15%`, right: `-15%` },
  globeStageSmall: { top: 333, bottom: 26, left: `-27%`, right: `-27%` },
  readabilityGradient: { position: `absolute`, top: 0, left: 0, bottom: 0, width: `57%` },
  heroContent: { position: `absolute`, top: `13%`, left: 64, right: `52%` },
  heroContentCompact: { top: 36, left: 24, right: 24 },
  eyebrowRow: { gap: 13, marginBottom: 27, flexDirection: `row`, alignItems: `center` },
  eyebrowLine: { width: 25, height: 1, backgroundColor: palette.cyan },
  eyebrow: { fontSize: 12, lineHeight: 17, letterSpacing: 1.5, color: palette.cyan, fontFamily: `Manrope_600SemiBold` },
  headline: { fontSize: 88, lineHeight: 96, letterSpacing: -5.7, color: palette.text, fontFamily: `Manrope_500Medium` },
  headlineCompact: { fontSize: 72, lineHeight: 77, letterSpacing: -4.5 },
  headlineSmall: { fontSize: 55, lineHeight: 59, letterSpacing: -3.1 },
  description: { maxWidth: 400, marginTop: 26, fontSize: 16, lineHeight: 27, color: palette.muted, fontFamily: `Manrope_400Regular` },
  descriptionCompact: { maxWidth: 500, marginTop: 18, fontSize: 16, lineHeight: 25 },
  exploreButton: { gap: 27, marginTop: 30, paddingVertical: 17, paddingHorizontal: 25, borderRadius: 40, alignSelf: `flex-start`, flexDirection: `row`, alignItems: `center`, backgroundColor: palette.cyan },
  exploreText: { fontSize: 14, color: palette.ink, fontFamily: `Manrope_700Bold` },
  exploreArrow: { fontSize: 23, lineHeight: 23, color: palette.ink },
  disciplines: { gap: 8, marginTop: 24, flexDirection: `row`, flexWrap: `wrap` },
  discipline: { paddingVertical: 7, paddingHorizontal: 11, fontSize: 12, borderWidth: 1, borderRadius: 20, color: `#B9CDDC`, borderColor: `#28404F`, fontFamily: `Manrope_500Medium` },
  locationReadout: { position: `absolute`, right: 64, bottom: 100, alignItems: `flex-end`, gap: 7 },
  locationReadoutCompact: { right: 24, bottom: 78 },
  readoutLabel: { gap: 9, flexDirection: `row`, alignItems: `center` },
  readoutTitle: { fontSize: 12, letterSpacing: 1.2, color: palette.text, fontFamily: `Manrope_600SemiBold` },
  readoutCross: { width: 12, height: 12, alignItems: `center`, justifyContent: `center` },
  crossHorizontal: { width: 12, height: 1, backgroundColor: palette.cyan },
  crossVertical: { position: `absolute`, width: 1, height: 12, backgroundColor: palette.cyan },
  coordinates: { fontSize: 12, letterSpacing: 0.5, color: palette.muted, fontFamily: `Manrope_500Medium` },
  region: { fontSize: 12, color: palette.muted, fontFamily: `Manrope_400Regular` },
  heroBottom: { position: `absolute`, bottom: 25, left: 64, right: 64, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  heroBottomCompact: { bottom: 18, left: 24, right: 24, justifyContent: `center` },
  heroSideNote: { fontSize: 12, letterSpacing: 1.2, color: `#8096A8`, fontFamily: `Manrope_500Medium` },
  orbitControls: { gap: 17, flexDirection: `row`, alignItems: `center` },
  dragHint: { fontSize: 12, letterSpacing: 0.6, color: `#8DA4B5`, fontFamily: `Manrope_500Medium` },
  controlDivider: { width: 1, height: 12, backgroundColor: `#304452` },
  orbitButton: { gap: 9, minHeight: 44, flexDirection: `row`, alignItems: `center` },
  orbitIcon: { fontSize: 19, color: palette.cyan },
  orbitText: { fontSize: 12, letterSpacing: 0.6, color: `#B7C8D5`, fontFamily: `Manrope_500Medium` },
  collective: { marginHorizontal: 64 },
  collectiveCompact: { marginHorizontal: 24 },
  collectiveTop: { marginBottom: 19, gap: 10, flexDirection: `row`, justifyContent: `space-between`, flexWrap: `wrap` },
  collectiveLabel: { fontSize: 12, lineHeight: 17, letterSpacing: 1.2, color: palette.muted, fontFamily: `Manrope_600SemiBold` },
  selectLabel: { fontSize: 12, lineHeight: 17, letterSpacing: 0.8, color: `#8096A8`, fontFamily: `Manrope_500Medium` },
  services: { gap: 24, flexDirection: `row` },
  servicesStacked: { gap: 0, flexDirection: `column` },
  serviceCard: { flex: 1, minWidth: 0, paddingTop: 17, paddingBottom: 26, paddingHorizontal: 19, borderTopWidth: 1, borderTopColor: `#344958`, backgroundColor: `rgba(15,31,47,0.36)` },
  serviceCardCompact: { flex: 0, paddingVertical: 18, paddingHorizontal: 16, marginBottom: 12 },
  serviceCardActive: { borderTopColor: palette.cyan, backgroundColor: `#102333` },
  serviceTopline: { flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  serviceNumber: { fontSize: 12, letterSpacing: 1.1, color: `#91A8B8`, fontFamily: `Manrope_500Medium` },
  serviceArrow: { fontSize: 24, lineHeight: 26, color: `#B3C4D1` },
  serviceName: { marginTop: 10, fontSize: 24, letterSpacing: -0.8, color: palette.text, fontFamily: `Manrope_500Medium` },
  serviceNameCompact: { marginTop: 4, fontSize: 24 },
  serviceLocation: { gap: 8, marginTop: 12, flexDirection: `row`, alignItems: `center` },
  locationDot: { width: 4, height: 4, borderRadius: 2 },
  locationText: { fontSize: 14, color: `#8FA6B8`, fontFamily: `Manrope_400Regular` },
  viewingText: { marginLeft: `auto`, fontSize: 12, letterSpacing: 0.7, color: palette.cyan, fontFamily: `Manrope_600SemiBold` },
  footer: { marginHorizontal: 64, paddingTop: 24, paddingBottom: 14, gap: 16, flexDirection: `row`, alignItems: `center`, justifyContent: `space-between` },
  footerCompact: { marginHorizontal: 24 },
  copyright: { fontSize: 12, color: `#8096A8`, fontFamily: `Manrope_400Regular` },
  footerMessage: { fontSize: 12, color: `#8096A8`, fontFamily: `Manrope_400Regular` },
  clock: { fontSize: 12, letterSpacing: 0.7, color: `#8EA5B7`, fontFamily: `Manrope_500Medium` },
  attribution: { paddingBottom: 14, alignItems: `center` },
  attributionText: { fontSize: 12, textAlign: `center`, paddingHorizontal: 24, color: `#8096A8`, fontFamily: `Manrope_400Regular` },
});
