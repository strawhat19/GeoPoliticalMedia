import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { services, type Service } from '../data/services';

type PerspectiveSectionProps = {
  compact: boolean;
  pageHeight: number;
  progress: Animated.Value;
  reducedMotion: boolean;
  revealed: boolean;
  onSelect: (service: Service) => void;
};

const palette = { text: `#F0F4F6`, muted: `#9AAEBD`, cyan: `#8ADDEC` };
const perspectives: Record<Service[`id`], string> = {
  studios: `Ideas brought to life.`,
  data: `Intelligence for your next move.`,
  media: `World affairs, made clearer.`,
};

// The hero can be taller than a short phone's viewport; the story should fit its
// own content so the final scroll position keeps that copy beneath the globe.
export const getPerspectiveSectionHeight = (pageHeight: number, compact: boolean, viewportHeight = pageHeight) =>
  compact ? Math.min(pageHeight, viewportHeight) : pageHeight;

const PerspectiveLink = ({ service, onSelect, compact, enabled }: {
  service: Service;
  onSelect: (service: Service) => void;
  compact: boolean;
  enabled: boolean;
}) => {
  const [highlighted, setHighlighted] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!enabled}
      accessibilityLabel={`${service.name}. ${perspectives[service.id]} Explore ${service.id === `data` ? `Atlanta, Georgia` : service.city}.`}
      onPress={() => onSelect(service)}
      onFocus={() => setHighlighted(true)}
      onBlur={() => setHighlighted(false)}
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      style={({ pressed }) => [styles.link, compact && styles.linkCompact, (highlighted || pressed) && styles.linkHighlighted]}
    >
      <Text style={[styles.number, { color: service.color }]}>{service.number}</Text>
      <View pointerEvents="none" style={[styles.linkCopy, compact && styles.linkCopyCompact]}>
        <Text style={[styles.linkTitle, compact && styles.linkTitleCompact, highlighted && { color: palette.cyan }]}>{service.name}</Text>
        <Text style={styles.linkDescription}>{perspectives[service.id]}</Text>
      </View>
      <Text style={[styles.arrow, highlighted && { color: palette.cyan }]}>↗</Text>
    </Pressable>
  );
};

export const PerspectiveSection = ({ compact, pageHeight, progress, reducedMotion, revealed, onSelect }: PerspectiveSectionProps) => {
  const { height } = useWindowDimensions();
  const reveal = (start: number, end: number, distance = 36) => ({
    opacity: reducedMotion ? 1 : progress.interpolate({
      inputRange: [pageHeight * start, pageHeight * end],
      outputRange: [0, 1],
      extrapolate: `clamp`,
    }),
    ...(reducedMotion ? {} : {
      transform: [{ translateY: progress.interpolate({
        inputRange: [pageHeight * start, pageHeight * end],
        outputRange: [distance, 0],
        extrapolate: `clamp`,
      }) }],
    }),
  });

  return (
    <View
      pointerEvents={revealed ? `box-none` : `none`}
      accessibilityElementsHidden={!revealed}
      importantForAccessibility={revealed ? `auto` : `no-hide-descendants`}
      aria-hidden={!revealed}
      style={[styles.section, {
        minHeight: getPerspectiveSectionHeight(pageHeight, compact, height),
        paddingTop: pageHeight * (compact ? 0.4 : 0.2),
        paddingHorizontal: compact ? 24 : 56,
      }]}
    >
      <View pointerEvents="box-none" style={[styles.content, compact && styles.contentCompact]}>
        <Animated.View pointerEvents="none" style={reveal(0.24, 0.65)}>
          <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>CONNECTED BY PERSPECTIVE</Text>
          <Text accessibilityRole="header" style={[styles.headline, compact && styles.headlineCompact]}>One world.{`\n`}More ways to see it<Text style={styles.period}>.</Text></Text>
          <Text style={[styles.description, compact && styles.descriptionCompact]}>{compact ? `Stories, intelligence, and independent thinking. See what connects us.` : `From the stories we tell to the intelligence we build, discover three perspectives on a changing world.`}</Text>
        </Animated.View>

        <View pointerEvents="box-none" style={[styles.links, compact && styles.linksCompact]}>
          {services.map((service, index) => (
            <Animated.View key={service.id} pointerEvents="box-none" style={reveal(0.25 + index * 0.02, 0.66 + index * 0.03, 24)}>
              <PerspectiveLink compact={compact} service={service} onSelect={onSelect} enabled={revealed} />
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { position: `relative`, backgroundColor: `transparent`, paddingBottom: 48 },
  content: { width: `44%`, maxWidth: 500 },
  contentCompact: { width: `100%`, maxWidth: 500 },
  eyebrow: { color: palette.cyan, fontFamily: `Manrope_600SemiBold`, fontSize: 10, lineHeight: 16, letterSpacing: 1.9, marginBottom: 20 },
  eyebrowCompact: { marginBottom: 16 },
  headline: { color: palette.text, fontFamily: `Manrope_500Medium`, fontSize: 48, lineHeight: 57, letterSpacing: -2.3 },
  headlineCompact: { fontSize: 32, lineHeight: 39, letterSpacing: -1.5 },
  period: { color: palette.cyan },
  description: { color: palette.muted, fontFamily: `Manrope_400Regular`, fontSize: 15, lineHeight: 25, maxWidth: 425, marginTop: 20 },
  descriptionCompact: { fontSize: 14, lineHeight: 23, marginTop: 12 },
  links: { marginTop: 28 },
  linksCompact: { marginTop: 20 },
  link: { minHeight: 80, flexDirection: `row`, alignItems: `center`, gap: 16, paddingVertical: 15, borderTopWidth: 1, borderTopColor: `rgba(139,171,191,0.23)` },
  linkCompact: { minHeight: 68, paddingVertical: 11 },
  linkHighlighted: { borderTopColor: palette.cyan },
  number: { width: 21, fontFamily: `Manrope_500Medium`, fontSize: 10, letterSpacing: 1 },
  linkCopy: { flex: 1, minWidth: 0, gap: 5 },
  linkCopyCompact: { gap: 3 },
  linkTitle: { color: palette.text, fontFamily: `Manrope_600SemiBold`, fontSize: 17, lineHeight: 23, letterSpacing: -0.3 },
  linkTitleCompact: { fontSize: 16, lineHeight: 22 },
  linkDescription: { color: palette.muted, fontFamily: `Manrope_400Regular`, fontSize: 12, lineHeight: 18 },
  arrow: { width: 20, color: palette.muted, fontSize: 23, textAlign: `right` },
});
