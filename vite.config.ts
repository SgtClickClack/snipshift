import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  root: '.',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand-logo.png', 'logo.png', 'logo-white.png'],
      manifest: {
        name: 'Snipshift',
        short_name: 'Snipshift',
        description: 'Connect barbers, stylists, and beauticians with flexible work opportunities',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/brand-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/brand-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid service worker conflicts
      },
    }),
  ],
  // VITE_* environment variables are automatically exposed via import.meta.env
  // See src/config/env.ts for centralized access to these variables
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime'],
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
      // STRICT ALIASING: Force all React imports to resolve to exact same location
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        // NUCLEAR OPTION: Explicit manual chunks to guarantee React singleton
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React packages - MUST be in vendor chunk (loads first)
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor';
            }
            
            // UI libraries that depend on React - loaded after vendor chunk
            if (
              id.includes('@radix-ui/react-slot') ||
              id.includes('lucide-react') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')
            ) {
              return 'ui';
            }
            
            // Other Radix UI components - also in ui chunk
            if (id.includes('@radix-ui')) {
              return 'ui';
            }
            
            // Other React-dependent libraries
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('react-day-picker') || id.includes('embla-carousel-react')) {
              return 'react-utils-vendor';
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
            if (id.includes('date-fns') || id.includes('recharts')) {
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

