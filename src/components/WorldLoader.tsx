import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type WorldLoaderProps = {
  ready: boolean;
  reducedMotion: boolean;
  active: boolean;
  onComplete: () => void;
};

const nativeDriver = Platform.OS !== `web`;
const logo = require(`../../assets/brand/01-core-earth.png`);

/** The Earth renders behind this veil; readiness, never a pretend percentage, releases it. */
export const WorldLoader = ({ ready, reducedMotion, active, onComplete }: WorldLoaderProps) => {
  const mountedAt = useRef(Date.now()).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current;
  const departure = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion || !active) return;
    const animation = Animated.parallel([
      Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 7600, easing: Easing.linear, useNativeDriver: nativeDriver, isInteraction: false })),
      Animated.loop(Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
        Animated.timing(breath, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      ])),
    ]);
    animation.start();
    return () => animation.stop();
  }, [active, reducedMotion, orbit, breath]);

  useEffect(() => {
    if (!ready || !active) return;
    const animation = Animated.parallel([
      Animated.timing(departure, { toValue: 1, duration: reducedMotion ? 0 : 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.timing(veil, { toValue: 0, delay: reducedMotion ? 0 : 140, duration: reducedMotion ? 0 : 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver }),
    ]);
    // Give a warm-cache launch one quiet beat, without delaying slow connections.
    const timer = setTimeout(() => animation.start(({ finished }) => { if (finished) onComplete(); }), reducedMotion ? 0 : Math.max(0, 900 - (Date.now() - mountedAt)));
    return () => { clearTimeout(timer); animation.stop(); };
  }, [ready, active, reducedMotion, mountedAt, veil, departure, onComplete]);

  return (
    <Animated.View testID="world-loader" accessibilityRole="progressbar" accessibilityLabel="Bringing the world into view" accessibilityState={{ busy: !ready }} accessibilityLiveRegion="polite" accessibilityViewIsModal style={[styles.screen, { opacity: veil }]}>
      <LinearGradient colors={[`#071521`, `#030812`, `#030812`]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.content, { opacity: departure.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: departure.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
        <View style={styles.system}>
          <Animated.View style={[styles.halo, { opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }] }]} />
          <View style={styles.outerOrbit} />
          <View style={styles.innerOrbit} />
          <Animated.View style={[styles.orbit, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: [`-45deg`, `315deg`] }) }] }]}>
            <View style={styles.satelliteGlow}><View style={styles.satellite} /></View>
          </Animated.View>
          <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
        </View>
        <Text style={styles.wordmark}>geocorp<Text style={styles.period}>.</Text></Text>
        <Text style={styles.tagline}>A WORLD OF POSSIBILITY</Text>
        <View style={styles.signalTrack}><Animated.View style={[styles.signal, { opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }), transform: [{ scaleX: breath.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]} /></View>
        <Text style={styles.status}>Bringing the world into view</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: { position: `absolute`, inset: 0, zIndex: 20, alignItems: `center`, justifyContent: `center`, backgroundColor: `#030812` },
  content: { alignItems: `center`, padding: 24 },
  system: { width: 216, height: 216, alignItems: `center`, justifyContent: `center`, marginBottom: 24 },
  halo: { position: `absolute`, width: 164, height: 164, borderRadius: 82, backgroundColor: `rgba(55,150,182,0.09)`, borderWidth: 1, borderColor: `rgba(138,221,236,0.08)` },
  outerOrbit: { position: `absolute`, inset: 0, borderRadius: 108, borderWidth: 1, borderColor: `rgba(138,221,236,0.12)` },
  innerOrbit: { position: `absolute`, inset: 20, borderRadius: 88, borderWidth: 1, borderColor: `rgba(138,221,236,0.06)` },
  orbit: { position: `absolute`, inset: 0, alignItems: `center` },
  satelliteGlow: { width: 18, height: 18, marginTop: -8, borderRadius: 9, backgroundColor: `rgba(138,221,236,0.08)`, alignItems: `center`, justifyContent: `center` },
  satellite: { width: 4, height: 4, borderRadius: 2, backgroundColor: `#8ADDEC` },
  logo: { width: 92, height: 92, borderRadius: 46 },
  wordmark: { fontSize: 32, fontWeight: `700`, letterSpacing: -1.4, color: `#F0F4F6` },
  period: { color: `#8ADDEC` },
  tagline: { marginTop: 12, fontSize: 10, letterSpacing: 2.6, color: `#9AAEBD`, textAlign: `center` },
  signalTrack: { marginTop: 38, width: 64, height: 1, backgroundColor: `rgba(138,221,236,0.1)`, alignItems: `center` },
  signal: { width: 64, height: 1, backgroundColor: `#8ADDEC` },
  status: { marginTop: 18, fontSize: 12, letterSpacing: 0.3, color: `#8DA6B7`, textAlign: `center` },
});
