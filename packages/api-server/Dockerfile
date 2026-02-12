# API Server Dockerfile for Dokploy deployment
FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy packages
COPY packages/core ./packages/core
COPY packages/api-server ./packages/api-server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build core package first
RUN pnpm --filter @agentpass/core build

# Build API server
RUN pnpm --filter @agentpass/api-server build

# Create data directory
RUN mkdir -p /app/data

# Expose API port
EXPOSE 3846

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3846/health || exit 1

WORKDIR /app/packages/api-server

# Start API server
CMD ["node", "dist/index.js"]
