import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  root: '.',
  plugins: [
    react({
      // Ensure React is properly transformed and available
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand-logo.png', 'brand-wordmark.png', 'brand-icon.png', 'brand-logo-192.png', 'brand-logo-512.png', 'logo.png', 'logo-white.png', 'og-image.jpg', 'herobarber (2).webp', 'herobarber (2).jpg'],
      manifest: {
        name: 'HospoGo',
        short_name: 'HospoGo',
        description: 'HospoGo connects hospitality staff with venues for flexible shift work. Find shifts or fill rosters fast.',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/brand-logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/brand-logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg,webp}'],
        globIgnores: ['**/herobarber (2).png'], // Exclude remaining legacy large PNG from precaching
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB limit (to accommodate herobarber images)
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
    include: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime', 'use-places-autocomplete', 'lucide-react'],
    force: true, // Force dependency pre-bundling
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      // Forward REST API requests
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Forward GraphQL requests
      '/graphql': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
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
        // Force cache busting with hash in filenames
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Manual chunk splitting strategy
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;

          // Keep chunking conservative to avoid React runtime ordering issues.
          // Only split a few known-heavy libraries; let Vite/Rollup decide the rest.

          // Firebase is large; isolate it for better caching.
          if (id.includes('node_modules/firebase')) return 'vendor-firebase';

          // Maps + places autocomplete are heavy and not needed everywhere.
          if (
            id.includes('node_modules/@react-google-maps/api') ||
            id.includes('node_modules/@googlemaps/js-api-loader') ||
            id.includes('node_modules/use-places-autocomplete')
          ) {
            return 'vendor-maps';
          }

          // Payments.
          if (id.includes('node_modules/@stripe/') || id.includes('node_modules/stripe')) {
            return 'vendor-payments';
          }

          // Otherwise, let Rollup determine optimal shared chunks.
          return;
        },
      },
      // Ensure external dependencies are properly resolved
      external: [],
    },
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Ensure proper module resolution
    target: 'esnext',
    minify: 'esbuild',
  },
});

