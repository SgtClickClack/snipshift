import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "./src",
  server: {
    port: 3001,
    host: true,
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
