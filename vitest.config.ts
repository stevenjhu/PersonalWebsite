import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "cloudflare:workers": resolve(
        __dirname,
        "tests/__mocks__/cloudflare-workers.ts",
      ),
    },
  },
  test: {
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    environmentMatchGlobs: [["tests/unit/contact-form.test.tsx", "jsdom"]],
    environment: "node",
  },
});
