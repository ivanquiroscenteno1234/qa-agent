import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts", "lib/**/*.test.ts"],
    globals: false,
    passWithNoTests: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "lib/qa/__tests__/__mocks__/server-only.ts")
    }
  }
});
