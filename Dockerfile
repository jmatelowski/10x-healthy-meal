# syntax=docker/dockerfile:1.6
###############################################################################
#                      1. Base – install *all* deps                #
###############################################################################
FROM node:22-alpine AS base

# Metadata --------------------------------------------------------------------
LABEL org.opencontainers.image.title="10x-healthy-meal" \
      org.opencontainers.image.description="Astro 5 + React 19 application"

# Global settings -------------------------------------------------------------
ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    ASTRO_TELEMETRY_DISABLED=1

ARG APP_UID=10001
ARG APP_GID=10001

RUN addgroup --system --gid "$APP_GID" app && \
    adduser  --system --uid "$APP_UID" --ingroup app app

WORKDIR /app

COPY package*.json ./

###############################################################################
#                     2. Prod-deps – strip dev dependencies                   #
###############################################################################
FROM base AS prod-deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --audit=false --fund=false

###############################################################################
#                     3. Build-deps – install *all* dependencies              #
###############################################################################

# Install *all* dependencies --------------------------------------------------
FROM base AS build-deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --audit=false --fund=false

###############################################################################
#                    4. Builder – build application                  #
###############################################################################

# Copy source & build ---------------------------------------------------------
FROM build-deps AS builder
COPY . .
RUN npm run build

###############################################################################
#                    5. Runtime – tiny, secure, read-only                     #
###############################################################################
FROM base AS runtime

COPY --from=prod-deps /app/node_modules     ./node_modules
COPY --from=builder /app/dist             ./dist

USER app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/ || exit 1

EXPOSE 3000

CMD ["node", "dist/server/entry.mjs"]
