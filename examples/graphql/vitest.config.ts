import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "../../node_modules/.vitest",
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true,
    exclude: ["e2e/**", "infra/**", "node_modules/**", "dist/**", "cdk.out/**"],
    coverage: {
      reportsDirectory: "../../coverage/packages/plugins",
    },
  },
});
