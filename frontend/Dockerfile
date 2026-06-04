# Build stage
FROM oven/bun:alpine AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM caddy:2-alpine AS runner

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv/dist

EXPOSE 3000