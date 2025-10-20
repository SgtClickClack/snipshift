import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
      jsxRuntime: "automatic",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  // Vite 5.1+ syntax to prevent esbuild deadlock
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  css: {
    postcss: '../postcss.config.cjs',
  },
});
