import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  publicDir: '../public',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-button', '@radix-ui/react-input'],
          maps: ['@googlemaps/js-api-loader'],
          query: ['@tanstack/react-query']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'client/src'),
      '@shared': resolve(import.meta.dirname, 'shared'),
      '@assets': resolve(import.meta.dirname, 'attached_assets')
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});