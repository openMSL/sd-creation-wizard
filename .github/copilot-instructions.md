# SD Creation Wizard — Copilot Instructions

## Commit Rules (MANDATORY)

- **Always** use `git commit -s -S` (signed-off-by + GPG signed)
- **Always** use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `ci:`)
- **Never** attribute Copilot, AI, or any automated tool in commits, trailers, or code comments
- **Never** add `Co-authored-by` trailers referencing Copilot or AI

## Code Style

- TypeScript strict mode, no `any` unless absolutely necessary
- Prettier for formatting (runs via pre-commit hook)
- ESLint for linting (runs via pre-commit hook)
- No unused imports or variables
- Prefer `const` over `let`, never use `var`
- Use explicit return types on exported functions

## Project Structure

- `packages/shacl-core/` — Core SHACL parser library (N3.js, pure logic, no I/O)
- `packages/testing/` — Shared test fixtures
- `packages/typescript-config/` — Shared tsconfig bases
- `apps/api/` — Hono HTTP server exposing the SHACL parser
- `docs/` — GitHub Pages (static HTML)

## Testing

- Use Vitest for all tests
- Golden fixture tests in `packages/testing/fixtures/`
- Aim for >95% coverage on `shacl-core`
- Run `pnpm test` before committing

## Pre-commit Hooks

This repo uses Husky + lint-staged. Hooks run automatically:

- `prettier --write` on staged files
- `eslint --fix` on staged `.ts` files
- `pnpm check-types` on the full project

## Build & Run

```bash
corepack enable
pnpm install
pnpm build
pnpm test
cd apps/api && npx tsx src/index.ts
```

## Dependencies

- Keep dependencies minimal
- Prefer standard library / small focused packages
- No Docker, no containers — plain Node.js
