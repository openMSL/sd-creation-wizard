# SD Creation Wizard

SHACL-driven metadata wizard for the ENVITED-X ecosystem. Parses SHACL/OWL
ontologies and renders dynamic form UIs for creating JSON-LD metadata assets.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  apps/wizard (React 19 + Vite, :5173)                          │
│    Upload TTL → Stepper → react-hook-form dynamic fields       │
│    → Review JSON-LD → Export                                   │
│                          │ /api proxy                          │
├──────────────────────────▼─────────────────────────────────────┤
│  apps/api (Hono, :3007)                                        │
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
pnpm dev              # Start API + wizard concurrently
pnpm dev:api          # Start API only (port 3007)
pnpm dev:wizard       # Start wizard only (port 5173, proxies /api → 3007)
pnpm test             # Run all unit tests (vitest)
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
| GET    | `/health`                        | Health check                          |

## Frontend Features

- **Dynamic forms** from SHACL shapes via react-hook-form + custom renderer
- **Step-based navigation** — one step per target class (Tailwind + Radix UI)
- **Field types**: text input, select (sh:in), number (integer/decimal),
  date (xsd:date), boolean (xsd:boolean), IRI reference (xsd:anyURI),
  repeat (useFieldArray), group (sh:node nesting), union (sh:or)
- **JSON-LD prefill** — upload existing metadata to pre-populate forms
- **Export** — download generated JSON-LD with proper @context and typed values
- **Dark mode** — supports envited-x design system color palette

## Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | React 19, Vite 6, TanStack Router, TanStack Query |
| Forms    | react-hook-form, dynamic field renderer           |
| Styling  | Tailwind CSS 4, Radix UI primitives, Lucide icons |
| Backend  | Hono (Node.js HTTP server)                        |
| Core     | N3.js (RDF/SHACL parsing), custom extractor       |
| Testing  | Vitest (unit), Playwright (E2E)                   |
| Build    | Turborepo, pnpm workspaces                        |

## Project Structure

```
apps/
  wizard/        React wizard UI (Vite + TanStack Router + Tailwind)
  api/           Hono HTTP server (TypeScript, vitest)
  e2e/           Playwright end-to-end tests
packages/
  shacl-core/    RDF/SHACL parser → form model (N3.js)
  testing/       Shared test fixtures (37 TTL + expected JSON)
  typescript-config/   Shared tsconfig presets
  eslint-config/       Shared ESLint flat config
docs/            GitHub Pages documentation
submodules/
  ontology-management-base/   ASCS-eV ontology benchmark suite
```

## Integration with Asset Pipeline

This wizard is used by
[sl-5-8-asset-tools](https://github.com/openMSL/sl-5-8-asset-tools) as a
submodule for the `wizard_caller` pipeline step. The API can be called
programmatically or interactively via the wizard frontend.

## License

Apache-2.0
