# Multi-stage Dockerfile for Snipshift API (Express + TypeScript)
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for TypeScript compilation)
RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat netcat-openbsd

# Copy package files
COPY package*.json ./

# Install production dependencies and tsx for running TypeScript
RUN npm ci --only=production && \
    npm install -g tsx

# Copy source files (TypeScript) - we run with tsx, so we need the source
COPY --from=builder /app/_src ./_src
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/fix-imports.js ./fix-imports.js
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint to run migrations before starting server
ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]
