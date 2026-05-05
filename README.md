# SD Creation Wizard

SHACL-based form model API for metadata enrichment in the ENVITED-X ecosystem.

Parses SHACL Turtle ontologies and returns structured JSON form models that
drive UI wizards and CLI tools for filling metadata.

## Quick Start

```bash
corepack enable
pnpm install
pnpm build
pnpm test
```

## Start API

```bash
cd apps/api && npx tsx src/index.ts
```

The server listens on `http://localhost:8080`.

## Endpoints

| Method | Path                             | Description                           |
| ------ | -------------------------------- | ------------------------------------- |
| POST   | `/convertFile`                   | Parse SHACL TTL → form model JSON     |
| POST   | `/convertAndPrefillFile`         | Parse + prefill from existing JSON-LD |
| GET    | `/getAvailableShapes`            | List cached shape schemas             |
| GET    | `/getAvailableShapesCategorized` | Shapes grouped by ontology            |
| GET    | `/getJSON/:schema`               | Get cached form model by schema name  |

## Project Structure

```
packages/
  shacl-core/    RDF/SHACL parser → form model (N3.js)
  testing/       Shared test fixtures (37 TTL + expected JSON)
  typescript-config/
apps/
  api/           Hono HTTP server
docs/            GitHub Pages documentation
```

## Development

```bash
pnpm test          # run all tests
pnpm check-types   # typecheck
pnpm build         # build all packages
```

## License

MPL-2.0
