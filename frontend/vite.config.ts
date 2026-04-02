import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
/// <reference types="vitest" />

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
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
              src: "/favicon.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/favicon.png",
              sizes: "512x512",
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
            /\.(webp|png|jpg|jpeg|svg|gif|ico|css|js|txt|woff2?)$/,
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
    },
  };
});
