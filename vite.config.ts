import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // Remove Replit-specific plugins for production builds
  ],
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || ''),
    'import.meta.env.VITE_GOOGLE_REDIRECT_URI': JSON.stringify(process.env.VITE_GOOGLE_REDIRECT_URI || ''),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
      // Ensure a single React instance is used
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Performance optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@tanstack/react-query', 'react-router-dom'],
          'auth-vendor': ['firebase', 'google-auth-library'],
          'icons-vendor': ['react-icons', 'lucide-react'],
        },
      },
    },
    // Enable source maps for debugging
    sourcemap: process.env.NODE_ENV !== 'production',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'react-router-dom',
    ],
    exclude: [
      'firebase',
      'google-auth-library',
    ],
  },
});
