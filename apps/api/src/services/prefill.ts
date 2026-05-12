/**
 * JSON-LD prefill matching.
 * Matches JSON-LD property values against SHACL paths from an already-parsed model.
 *
 * Supports three key formats produced by the asset pipeline:
 * - Full URI keys:    "http://example.org/firstName"
 * - Prefixed keys:    "scenario:weatherSummary"
 * - Bare local names: "weatherSummary"
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

  // Build reverse lookup: local name → full URI (for bare local name matching)
  const localNameIndex = buildLocalNameIndex(shaclPaths);

  // Parse JSON-LD and match predicates
  const matchedSubjects: Record<string, string> = {};

  try {
    const jsonData = JSON.parse(jsonLdContent);
    matchJsonLdProperties(jsonData, shaclPaths, localNameIndex, prefixList, matchedSubjects);
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
 * Build a map from local name → full URI for quick bare-name matching.
 * If multiple SHACL paths share the same local name, the first one wins.
 */
function buildLocalNameIndex(shaclPaths: Set<string>): Map<string, string> {
  const index = new Map<string, string>();
  for (const fullUri of shaclPaths) {
    const local = extractLocalName(fullUri);
    if (local && !index.has(local)) {
      index.set(local, fullUri);
    }
  }
  return index;
}

/**
 * Extract the local name (fragment or last path segment) from a URI.
 */
function extractLocalName(uri: string): string | null {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx >= 0) return uri.slice(hashIdx + 1) || null;
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx >= 0) return uri.slice(slashIdx + 1) || null;
  return null;
}

/**
 * Resolve a JSON-LD key to its matching SHACL path URI.
 * Tries: (1) direct full-URI match, (2) prefix expansion, (3) bare local name.
 */
function resolveJsonLdKey(
  key: string,
  shaclPaths: Set<string>,
  localNameIndex: Map<string, string>,
  prefixList: Array<{ alias: string; url: string }>
): string | null {
  // 1. Direct match (key is already a full URI)
  if (shaclPaths.has(key)) return key;

  // 2. Prefix expansion (e.g. "scenario:weatherSummary" → full URI)
  const colonIdx = key.indexOf(":");
  if (colonIdx > 0 && !key.startsWith("http")) {
    const prefix = key.slice(0, colonIdx);
    const localName = key.slice(colonIdx + 1);
    const entry = prefixList.find((p) => p.alias === prefix);
    if (entry) {
      const expanded = `${entry.url}${localName}`;
      if (shaclPaths.has(expanded)) return expanded;
    }
  }

  // 3. Bare local name (e.g. "weatherSummary" → "https://…/weatherSummary")
  if (colonIdx < 0) {
    const match = localNameIndex.get(key);
    if (match) return match;
  }

  return null;
}

/**
 * Walk a JSON-LD document and match property URIs to SHACL paths.
 */
function matchJsonLdProperties(
  data: unknown,
  shaclPaths: Set<string>,
  localNameIndex: Map<string, string>,
  prefixList: Array<{ alias: string; url: string }>,
  matched: Record<string, string>
): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const item of data) {
      matchJsonLdProperties(item, shaclPaths, localNameIndex, prefixList, matched);
    }
    return;
  }

  const obj = data as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@")) continue;

    const resolvedUri = resolveJsonLdKey(key, shaclPaths, localNameIndex, prefixList);
    if (resolvedUri) {
      const strValue = extractJsonLdValue(value);
      if (strValue !== null) {
        matched[resolvedUri] = strValue;
      }
    }

    // Recurse into nested objects
    if (typeof value === "object" && value !== null) {
      matchJsonLdProperties(value, shaclPaths, localNameIndex, prefixList, matched);
    }
  }
}

/**
 * Extract a string value from a JSON-LD value.
 * Handles plain values, @value objects, @id references, and arrays.
 */
function extractJsonLdValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    const items = value.map((v) => extractJsonLdValue(v)).filter((v) => v !== null);
    return items.length > 0 ? items.join(", ") : null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("@value" in obj) return String(obj["@value"]);
    if ("@id" in obj) return String(obj["@id"]);
  }

  return null;
}
