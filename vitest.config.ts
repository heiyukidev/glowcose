import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/core/src/**/*.test.ts",
      "src/**/*.test.ts",
      "mobile/src/**/*.test.ts",
    ],
  },
});
