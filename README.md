# GeoCorp

An Expo app for iOS, Android, and the web. The space hero places Geo Studios, Geo Data, and Geo Political Media in one responsive row above an oversized rotating Earth, with a layered star field, a small distant moon, and a transparent header. The space backdrop is rendered procedurally without additional image downloads. An orbital launch screen waits for fonts and the first textured Earth frame, then softly fades into the scene. Select a division to descend from orbit into a real 3D map of Los Angeles, Atlanta in Georgia, or New York. The globe hands off after a short flight and holds at regional scale while map tiles load, keeping Earth imagery sharp. Drag, pinch, or scroll to explore streets and buildings, then return to orbit. The app uses the approved `01-core-earth.png` logo.

## Run The App

Use Node 22.13+ or Node 24.3+ (the machine's default Node 22.9 is below Expo SDK 57's supported range).

```sh
npm install
npm run web
```

For a phone, run `npm start` and scan the QR code with an Expo Go version compatible with SDK 57 on the same network. `npm run android` and `npm run ios` launch configured emulators; iOS Simulator requires macOS. No API keys or backend are required. The city maps require internet access. Native store signing and store publication are separate from this source project.

```sh
npm run typecheck
npm run export:web
```

Web exports go to `dist/`. The app uses `web/` for web-specific public files, keeping the existing concept and video archive in `public/` out of the application download. Service coordinates and copy live in `src/data/services.ts`. The shared globe uses React Three Fiber with Expo GL on native and WebGL on web, 4K local textures, cloud and atmosphere layers, and eased spherical camera interpolation. System reduced-motion settings are respected.

Earth textures are by Solar System Scope / INOVE, CC BY 4.0, resized and merged by Three.js contributors. [Texture sources and license](assets/earth/SOURCES.md).

Scroll down or use “Explore our perspectives” in the hero to bring the same Earth up to the right beside the three perspectives. The web canvas stays pinned during scrolling, while a damped camera transition smoothly changes the globe's apparent size and position. Movement accelerates rotation, then it settles back to its idle orbit. On mobile, the smaller globe sits above the supporting content. Earth rotates automatically, pauses while dragging or inspecting a marker, and resumes 0.6 seconds after a drag is released. Three pulsing markers track Los Angeles, Atlanta, and New York on the Earth; tap a marker to open its division's city view. Markers on the far side of the Earth are hidden. Reduced motion keeps the markers still and disables automatic rotation, smooth scrolling, and animated camera easing.

City maps use [MapLibre GL JS](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/) and OpenStreetMap data. The city map document is shared between web iframe and native WebView. Buildings use actual mapped footprints and available height data; they are not photogrammetry. Keep the built-in attribution visible. The globe pauses rendering once the map is visible, and map load failures expose a retry action.

## Customize Globe Markers

Edit `src/config/globeMarkers.ts`. `GLOBE_PULSE_COLOR` controls the pulsing rings and glow for all three dots. The dot cores retain their service colors. An individual service can override its pulse color, tooltip description, or add an image:

```ts
export const GLOBE_PULSE_COLOR = `#8ADDEC`;

export const serviceMarkerContent: Record<ServiceId, ServiceMarkerContent> = {
  studios: {
    pulseColor: `#E3B779`, // Optional; omit to use the global color.
    description: `Your custom introduction to Geo Studios.`,
    image: require('../../assets/brand/01-core-earth.png'),
    imageAlt: `GeoCorp Earth logo`,
  },
  data: {},
  media: {},
};
```

For your own photograph, replace the example image with a local asset or `{ uri: 'https://your-domain.com/image.jpg' }`. Omit `image` for a text-only card. Tooltips always identify the service and location, with its description and disciplines from `src/data/services.ts` unless customized. Hover or keyboard focus reveals the card; the Earth holds still while you read it. Clicking a dot still opens its city directly. Reduced motion shows the card without animated movement.

## GeoPoliticalMedia Archive

A media organization and distribution hub for apps and services, with five planned channels: GeoPoliticalMedia for news and world affairs, Geo Studios for creative production and design, Geo Labs for AI, technology, and science, Geo Data for data, analytics, and APIs, and Geo Gaming for gaming.

[Overview And Launch Plan](docs/overview.md) · [Video And Shorts Ideas](docs/ideas.md) · [Logo Concepts](public/assets/concepts/README.md) · [Video Samples](public/assets/videos/samples/README.md)
