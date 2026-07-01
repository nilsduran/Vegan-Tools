import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.vegantools.app",
  appName: "Vegan Tools",
  webDir: "dist",
  server: { androidScheme: "https" },
};

export default config;
