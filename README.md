# SD Creation Wizard

SHACL-driven metadata wizard for the ENVITED-X ecosystem. Parses SHACL/OWL
ontologies and renders dynamic form UIs for creating JSON-LD metadata assets.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  apps/frontend (Angular 19, :4200)                             │
│    Upload TTL → Material Stepper → ngx-formly forms            │
│    → Export JSON-LD                                            │
│                          │ /api proxy                          │
├──────────────────────────▼─────────────────────────────────────┤
│  apps/api (Hono, :8080)                                        │
│    POST /convertFile → parse SHACL → form model JSON           │
│    POST /convertAndPrefillFile → parse + prefill from JSON-LD  │
│    GET  /getAvailableShapes → cached ontology list             │
│                          │                                     │
├──────────────────────────▼─────────────────────────────────────┤
│  packages/shacl-core                                           │
│    N3.js RDF store → Navigator → Extractor → ShaclModel        │
├────────────────────────────────────────────────────────────────┤
│  packages/testing        Shared fixtures (37 TTL + JSON golden)│
│  packages/typescript-config   Shared tsconfig presets          │
│  packages/eslint-config       Shared ESLint flat config        │
└────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
corepack enable
pnpm install
pnpm build
pnpm test
```

## Development

```bash
pnpm dev              # Start API + frontend concurrently
pnpm dev:api          # Start API only (port 8080)
pnpm dev:frontend     # Start frontend only (port 4200, proxies /api → 8080)
pnpm test             # Run all unit tests (vitest + karma)
pnpm test:e2e         # Run Playwright E2E tests
pnpm lint             # ESLint
pnpm format:check     # Prettier check
pnpm check-types      # TypeScript type checking
```

## API Endpoints

| Method | Path                             | Description                           |
| ------ | -------------------------------- | ------------------------------------- |
| POST   | `/convertFile`                   | Parse SHACL TTL → form model JSON     |
| POST   | `/convertAndPrefillFile`         | Parse + prefill from existing JSON-LD |
| GET    | `/getAvailableShapes`            | List cached shape schemas             |
| GET    | `/getAvailableShapesCategorized` | Shapes grouped by ontology            |
| GET    | `/getJSON/:schema`               | Get cached form model by schema name  |

## Frontend Features

- **Dynamic forms** from SHACL shapes via ngx-formly
- **Material Stepper** — one step per target class
- **Field types**: text input, select (sh:in), checkbox (boolean), datepicker (date),
  number with range (integer/decimal), IRI reference (anyURI), repeat (maxCount),
  union (sh:or)
- **JSON-LD prefill** — upload existing metadata to pre-populate forms
- **Export** — download generated JSON-LD with proper @context and typed values

## Project Structure

```
apps/
  api/           Hono HTTP server (TypeScript, vitest)
  frontend/      Angular 19 wizard UI (ngx-formly, Material)
  e2e/           Playwright end-to-end tests
packages/
  shacl-core/    RDF/SHACL parser → form model (N3.js)
  testing/       Shared test fixtures (37 TTL + expected JSON)
  typescript-config/   Shared tsconfig presets
  eslint-config/       Shared ESLint flat config
docs/            GitHub Pages documentation
```

## Integration with Asset Pipeline

This wizard is used by
[sl-5-8-asset-tools](https://github.com/openMSL/sl-5-8-asset-tools) as a
submodule for the `wizard_caller` pipeline step. The API can be called
programmatically or interactively via the frontend.

## License

MPL-2.0
