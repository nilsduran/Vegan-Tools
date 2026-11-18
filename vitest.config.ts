import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
    // e2e/ holds Playwright specs, run with npm run test:e2e.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", "e2e/**"],
    fileParallelism: false,
    unstubGlobals: true,
  },
});
