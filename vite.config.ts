import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig(({ mode }) => ({
  root: '.',
  // Make NODE_ENV available in the client bundle for test-only guards (e.g. Socket.io disabling in E2E).
  // In Playwright E2E runs we explicitly set NODE_ENV=test in `playwright.config.ts`.
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? mode),
    '__BUILD_TIMESTAMP__': JSON.stringify(Date.now().toString()),
  },
  plugins: [
    react({
      // Ensure React is properly transformed and available
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand-logo.png', 'brand-wordmark.png', 'brand-icon.png', 'brand-logo-192.png', 'brand-logo-512.png', 'logo.png', 'logo-white.png', 'og-image.jpg'],
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
        // Exclude large files from precaching
        globIgnores: [
          '**/hospogoappicon.png',      // 7.66 MB - too large for precache
          '**/hospogonewhero.png',      // 1.74 MB - too large for precache
          '**/hospogoneonlogo.png',     // Large logo variant
          '**/app-venue.*.js',          // 1.29 MB chunk - use runtime caching instead
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB limit
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Runtime cache for large venue chunk (prevents partial-update white screen)
            urlPattern: /\/assets\/app-venue\..+\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'venue-chunk-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                // RED TEAM SECURITY: Reduced from 24h to 5min to prevent TOCTOU race condition amplification
                // Stale shift data after 10s network timeout could show already-accepted shifts as available
                maxAgeSeconds: 60 * 5, // 5 minutes
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
                // RED TEAM SECURITY: Reduced from 24h to 5min to prevent stale shift data
                maxAgeSeconds: 60 * 5, // 5 minutes
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
    visualizer({ open: true, filename: 'bundle-stats.html' }),
  ],
  // VITE_* environment variables are automatically exposed via import.meta.env
  // See src/config/env.ts for centralized access to these variables
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react/jsx-runtime',
      'use-places-autocomplete',
      'lucide-react',
      // Common UI libraries that may be discovered at runtime
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-progress',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      // Calendar and date picker libraries
      'react-day-picker',
      'react-big-calendar',
      'date-fns',
      // Image and media libraries
      'react-easy-crop',
      // Maps integration
      '@googlemaps/js-api-loader',
      // Form libraries
      'react-hook-form',
      'zod',
      // Query and state management
      '@tanstack/react-query',
      // Other common dependencies
      'framer-motion',
      // recharts: excluded from pre-bundle - lazy-loaded by earnings, VenueAnalyticsDashboard, etc.
    ],
    exclude: ['moment', 'moment-timezone'], // Exclude moment from bundling since we use date-fns
    force: true, // Force dependency pre-bundling
  },
  server: {
    port: 3000,
    strictPort: true,
    // NOTE: Vite does not support `server: { force: true }`.
    // To reduce "stale env / stale bundle" confusion during local debugging, we instead:
    // - keep `optimizeDeps.force = true` (forces re-optimization)
    // - disable browser caching for dev responses
    // - set COOP to allow Google Auth popup to communicate with main window
    headers: {
      'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
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
      onwarn: (warning, warn) => {
        if (
          typeof warning?.message === 'string' &&
          warning.message.includes('is dynamically imported') &&
          warning.message.includes('but also statically imported')
        ) {
          return;
        }

        warn(warning);
      },
      output: {
        // Force cache busting with hash in filenames
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Manual chunk splitting strategy
        manualChunks: (id) => {
          // 1. Vendor chunking - Order matters to avoid circular dependencies
          if (id.includes('node_modules')) {
            // Heavy visualization libraries - Let Vite auto-chunk these to avoid circular deps
            // REVERTED: Manual chunking caused ReferenceError in app-admin chunk (Black Screen)
            // if (id.includes('recharts')) return 'vendor-recharts';
            // if (id.includes('mermaid')) return 'vendor-mermaid';
            // if (id.includes('katex')) return 'vendor-katex';
            
            // Maps + places autocomplete
            if (
              id.includes('@react-google-maps/api') ||
              id.includes('@googlemaps/js-api-loader') ||
              id.includes('use-places-autocomplete')
            ) {
              return 'vendor-maps';
            }
            
            // Payments
            if (id.includes('@stripe/') || id.includes('stripe')) {
              return 'vendor-payments';
            }
            
            // Core React ecosystem - must include all React-related packages
            // to prevent "jsx undefined" errors
            if (
              id.includes('/react/') || 
              id.includes('/react-dom/') || 
              id.includes('/react-router') ||
              id.includes('/@react-') ||  // Catch @react-aria, @react-types, etc.
              id.includes('/scheduler/') // React internal dependency
            ) {
              return 'vendor-react';
            }
            
            // Firebase and animation - separate from React to reduce core chunk size
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('framer-motion')) return 'vendor-animation';
            
            // Everything else - let Rollup optimize
            // Don't force into a single chunk to avoid circular deps
            return undefined;
          }

          // 2. Application-level splitting (Domain Decoupling)
          // Be very specific with paths to avoid cross-chunk dependencies
          // IMPORTANT: Onboarding pages/components must stay in main chunk
          const srcPath = id.split('/src/pages/')[1];
          if (!srcPath) return undefined;
          
          // Venue-specific pages
          if (
            srcPath.startsWith('venue-') || 
            srcPath.startsWith('shop/') || 
            srcPath.startsWith('salon-')
          ) {
            return 'app-venue';
          }
          
          // Professional-specific pages  
          if (
            srcPath.startsWith('professional-') || 
            srcPath.startsWith('worker-') || 
            srcPath.startsWith('earnings')
          ) {
            return 'app-professional';
          }
          
          // Admin-specific pages
          if (srcPath.startsWith('admin/')) {
            return 'app-admin';
          }
          
          return undefined;
        },
      },
      // Ensure external dependencies are properly resolved
      external: [],
    },
    chunkSizeWarningLimit: 500,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Ensure proper module resolution
    target: 'esnext',
    minify: 'esbuild',
  },
}));

