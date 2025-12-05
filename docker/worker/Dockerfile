# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy packages
COPY packages ./packages

# Copy Worker app
COPY apps/worker ./apps/worker

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages first
RUN pnpm --filter @storige/types build || true

# Build Worker
RUN pnpm --filter @storige/worker build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install system dependencies for PDF processing
RUN apk add --no-cache \
    ghostscript \
    imagemagick \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy packages
COPY packages ./packages

# Copy built Worker
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Create storage directory
RUN mkdir -p /app/storage

# Expose port
EXPOSE 4001

# Start Worker service
CMD ["node", "apps/worker/dist/main.js"]
