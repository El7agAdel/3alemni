# ==================================================
# Stage 1: Base
# ==================================================
FROM node:24-alpine AS base

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ==================================================
# Stage 2: Dependencies
# ==================================================
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

# ==================================================
# Stage 3: Builder
# ==================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# ==================================================
# Stage 4: Production
# ==================================================
FROM base AS production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
