import { Canvas as NativeCanvas, type CanvasProps } from '@react-three/fiber/native';

export { useLoader } from '@react-three/fiber/native';
export const Canvas = ({ dpr, ...props }: CanvasProps & { dpr?: [number, number] }) => <NativeCanvas {...props} />;
