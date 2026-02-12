FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy all packages
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm --filter @agentpass/core build
RUN pnpm --filter @agentpass/api-server build

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3846

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3846/health || exit 1

WORKDIR /app/packages/api-server
CMD ["node", "dist/index.js"]
