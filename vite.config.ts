import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'snipshift-next/web',
  plugins: [react()],
  server: {
    port: 3002,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'snipshift-next/web/src'),
      '@shared': path.resolve(__dirname, 'snipshift-next/web/src/shared'),
    },
  },
  publicDir: 'snipshift-next/web/public',
});

