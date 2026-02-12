# Multi-stage build for AgentPass API Server
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy all packages
COPY packages ./packages

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build core package first
RUN pnpm --filter @agentpass/core build

# Build API server
RUN pnpm --filter @agentpass/api-server build

# Production image
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy everything from build stage including node_modules
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/node_modules ./node_modules

# Copy built packages with their dependencies
COPY --from=base /app/packages/core ./packages/core
COPY --from=base /app/packages/api-server ./packages/api-server

WORKDIR /app/packages/api-server

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3846

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3846/health || exit 1

CMD ["node", "dist/index.js"]
