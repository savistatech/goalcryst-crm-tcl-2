# =========================================
# Base
# =========================================
FROM node:22-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Required by Alpine for native Node.js modules
RUN apk add --no-cache libc6-compat

# =========================================
# Dependencies
# =========================================
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

# =========================================
# Builder
# =========================================
FROM base AS builder

WORKDIR /app

# Only public browser variables are passed at build time for Next.js static optimization.
# Server-only secrets (e.g. SUPABASE_SERVICE_ROLE_KEY) MUST NOT be passed as build args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js standalone output
RUN npm run build

# Remove unnecessary build cache
RUN rm -rf .next/cache

# =========================================
# Production Runner
# =========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user and group
RUN addgroup -S nodejs -g 1001 && \
    adduser -S nextjs -u 1001

# Copy public assets and standalone server bundle
COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs \
    /app/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs \
    /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
