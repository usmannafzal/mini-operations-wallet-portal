# Simple multi-stage Next.js production image (standalone output) — Yarn.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Browser calls same-origin `/backend`; Next rewrites to the Nest service.
# NEXT_PUBLIC_* is inlined at build time, so these ARG/ENV must be set here.
ARG NEXT_PUBLIC_API_URL=/backend
ARG API_PROXY_TARGET=http://app:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_PROXY_TARGET=$API_PROXY_TARGET

RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runtime proxy target (Compose overrides to http://app:3001).
ARG API_PROXY_TARGET=http://app:3001
ENV API_PROXY_TARGET=$API_PROXY_TARGET
ENV NEXT_PUBLIC_API_URL=/backend

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
