FROM node:20-bookworm-slim AS base

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV MEDIA_SKIP_WEBP=1
ENV BUSTOUR_SKIP_PREFLIGHT=1
ENV BUSTOUR_SKIP_DB_BUILD=1
ENV BUILDKIT_PROGRESS=plain
ENV NEXT_PRIVATE_WORKER_CONCURRENCY=1
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN npm run build

FROM base AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV MEDIA_SKIP_WEBP=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/public/uploads \
  && chown -R nextjs:nodejs /app/public/uploads

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/scripts/start-server.mjs ./scripts/start-server.mjs
COPY --from=builder /app/scripts/media-worker.ts ./scripts/media-worker.ts

USER nextjs

EXPOSE 3000

CMD ["node", "scripts/start-server.mjs"]
