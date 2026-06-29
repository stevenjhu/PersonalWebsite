// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://shiqihu.com",
  integrations: [react()],

  // Fonts are downloaded at build time and self-hosted as woff2 — no runtime
  // request to a third-party font CDN. Astro generates metric-matched fallbacks
  // automatically to avoid layout shift.
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "Hanken Grotesk",
        cssVariable: "--font-hanken-grotesk",
        weights: [400, 500, 600],
        styles: ["normal"],
        // Metric-matched fallback so the swap doesn't shift layout.
        fallbacks: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      {
        provider: fontProviders.google(),
        name: "JetBrains Mono",
        cssVariable: "--font-jetbrains-mono",
        weights: [400, 500],
        styles: ["normal"],
        fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare()
});