# ──────────────────────────────────────────────────────────────
# Clara AI — Multi-stage Docker Build
# ──────────────────────────────────────────────────────────────

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create outputs directory (will be mounted as volume in production)
RUN mkdir -p outputs/accounts

RUN pnpm build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy sample transcripts, data directory, and scripts for batch processing
COPY --from=builder /app/sample-transcripts ./sample-transcripts
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts

# Create outputs directory with correct permissions
RUN mkdir -p outputs/accounts && chown -R nextjs:nodejs outputs

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
