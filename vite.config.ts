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
  root: "./client",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  // Vite 5.1+ syntax to disable dependency optimization (prevents esbuild deadlock)
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  css: {
    postcss: './postcss.config.cjs',
  },
});
