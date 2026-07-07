import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "@ui": path.resolve(__dirname, "src/components/svelte"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@constants": path.resolve(__dirname, "src/constants"),
      "@drizzle": path.resolve(__dirname, "drizzle"),
      "@test": path.resolve(__dirname, "src/test"),
      "astro:env/client": path.resolve(
        __dirname,
        "src/test/astro-env-client-stub.ts",
      ),
    },
    conditions: ["browser"],
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.component.test.ts", "src/**/*.store.test.ts"],
    setupFiles: ["src/test/setup-components.ts"],
  },
});
