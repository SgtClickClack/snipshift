# Use Node.js 18 Alpine as base image for smaller size
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Dependencies stage - install all dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage - include dev dependencies for building
FROM base AS dev-deps
RUN npm ci && npm cache clean --force

# Build stage - compile TypeScript and prepare production build
FROM dev-deps AS build
COPY . .
RUN npm run build

# Production stage - create minimal runtime image
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S snipshift -u 1001

# Copy production dependencies
COPY --from=deps --chown=snipshift:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=snipshift:nodejs /app/dist ./dist

# Copy package files for metadata
COPY --chown=snipshift:nodejs package*.json ./

# Switch to non-root user
USER snipshift

# Expose port (Cloud Run will inject PORT env var, default to 5000 for Replit)
EXPOSE 5000

# Health check - use PORT environment variable or default to 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 5000; require('http').get(\`http://localhost:\${port}/health\`, (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
