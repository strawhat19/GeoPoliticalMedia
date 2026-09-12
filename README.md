# GeoCorp

An Expo app for iOS, Android, and the web. Explore Geo Studios in Los Angeles, Geo Data in Georgia (provisionally Atlanta, USA), and Geo Political Media in New York through a rotating 3D Earth. Select a division to fly to its location; drag to rotate, pause the orbit, or return to the world view. The app uses the approved `01-core-earth.png` logo.

## Run The App

Use Node 22.13+ or Node 24.3+ (the machine's default Node 22.9 is below Expo SDK 57's supported range).

```sh
npm install
npm run web
```

For a phone, run `npm start` and scan the QR code with an Expo Go version compatible with SDK 57 on the same network. `npm run android` and `npm run ios` launch configured emulators; iOS Simulator requires macOS. No API keys or backend are required. Native store signing and store publication are separate from this source project.

```sh
npm run typecheck
npm run export:web
```

Web exports go to `dist/`. The app uses `web/` for web-specific public files, keeping the existing concept and video archive in `public/` out of the application download. Service coordinates and copy live in `src/data/services.ts`. The shared globe uses React Three Fiber with Expo GL on native and WebGL on web, 4K local textures, cloud and atmosphere layers, and eased spherical camera interpolation. System reduced-motion settings are respected.

Earth textures are by Solar System Scope / INOVE, CC BY 4.0, resized and merged by Three.js contributors. [Texture sources and license](assets/earth/SOURCES.md).

## GeoPoliticalMedia Archive

A media organization and distribution hub for apps and services, with five planned channels: GeoPoliticalMedia for news and world affairs, Geo Studios for creative production and design, Geo Labs for AI, technology, and science, Geo Data for data, analytics, and APIs, and Geo Gaming for gaming.

[Overview And Launch Plan](docs/overview.md) · [Video And Shorts Ideas](docs/ideas.md) · [Logo Concepts](public/assets/concepts/README.md) · [Video Samples](public/assets/videos/samples/README.md)
