import { useEffect, useMemo, useRef } from 'react';
import { cityDocument, type CityViewProps } from './cityDocument';

export const CityView = ({ service, reveal, reducedMotion, onReady, onError }: CityViewProps) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => cityDocument(service, reducedMotion), [service, reducedMotion]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.source !== `geocorp-city`) return;
      if (event.data.type === `ready`) onReady();
      if (event.data.type === `error`) onError();
    };
    window.addEventListener(`message`, receive);
    return () => window.removeEventListener(`message`, receive);
  }, [onReady, onError]);
  useEffect(() => { if (reveal) frame.current?.contentWindow?.postMessage({ type: `reveal` }, `*`); }, [reveal]);
  return <iframe ref={frame} srcDoc={html} tabIndex={reveal ? 0 : -1} aria-hidden={!reveal} title={`Explore ${service.city} in 3D`} sandbox="allow-scripts allow-same-origin allow-popups" style={{ width: `100%`, height: `100%`, border: 0, background: `#06101b` }} />;
};
