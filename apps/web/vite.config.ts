import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  envDir: "../../",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Vegan Tools",
        short_name: "Vegan Tools",
        description: "Evidence-led tools for navigating a non-vegan world.",
        theme_color: "#0f5c45",
        background_color: "#f7f7f2",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          // OpenFreeMap style + TileJSON are unversioned: serve cached, refresh in background.
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/(styles\/[^/]+|planet)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "openfreemap-styles",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Vector tiles (versioned planet path), fonts and sprites are immutable.
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "openfreemap-tiles",
              expiration: {
                maxEntries: 3000,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Raster fallback for devices without WebGL only.
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: {
                maxEntries: 1200,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
            return "vendor-leaflet";
          }
          if (id.includes("node_modules/maplibre-gl") || id.includes("node_modules/@maplibre/")) {
            return "vendor-maplibre";
          }
          if (id.includes("node_modules/@undecaf/barcode-detector-polyfill")) {
            return "vendor-barcode";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/v1": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
