# SD Creation Wizard — Copilot Instructions

## Commit Rules (MANDATORY)

- **Always** use `git commit -s -S` (signed-off-by + GPG signed)
- **Always** use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `ci:`)
- **Never** attribute Copilot, AI, or any automated tool in commits, trailers, or code comments
- **Never** add `Co-authored-by` trailers referencing Copilot or AI

## Build, Test, and Lint Commands

```bash
# Setup
corepack enable && pnpm install

# Build
pnpm build                    # All packages (turborepo, respects dependency order)
pnpm build:api                # API + its dependencies only
pnpm build:frontend           # Frontend + its dependencies only

# Test
pnpm test                     # All unit tests (vitest for api/shacl-core, karma for frontend)
cd packages/shacl-core && pnpm test           # Single package tests
cd packages/shacl-core && npx vitest run src/extractor.spec.ts  # Single test file
cd packages/shacl-core && npx vitest run -t "test-path"         # Single test by name
cd apps/e2e && npx playwright test            # E2E tests (needs build first)
cd apps/e2e && npx playwright test --ui       # E2E with interactive UI

# Lint & Format
pnpm lint                     # ESLint (excludes docs/ and apps/frontend/)
pnpm format:check             # Prettier check
pnpm check-types              # TypeScript type checking across all packages

# Dev servers
pnpm dev                      # API (port 3007) + frontend (port 4200) concurrently
pnpm dev:api                  # API only
pnpm dev:frontend             # Frontend only (proxies /api → localhost:3007)
```

## Architecture

This is a pnpm monorepo using Turborepo for task orchestration. The pipeline is:

```
TTL (SHACL/OWL ontology) → shacl-core parser → ShaclModel JSON → frontend renders dynamic forms → exports JSON-LD
```

**packages/shacl-core** — Pure-logic library, no I/O. The main entry point is `extractShaclModel(turtleContent: string): ShaclModel`. Internally: N3.js Parser → Store → `RdfNavigator` (lightweight graph traversal) → `Extractor` (shape/constraint extraction). Output matches the legacy Java API's DTO format for backwards compatibility.

**apps/api** — Hono HTTP server. Routes in `src/routes/`, services in `src/services/`. The `shape-cache` service clones and caches ontology TTL files from a remote git repo. The `prefill` service matches existing JSON-LD against a parsed SHACL model.

**apps/frontend** — Angular 19 SPA. Uses `ngx-formly` to dynamically render form fields from the `ShaclModel` JSON. `shape-to-formly.service.ts` converts SHACL constraints to formly field configs. Material Stepper groups fields by target class.

**apps/e2e** — Playwright E2E tests. Config auto-starts both API and frontend dev servers.

**packages/testing** — Shared golden fixtures: `fixtures/inputs/*.ttl` (37 SHACL files) and `fixtures/expected/*.json`. Used by shacl-core's extractor tests with lenient comparison (extra fields OK, array order ignored) matching the Java API's JSONAssert NON_STRICT mode.

## Key Conventions

- **ESM throughout** — All packages use `"type": "module"`. Imports use `.js` extensions even for TypeScript sources (Node ESM resolution).
- **Workspace protocol** — Internal deps use `workspace:*` in package.json.
- **Frontend is isolated** — Angular CLI manages its own build/test; root ESLint config explicitly ignores `apps/frontend/`. Frontend tests use Karma/Jasmine (not Vitest).
- **Golden fixture testing** — Adding/modifying shacl-core behavior requires updating or adding fixture pairs in `packages/testing/fixtures/` (input TTL + expected JSON).
- **API proxy** — Frontend proxies `/api/*` to `localhost:3007` with path rewrite (strips `/api` prefix).
- **ShaclModel contract** — The `types.ts` interfaces in shacl-core must remain backwards-compatible with the frontend and the external `sl-5-8-asset-tools` pipeline that consumes this API as a submodule.
- **Null stripping** — Extractor output strips null/undefined fields recursively (matches Jackson `@JsonInclude(NON_NULL)`).

## Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess`
- No `any` unless absolutely necessary (ESLint warns)
- Unused vars prefixed with `_` are allowed (`argsIgnorePattern: "^_"`)
- Prefer `const` over `let`, never use `var`
- Explicit return types on exported functions
- Prettier for formatting, ESLint for linting (both run via pre-commit hook)

## Pre-commit Hooks

Husky + lint-staged runs automatically on commit:

- `eslint --fix` + `prettier --write` on staged `*.{ts,mts}` files
- `prettier --write` on staged `*.{json,md,yml,yaml,html}` files
- `pnpm check-types` on the full project

## Dependencies

- Node.js ≥22, pnpm ≥10
- Keep dependencies minimal — no Docker, no containers
- Prefer standard library / small focused packages
