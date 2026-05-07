/**
 * JSON-LD prefill matching.
 * Matches JSON-LD property values against SHACL paths from an already-parsed model.
 */

import type { ShaclModel } from "@sd-creation-wizard/shacl-core";

/**
 * Match JSON-LD property values to SHACL shape paths.
 * Accepts an already-parsed ShaclModel to avoid re-parsing the TTL.
 * Returns a map of predicate URI → value string.
 */
export function prefillFromJsonLd(
  shaclModel: ShaclModel,
  prefixList: Array<{ alias: string; url: string }>,
  jsonLdContent: string
): Record<string, string> {
  // Build the set of full path URIs from the model
  const shaclPaths = new Set<string>();
  for (const shape of shaclModel.shapes) {
    for (const constraint of shape.constraints) {
      if (constraint.path) {
        const fullUri = resolveUri(constraint.path.prefix, constraint.path.value, prefixList);
        shaclPaths.add(fullUri);
      }
    }
  }

  // Parse JSON-LD and match predicates
  const matchedSubjects: Record<string, string> = {};

  try {
    const jsonData = JSON.parse(jsonLdContent);
    matchJsonLdProperties(jsonData, shaclPaths, matchedSubjects);
  } catch {
    // If JSON-LD parsing fails, return empty matches
  }

  return matchedSubjects;
}

/**
 * Resolve a prefixed name to a full URI using the prefix list.
 */
function resolveUri(
  prefix: string | null,
  localName: string,
  prefixList: Array<{ alias: string; url: string }>
): string {
  if (!prefix) return localName;
  const entry = prefixList.find((p) => p.alias === prefix);
  if (entry) return `${entry.url}${localName}`;
  return `${prefix}:${localName}`;
}

/**
 * Walk a JSON-LD document and match property URIs to SHACL paths.
 */
function matchJsonLdProperties(
  data: unknown,
  shaclPaths: Set<string>,
  matched: Record<string, string>
): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const item of data) {
      matchJsonLdProperties(item, shaclPaths, matched);
    }
    return;
  }

  const obj = data as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@")) continue;

    if (shaclPaths.has(key)) {
      const strValue = extractJsonLdValue(value);
      if (strValue !== null) {
        matched[key] = strValue;
      }
    }

    // Recurse into nested objects
    if (typeof value === "object" && value !== null) {
      matchJsonLdProperties(value, shaclPaths, matched);
    }
  }
}

/**
 * Extract a string value from a JSON-LD value (handles @value objects).
 */
function extractJsonLdValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if ("@value" in obj) return String(obj["@value"]);
    if ("@id" in obj) return String(obj["@id"]);
  }

  return null;
}
