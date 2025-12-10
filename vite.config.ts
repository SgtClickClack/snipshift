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
        globIgnores: ['**/logoblackback.png'], // Exclude large logo from precaching
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
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
    include: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime', 'use-places-autocomplete'],
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
        // Keep React in vendor chunk with other dependencies to ensure it's available
        manualChunks: (id) => {
          // Group all vendor dependencies together to ensure React is available when needed
          // Vite will handle proper loading order based on import dependencies
          if (id.includes('node_modules')) {
            // Check if it's a React-related package
            if (id.includes('react') || id.includes('react-dom') || 
                id.includes('react-router') || id.includes('react-helmet') ||
                id.includes('@tanstack/react-query') || id.includes('@radix-ui')) {
              // Put React and React-related libs in vendor chunk together
              // This ensures React is available when other React libs need it
              return 'vendor';
            }
            // All other node_modules also go to vendor
            return 'vendor';
          }
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

