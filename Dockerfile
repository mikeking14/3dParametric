FROM node:22-bookworm

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install OpenSCAD CLI and Python/CadQuery for server-side rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    openscad \
    python3 \
    python3-pip \
    python3-venv \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install CadQuery in a virtual environment
RUN python3 -m venv /opt/cadquery-env \
    && /opt/cadquery-env/bin/pip install --no-cache-dir cadquery

# Make cadquery python accessible
ENV PATH="/opt/cadquery-env/bin:$PATH"

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json .npmrc* ./
COPY packages/tsconfig/ packages/tsconfig/
COPY packages/eslint-config/ packages/eslint-config/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/parameter-parser/package.json packages/parameter-parser/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install

# Copy the rest
COPY . .

# Generate Prisma client and run migrations
RUN pnpm --filter @repo/db db:generate

# Create storage directories
RUN mkdir -p storage/models storage/exports storage/previews

EXPOSE 3000

CMD ["pnpm", "dev"]
