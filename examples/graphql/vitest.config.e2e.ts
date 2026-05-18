import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "../../../node_modules/.vitest",
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 600_000,
    fileParallelism: false,
    globalSetup: ["./e2e/globalSetup.ts"],
    include: ["e2e/tests/**/*.test.ts"],
  },
});
