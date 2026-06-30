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

  // README is rendered at build time and restyled to match the site's type.
  // Skip Shiki's hard-coded color theme so code blocks inherit the warm,
  // theme-aware prose styling instead of a fixed dark background.
  markdown: {
    syntaxHighlight: false,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare({ imageService: 'compile' })
});