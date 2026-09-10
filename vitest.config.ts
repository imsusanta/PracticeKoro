import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Tested layer: services only (pages/components have zero tests yet).
      // Ratchet thresholds: green now, raise as coverage grows toward 80.
      include: ["src/services/**/*.ts"],
      thresholds: {
        lines: 25,
        branches: 45,
        functions: 35,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
