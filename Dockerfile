# ── Stage 1: install deps ──────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ── Stage 2: build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before building
RUN npx prisma generate

ENV NODE_ENV=production
RUN npm run build

# Compile seed script to a self-contained CJS bundle so it can run in the
# production image without tsx or other dev tooling.
# @prisma/* and pg are marked external — they're already in the runner image.
RUN node_modules/.bin/esbuild prisma/seed.ts \
    --bundle \
    --platform=node \
    --target=node22 \
    --format=cjs \
    --outfile=prisma/seed.cjs \
    --external:@prisma/client \
    --external:@prisma/adapter-pg \
    --external:pg

# ── Stage 3: production runner ─────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone output + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

# Prisma schema + migrations (needed by migrate deploy at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma     ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma     ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma      ./node_modules/prisma

# Pre-create upload subdirectories so the named volume inherits correct
# ownership on first mount. Without this, the nextjs user cannot write
# to uploads/images or uploads/videos on a fresh volume.
RUN mkdir -p /app/public/uploads/images /app/public/uploads/videos && \
    chown -R nextjs:nodejs /app/public/uploads

# Entrypoint runs migrations, optional seed, then starts the server
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
# NODE_OPTIONS: increase heap so large video uploads (up to 200 MB) don't OOM
# the process when the entire buffer is held in memory during write.
ENV PORT=3000 HOSTNAME=0.0.0.0 NODE_OPTIONS="--max-old-space-size=512"

ENTRYPOINT ["./docker-entrypoint.sh"]
