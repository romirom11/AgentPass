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

# Copy workspace config
COPY pnpm-workspace.yaml package.json ./

# Copy built packages
COPY --from=base /app/packages/core/package.json ./packages/core/package.json
COPY --from=base /app/packages/core/dist ./packages/core/dist

COPY --from=base /app/packages/api-server/package.json ./packages/api-server/package.json
COPY --from=base /app/packages/api-server/dist ./packages/api-server/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/packages/api-server

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3846

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3846/health || exit 1

CMD ["node", "dist/index.js"]
