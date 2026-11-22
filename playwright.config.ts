import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { SCANNED_GTIN, writeBarcodeVideo } from "./e2e/support/barcode-video";

const fakeCameraVideo = resolve(".e2e-cache/ean13.y4m") // outside test-results/, which Playwright empties on start;
writeBarcodeVideo(fakeCameraVideo, SCANNED_GTIN);

const fakeCamera = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-video-capture=${fakeCameraVideo}`,
];

/**
 * End-to-end tests against the production build (vite preview), in a desktop
 * and a mobile profile. The API is mocked per test, so these never call
 * Geoapify, Gemini or Supabase.
 *
 * Chromium on Linux and Windows has no native BarcodeDetector, so the scanner
 * runs on the bundled ZXing reader: the same path as iPhone Safari and Firefox.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    permissions: ["camera"],
    locale: "en-GB",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], launchOptions: { args: fakeCamera } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], launchOptions: { args: fakeCamera } },
    },
  ],
  webServer: {
    command: "npm run preview -w @vegan-tools/web -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
