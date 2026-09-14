import { WebView } from 'react-native-webview';
import { useEffect, useMemo, useRef } from 'react';
import { cityDocument, type CityViewProps } from './cityDocument';

export const CityView = ({ service, reveal, reducedMotion, onReady, onError }: CityViewProps) => {
  const view = useRef<WebView>(null);
  const html = useMemo(() => cityDocument(service, reducedMotion), [service, reducedMotion]);
  useEffect(() => { if (reveal) view.current?.injectJavaScript(`window.revealCity?.();true;`); }, [reveal]);
  return <WebView
    ref={view}
    source={{ html }}
    javaScriptEnabled
    domStorageEnabled
    scrollEnabled={false}
    originWhitelist={[`*`]}
    androidLayerType="hardware"
    onError={onError}
    onMessage={event => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        if (message?.source !== `geocorp-city` || (message.id != null && message.id !== service.id)) return;
        if (message.type === `ready`) {
          onReady();
          if (reveal) view.current?.injectJavaScript(`window.revealCity?.();true;`);
        }
        if (message.type === `error`) onError();
      } catch { onError(); }
    }}
    style={{ flex: 1, backgroundColor: `#06101b` }}
  />;
};
