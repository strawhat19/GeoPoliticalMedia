import { type ReactNode } from 'react';
import { Animated, StyleSheet } from 'react-native';

type GlobeStageProps = { children: ReactNode; height: number; scrollY: Animated.Value };

export const GlobeStage = ({ children, height, scrollY }: GlobeStageProps) => (
  <Animated.View style={[styles.stage, { height, transform: [{ translateY: scrollY }] }]}>
    {children}
  </Animated.View>
);

const styles = StyleSheet.create({
  stage: { position: `absolute`, top: 0, left: 0, right: 0 },
});
