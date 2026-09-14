import { Canvas as WebCanvas, type CanvasProps } from '@react-three/fiber';

export { useLoader } from '@react-three/fiber';

// The sticky canvas keeps its dimensions during scroll; only viewport resizes
// need measuring. Gesture handling lives on the surrounding native responder.
const resize = { scroll: false, debounce: { scroll: 0, resize: 0 } };

export const Canvas = (props: CanvasProps) => <WebCanvas {...props} resize={resize} />;
