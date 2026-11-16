import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Engine and domain tests must stay DOM-free — that is enforced by
    // running them in the plain node environment. Any test that needs a
    // DOM opts in explicitly with a `@vitest-environment jsdom` docblock
    // at the top of its file.
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.*", "src/app/**"],
    },
  },
});
