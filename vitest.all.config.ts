import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    exclude: ["e2e/**", "tools/media/**", "node_modules/**", "dist/**", "release-artifacts/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage-all",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/**/*.d.ts", "src/main.tsx", "src/domain/types.ts"],
      thresholds: {
        // Floors sit just under the 0.1.0-beta.1 suite, so a drop fails the run.
        statements: 81,
        lines: 89,
        functions: 76,
        branches: 73,
      },
    },
  },
});
