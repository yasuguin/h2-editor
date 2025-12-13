/** @format */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // app/web を Vite のルートとして扱う
  root: resolve(__dirname, "app/web"),
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["icon.svg"],
      manifest: {
        name: "H2 Editor",
        short_name: "Editor",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#2563eb",
        theme_color: "#2563eb",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // Devモードではビルド生成物がディスクにないため警告を抑制する
        globPatterns: mode === "development" ? [] : ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "app/web/src"),
      "@shared": resolve(__dirname, "app/shared"),
    },
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  // build 出力は従来どおり dist/ にまとめる
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
}));
