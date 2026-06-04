# ---------------------------------------
# Stage 1: Builder
# ---------------------------------------
FROM oven/bun:alpine AS builder

WORKDIR /usr/src/app

# Copy manifests first to cache dependencies
COPY package.json bun.lock ./

# Install ALL dependencies (including devDeps)
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# Remove devDependencies to save space
RUN bun install --production --frozen-lockfile

# ---------------------------------------
# Stage 2: Runner
# ---------------------------------------

FROM oven/bun:alpine AS runner

WORKDIR /usr/src/app

# Set to production environment
ENV NODE_ENV=production

# Copy only the necessary files from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./

# Run the app
ENTRYPOINT ["bun", "dist/main.js"]