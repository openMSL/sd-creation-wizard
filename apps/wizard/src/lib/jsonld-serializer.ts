import type { ShaclModel } from "@/types";
import type { WizardStep, FieldDescriptor } from "./shape-to-fields";

/**
 * Serialize wizard form values to JSON-LD.
 * Steps are matched by label (targetClassName), not array index.
 * Produces typed literals, @id for IRIs, and properly nested node objects.
 */
export function serializeToJsonLd(
  stepValues: Record<string, Record<string, unknown>>,
  model: ShaclModel,
  steps?: WizardStep[]
): string {
  const context: Record<string, string> = {};
  for (const p of model.prefixList) {
    if (p.alias) context[p.alias] = p.url;
  }

  const graph: Record<string, unknown>[] = [];

  // Use steps to know which shapes are root-level (if provided)
  const targetShapes = steps
    ? steps.map((step) => ({
        shape: model.shapes.find((s) => s.targetClassName === step.label),
        step,
      }))
    : model.shapes.map((shape) => ({ shape, step: undefined as WizardStep | undefined }));

  for (const { shape, step } of targetShapes) {
    if (!shape) continue;
    const values = stepValues[shape.targetClassName];
    if (!values) continue;

    const node: Record<string, unknown> = {
      "@type": shape.targetClassPrefix
        ? `${shape.targetClassPrefix}:${shape.targetClassName}`
        : shape.targetClassName,
    };

    const fields = step?.fields;
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null || value === "") continue;
      const fieldDesc = fields?.find((f) => f.key === key);
      node[key] = formatValue(value, fieldDesc);
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

function formatValue(value: unknown, fieldDesc?: FieldDescriptor): unknown {
  if (Array.isArray(value)) {
    const childDesc = fieldDesc?.type === "repeat" ? fieldDesc : undefined;
    return value
      .map((item) => formatValue(item, childDesc?.children?.[0]))
      .filter((v) => v !== undefined);
  }

  if (typeof value === "object" && value !== null) {
    const filtered: Record<string, unknown> = {};
    const children = fieldDesc?.children;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      const childField = children?.find((c) => c.key === k);
      const formatted = formatValue(v, childField);
      if (formatted !== undefined) filtered[k] = formatted;
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  // Typed literals based on field descriptor
  if (fieldDesc) {
    switch (fieldDesc.type) {
      case "iri":
        if (typeof value === "string" && value) return { "@id": value };
        break;
      case "number":
        if (typeof value === "number") {
          return { "@value": value, "@type": "xsd:decimal" };
        }
        if (typeof value === "string") {
          const num = Number(value);
          if (!isNaN(num)) return { "@value": num, "@type": "xsd:decimal" };
        }
        break;
      case "boolean":
        return { "@value": Boolean(value), "@type": "xsd:boolean" };
      case "date":
        if (typeof value === "string" && value) {
          return { "@value": value, "@type": "xsd:dateTime" };
        }
        break;
    }
  }

  return value;
}
