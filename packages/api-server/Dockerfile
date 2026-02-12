# API Server Dockerfile for Dokploy deployment
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/core ./packages/core
COPY packages/api-server ./packages/api-server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build core package first
RUN pnpm --filter @agentpass/core build

# Build API server
RUN pnpm --filter @agentpass/api-server build

# Production stage
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built files and dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/core/dist ./packages/core/dist
COPY --from=base /app/packages/core/package.json ./packages/core/package.json
COPY --from=base /app/packages/api-server/dist ./packages/api-server/dist
COPY --from=base /app/packages/api-server/package.json ./packages/api-server/package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/package.json ./package.json

WORKDIR /app/packages/api-server

# Expose API port
EXPOSE 3846

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3846/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start API server
CMD ["node", "dist/index.js"]
