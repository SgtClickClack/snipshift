import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  root: '.',
  plugins: [react()],
  // VITE_* environment variables are automatically exposed via import.meta.env
  // See src/config/env.ts for centralized access to these variables
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: true,
  },
  server: {
    port: 3002,
    strictPort: true,
    proxy: {
      // Forward REST API requests
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Forward GraphQL requests
      '/graphql': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
    dedupe: ['react', 'react-dom'],
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // CRITICAL: React and React-DOM MUST be in the main bundle (return undefined)
          // This prevents "Cannot read properties of undefined (reading 'useLayoutEffect')" errors
          
          if (id.includes('node_modules')) {
            // First, check for React-related packages that should be in separate chunks
            // These packages import React, so they can be chunked separately
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('react-day-picker') || id.includes('embla-carousel-react')) {
              return 'react-utils-vendor';
            }
            
            // Core React packages - MUST be in main bundle (return undefined)
            // This must come after checking for React-related packages
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return undefined; // Inline in main bundle
            }
            
            // Firebase (client-side only)
            if (id.includes('firebase') && !id.includes('firebase-admin')) {
              return 'firebase-vendor';
            }
            // Google Maps
            if (id.includes('@googlemaps')) {
              return 'maps-vendor';
            }
            // Other large vendor libraries (non-React)
            if (id.includes('lucide-react') || id.includes('date-fns') || id.includes('recharts')) {
              return 'utils-vendor';
            }
            // Default vendor chunk for other node_modules
            return 'vendor';
          }
          
          // Feature-based chunks for large pages
          if (id.includes('/pages/') || id.includes('/components/')) {
            if (id.includes('dashboard')) {
              return 'dashboard';
            }
            if (id.includes('social') || id.includes('community')) {
              return 'social';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
});

