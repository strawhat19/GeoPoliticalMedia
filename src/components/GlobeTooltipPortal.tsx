import { createContext, useContext, useLayoutEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { StyleSheet, View } from 'react-native';

const TooltipLayer = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);

// Keep the hover card above the scrolling hero on web and native. The markers
// themselves remain inside the globe so their drag responder still works.
export const GlobeTooltipProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<ReactNode>(null);
  return (
    <TooltipLayer.Provider value={setContent}>
      <View style={styles.root}>
        {children}
        <View pointerEvents="box-none" style={styles.layer}>{content}</View>
      </View>
    </TooltipLayer.Provider>
  );
};

export const GlobeTooltipPortal = ({ children }: { children: ReactNode }) => {
  const setContent = useContext(TooltipLayer);
  useLayoutEffect(() => {
    setContent?.(children);
    return () => setContent?.(null);
  }, [children, setContent]);
  return setContent ? null : children;
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  layer: { position: `absolute`, inset: 0, zIndex: 30 },
});
