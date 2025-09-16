/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'snipshift.com.au', 'storage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: `${process.env.API_URL || 'http://localhost:4000'}/graphql`,
      },
    ];
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'http://localhost:4000/graphql',
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL || '/graphql',
    WS_URL: process.env.WS_URL || 'ws://localhost:4000/graphql',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
      '@shared': '../shared',
    };
    
    // Removed parent node_modules hack for production build compatibility
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
