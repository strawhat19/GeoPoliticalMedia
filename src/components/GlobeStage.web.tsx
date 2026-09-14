import { type ReactNode } from 'react';
import { type Animated } from 'react-native';

type GlobeStageProps = { children: ReactNode; height: number; scrollY: Animated.Value };

export const GlobeStage = ({ children, height }: GlobeStageProps) => (
  // Let the browser pin the canvas in the same frame as scrolling. The zero-height
  // sticky layer preserves the sections' flow and the globe's drag responder.
  <div style={{ position: `sticky`, top: 0, height: 0, width: `100%` }}>
    <div style={{ height, width: `100%`, display: `flex`, flexDirection: `column` }}>{children}</div>
  </div>
);
