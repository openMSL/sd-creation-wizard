/**
 * JSON-LD prefill matching.
 * Parses both SHACL and JSON-LD, matches JSON-LD predicate values to SHACL paths.
 */

import { Parser, Store } from "n3";
import { RdfNavigator, SH, RDF } from "@sd-creation-wizard/shacl-core";

/**
 * Match JSON-LD property values to SHACL shape paths.
 * Returns a map of predicate URI → value string.
 */
export function prefillFromJsonLd(
  shaclTurtle: string,
  jsonLdContent: string
): Record<string, string> {
  // Parse SHACL to extract all sh:path URIs
  const shaclStore = new Store();
  const shaclParser = new Parser();
  shaclStore.addQuads(shaclParser.parse(shaclTurtle));
  const shaclNav = new RdfNavigator(shaclStore);

  const shaclPaths = new Set<string>();
  const shapeNodes = shaclNav.subjects(RDF.type, SH.NodeShape);
  for (const shape of shapeNodes) {
    const properties = shaclNav.out(shape, SH.property);
    for (const prop of properties) {
      const pathNode = shaclNav.outOne(prop, SH.path);
      if (pathNode) {
        shaclPaths.add(pathNode.value);
      }
    }
  }

  // Parse JSON-LD and match predicates
  const matchedSubjects: Record<string, string> = {};

  try {
    const jsonData = JSON.parse(jsonLdContent);
    // Walk the JSON-LD document looking for keys that match SHACL paths
    matchJsonLdProperties(jsonData, shaclPaths, matchedSubjects);
  } catch {
    // If JSON-LD parsing fails, return empty matches
  }

  return matchedSubjects;
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

    // Check if the key (potentially a prefixed URI) matches a SHACL path
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
