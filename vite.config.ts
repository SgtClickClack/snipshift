import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "./snipshift-next/web",
  server: {
    port: 3002,
    host: true,
  },
  build: {
    outDir: "../../dist/public",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./snipshift-next/web/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
