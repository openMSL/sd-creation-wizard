/**
 * Shape file caching service.
 * Scans shapes directory at startup, converts all TTLs to cached JSON.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { extractShaclModel } from "@sd-creation-wizard/shacl-core";
import type { ShaclModel } from "@sd-creation-wizard/shacl-core";

interface ShapeCache {
  availableShapes: Record<string, Record<string, string[]>>;
  processedJsons: Map<string, ShaclModel>;
  getProcessedJson(ecosystem: string, name: string): ShaclModel | null;
}

let cache: ShapeCache | null = null;

/**
 * Get or initialize the shape cache.
 */
export function getShapeCache(): ShapeCache {
  if (!cache) {
    cache = buildCache();
  }
  return cache;
}

/**
 * Rebuild the cache (useful for testing or reloading).
 */
export function rebuildCache(): void {
  cache = buildCache();
}

function buildCache(): ShapeCache {
  const shapesDir = process.env["SHAPES_DIR"] ?? "./shapes";
  const availableShapes: Record<string, Record<string, string[]>> = {};
  const processedJsons = new Map<string, ShaclModel>();

  if (!existsSync(shapesDir)) {
    console.warn(`Shapes directory not found: ${shapesDir}`);
    return {
      availableShapes,
      processedJsons,
      getProcessedJson: () => null,
    };
  }

  // Scan directory: shapes/<ecosystem>/<category>/<file>.ttl
  const ecosystems = readdirSync(shapesDir).filter((entry) =>
    statSync(join(shapesDir, entry)).isDirectory()
  );

  for (const ecosystem of ecosystems) {
    availableShapes[ecosystem] = {};
    const ecoDir = join(shapesDir, ecosystem);
    const categories = readdirSync(ecoDir).filter((entry) =>
      statSync(join(ecoDir, entry)).isDirectory()
    );

    for (const category of categories) {
      const catDir = join(ecoDir, category);
      const ttlFiles = readdirSync(catDir).filter((f) => f.endsWith(".ttl"));

      if (ttlFiles.length === 0) continue;

      const jsonNames: string[] = [];
      for (const ttlFile of ttlFiles) {
        const jsonName = ttlToJsonName(ttlFile);
        jsonNames.push(jsonName);

        // Pre-convert
        try {
          const content = readFileSync(join(catDir, ttlFile), "utf-8");
          const model = extractShaclModel(content);
          const cacheKey = `${ecosystem}/${jsonName}`;
          processedJsons.set(cacheKey, model);
        } catch (err) {
          console.warn(`Failed to process ${ecosystem}/${category}/${ttlFile}:`, err);
        }
      }

      availableShapes[ecosystem]![category] = jsonNames;
    }
  }

  return {
    availableShapes,
    processedJsons,
    getProcessedJson(ecosystem: string, name: string): ShaclModel | null {
      return processedJsons.get(`${ecosystem}/${name}`) ?? null;
    },
  };
}

/**
 * Convert a TTL filename to its JSON cache name (matching Java's ShaclFileUtils).
 */
function ttlToJsonName(filename: string): string {
  let name = filename.replace(/\.ttl$/i, "");
  // Remove trailing "Shape" or "shape"
  name = name.replace(/[Ss]hape$/, "");
  // Capitalize segments separated by dashes
  name = name
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
  return name + ".json";
}
