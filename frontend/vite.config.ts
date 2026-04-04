import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs";
/// <reference types="vitest" />

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, "..");

  // Only prefer .env.prod over .env during production builds.
  // Local dev (mode !== 'production') always uses .env so the test Turnstile
  // key and localhost settings are active.
  const prodEnvPath = path.join(rootDir, ".env.prod");
  const envFilePath =
    mode === "production" && fs.existsSync(prodEnvPath)
      ? prodEnvPath
      : path.join(rootDir, ".env");

  // Parse the chosen env file and merge into process.env so loadEnv picks it up.
  const fileContents = fs.existsSync(envFilePath)
    ? fs.readFileSync(envFilePath, "utf-8")
    : "";
  for (const line of fileContents.split("\n")) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (!(key in process.env)) process.env[key] = value.trim();
    }
  }

  const env = loadEnv(mode, rootDir, "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Bug B fix: non-blocking CSS injection
      {
        name: "non-blocking-css",
        enforce: "post" as const,
        transformIndexHtml: {
          order: "post" as const,
          handler(html: string) {
            return html.replace(
              /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
              (_, href) =>
                `<link rel="stylesheet" media="print" onload="this.media='all'" crossorigin href="${href}"><noscript><link rel="stylesheet" href="${href}"></noscript>`,
            );
          },
        },
      },
      VitePWA({
        registerType: "autoUpdate",
        // Bug C fix: disable auto SW script injection; registered manually in main.tsx
        injectRegister: false,
        manifest: {
          name: "Beer O'Clock",
          short_name: "Beer O'Clock",
          description: "Queensland's simple drink tracker",
          theme_color: "#f59e0b",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          icons: [
            {
              // Bug E fix: removed incorrect 512x512 entry (favicon.png is 256×256).
              // A proper 512×512 asset is needed before re-adding that entry.
              src: "/favicon.png",
              sizes: "192x192",
              type: "image/png",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          globIgnores: ["**/beer_images/**"],
          // Don't intercept navigations to asset paths — let the browser
          // fetch them directly from S3/CloudFront.
          navigateFallbackDenylist: [
            /^\/beer_images\//,
            /^\/custom\//,
            /^\/assets\//,
            /^\/robots\.txt$/,
            /^\/sitemap\.xml$/,
            /\.(webp|png|jpg|jpeg|svg|gif|ico|css|js|txt|xml|woff2?)$/,
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|ico)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "beer-images-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                },
              },
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
    },
    define: {
      "import.meta.env.SUPABASE_URL": JSON.stringify(env.SUPABASE_URL),
      "import.meta.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.SUPABASE_PUBLISHABLE_KEY,
      ),
      "import.meta.env.APP_DOMAIN_NAME": JSON.stringify(env.APP_DOMAIN_NAME),
      "import.meta.env.APP_SUPPORT_EMAIL": JSON.stringify(
        env.APP_SUPPORT_EMAIL,
      ),
      "import.meta.env.TABLE_NAME": JSON.stringify(env.TABLE_NAME),
      "import.meta.env.S3_BUCKET": JSON.stringify(env.S3_BUCKET),
      "import.meta.env.CF_TURNSTILE_SITE_KEY": JSON.stringify(
        env.CF_TURNSTILE_SITE_KEY,
      ),
    },
  };
});
