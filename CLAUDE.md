# Parametric Marketplace

## Project Overview
A 3D model marketplace for parametric models. Buyers modify parameters via web UI with real-time 3D preview and download print-ready files. MVP supports OpenSCAD (.scad) and CadQuery (.py).

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React Three Fiber, Tailwind CSS, Zustand
- **3D Rendering**: openscad-wasm (client-side), CadQuery via Python subprocess (server-side)
- **Database**: Prisma + SQLite (MVP), PostgreSQL (production)
- **Monorepo**: pnpm workspaces + Turborepo

## Repository Structure
- `apps/web` — Next.js frontend + API routes
- `packages/shared-types` — TypeScript interfaces (ParameterManifest, Model, etc.)
- `packages/parameter-parser` — Parse .scad/.py files into ParameterManifest JSON
- `packages/db` — Prisma schema, client, migrations, seed script
- `scripts/sample-models/` — Sample .scad and .py files for testing

## Commands
- `pnpm dev` / `turbo dev` — Start all apps in development mode
- `turbo test` — Run all tests (Vitest)
- `turbo lint` — Lint all packages
- `turbo typecheck` — Type-check all packages
- `turbo build` — Build all packages
- `pnpm db:migrate` — Run Prisma migrations
- `pnpm db:seed` — Seed database with sample data
- `pnpm db:studio` — Open Prisma Studio

## Conventions
- **TDD**: Write tests before implementation for parameter parsers and business logic
- **Types**: All shared types live in `@repo/shared-types`
- **Database**: Use Prisma for all DB access; paramManifest stored as JSON string in SQLite
- **File storage**: Uploaded models go to `storage/models/`, exports to `storage/exports/`
- **Parameter injection**: OpenSCAD params injected by prepending `-D` style variable assignments to source
- **Naming**: kebab-case for files, PascalCase for components, camelCase for functions/variables

## Testing
- Vitest for unit and integration tests
- Test files: `__tests__/` directories or `*.test.ts` colocated files
- Sample models in `scripts/sample-models/` for parser testing
