import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.picxel.ios",
  appName: "Fractix",
  webDir: "dist/public",
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
  server: {
    // Bundled assets only; API calls use VITE_API_URL baked in at build time.
    androidScheme: "https",
  },
};

export default config;
