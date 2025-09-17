import { build } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const config = defineConfig({
  plugins: [react()],
  root: 'client',
  publicDir: '../public',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2019',
    esbuild: {
      pure: ['console.log']
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          maps: ['@googlemaps/js-api-loader'],
          query: ['@tanstack/react-query']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'client/src'),
      '@shared': resolve(process.cwd(), 'shared'),
      '@assets': resolve(process.cwd(), 'attached_assets')
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || ''),
    'import.meta.env.VITE_GOOGLE_REDIRECT_URI': JSON.stringify(process.env.VITE_GOOGLE_REDIRECT_URI || ''),
  }
});

try {
  console.log('Building frontend...');
  await build(config);
  console.log('Frontend build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
