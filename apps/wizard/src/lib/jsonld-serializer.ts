import type { ShaclModel, ClassConstraint } from "@/types";

/**
 * Serialize wizard form values to JSON-LD.
 * Each step maps to a shape → becomes a node in the output graph.
 */
export function serializeToJsonLd(
  stepValues: Record<string, Record<string, unknown>>,
  model: ShaclModel
): string {
  const context: Record<string, string> = {};
  for (const p of model.prefixList) {
    if (p.alias) context[p.alias] = p.url;
  }

  const graph: Record<string, unknown>[] = [];

  for (const shape of model.shapes) {
    const values = stepValues[shape.targetClassName];
    if (!values) continue;

    const node: Record<string, unknown> = {
      "@type": shape.targetClassPrefix
        ? `${shape.targetClassPrefix}:${shape.targetClassName}`
        : shape.targetClassName,
    };

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null || value === "") continue;
      node[key] = formatValue(value);
    }

    if (Object.keys(node).length > 1) {
      graph.push(node);
    }
  }

  const doc: Record<string, unknown> = { "@context": context };
  if (graph.length === 1) {
    Object.assign(doc, graph[0]);
  } else {
    doc["@graph"] = graph;
  }

  return JSON.stringify(doc, null, 2);
}

function formatValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(formatValue);
  }
  if (typeof value === "object" && value !== null) {
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined && v !== null && v !== "") {
        filtered[k] = formatValue(v);
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }
  return value;
}

/**
 * Build a full URI from a ClassConstraint and prefix list.
 */
export function resolveUri(
  path: ClassConstraint | null,
  prefixList: Array<{ alias: string; url: string }>
): string {
  if (!path) return "unknown";
  if (path.prefix) {
    const entry = prefixList.find((p) => p.alias === path.prefix);
    if (entry) return `${entry.url}${path.value}`;
    return `${path.prefix}:${path.value}`;
  }
  return path.value;
}
