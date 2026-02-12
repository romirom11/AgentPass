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

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy source packages (without node_modules - will be installed fresh)
COPY packages/core/package.json ./packages/core/
COPY packages/api-server/package.json ./packages/api-server/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy built code
COPY --from=base /app/packages/core/dist ./packages/core/dist
COPY --from=base /app/packages/api-server/dist ./packages/api-server/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3846

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3846/health || exit 1

CMD ["node", "packages/api-server/dist/index.js"]
