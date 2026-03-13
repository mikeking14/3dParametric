FROM node:22-bookworm AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# --- Dependencies stage ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json .npmrc* ./
COPY packages/tsconfig/ packages/tsconfig/
COPY packages/eslint-config/ packages/eslint-config/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/parameter-parser/package.json packages/parameter-parser/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# --- Build stage ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .
RUN pnpm --filter @repo/db db:generate
RUN pnpm --filter @repo/web build

# --- Production stage ---
FROM node:22-bookworm-slim AS production

# Install OpenSCAD, Python/CadQuery, and xvfb for server-side rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    openscad \
    python3 \
    python3-pip \
    python3-venv \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/cadquery-env \
    && /opt/cadquery-env/bin/pip install --no-cache-dir cadquery
ENV PATH="/opt/cadquery-env/bin:$PATH"

WORKDIR /app

# Copy Next.js standalone build
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# Copy Prisma schema + migration files for runtime migration
COPY --from=build /app/packages/db/prisma ./packages/db/prisma
COPY --from=build /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/node_modules/.pnpm/prisma*/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/.pnpm/prisma*/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Create storage directories
RUN mkdir -p storage/models storage/exports storage/previews

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run migrations then start the server
CMD npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma && \
    node apps/web/server.js
