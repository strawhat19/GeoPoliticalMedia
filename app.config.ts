import type { ExpoConfig } from 'expo/config';

process.env.EXPO_PUBLIC_FOLDER = `web`;

const config: ExpoConfig = {
  name: `GeoCorp`,
  slug: `geocorp`,
  scheme: `geocorp`,
  version: `1.0.0`,
  orientation: `default`,
  userInterfaceStyle: `dark`,
  icon: `./assets/brand/01-core-earth.png`,
  plugins: [`expo-font`, `expo-asset`],
  ios: { supportsTablet: true, bundleIdentifier: `com.geocorp.app` },
  android: {
    package: `com.geocorp.app`,
    adaptiveIcon: { backgroundColor: `#050F1C`, foregroundImage: `./assets/brand/01-core-earth.png` },
  },
  web: {
    bundler: `metro`,
    output: `single`,
    themeColor: `#050F1C`,
    name: `GeoCorp — A World of Possibility`,
    favicon: `./assets/brand/01-core-earth.png`,
    description: `Creativity, intelligence, and perspective. Explore Geo Studios in Los Angeles, Geo Data in Georgia, and Geo Political Media in New York.`,
  },
};

export default config;
