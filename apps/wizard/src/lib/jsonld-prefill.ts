import type { ShaclModel } from "@/types";
import type { WizardStep, FieldDescriptor } from "./shape-to-fields";

/**
 * Given matchedSubjects from the API (full URI → value) and the wizard steps,
 * produce per-step default values for react-hook-form.
 * Uses step.label (targetClassName) to match shapes — no index assumptions.
 */
export function buildPrefillValues(
  matchedSubjects: Record<string, string>,
  steps: WizardStep[],
  model: ShaclModel
): Record<string, Record<string, unknown>> {
  const prefixMap = new Map(model.prefixList.map((p) => [p.alias, p.url]));
  const result: Record<string, Record<string, unknown>> = {};

  for (const step of steps) {
    const shape = model.shapes.find((s) => s.targetClassName === step.label);
    if (!shape) {
      result[step.label] = {};
      continue;
    }

    const stepModel: Record<string, unknown> = {};
    fillFields(step.fields, matchedSubjects, prefixMap, stepModel, "");
    result[step.label] = stepModel;
  }

  return result;
}

/**
 * Recursively fill field values including nested groups and repeats.
 */
function fillFields(
  fields: FieldDescriptor[],
  subjects: Record<string, string>,
  prefixMap: Map<string, string>,
  target: Record<string, unknown>,
  prefix: string
): void {
  for (const field of fields) {
    const fullUri = resolveFieldUri(field.key, prefixMap);
    const lookupKey = prefix ? `${prefix}.${field.key}` : field.key;
    const value = subjects[fullUri] ?? subjects[field.key] ?? subjects[lookupKey];

    if (field.type === "group" && field.children) {
      const nested: Record<string, unknown> = {};
      fillFields(field.children, subjects, prefixMap, nested, field.key);
      if (Object.keys(nested).length > 0) target[field.key] = nested;
    } else if (field.type === "repeat" && field.children) {
      // For repeats, try to find indexed values (key.0.child, key.1.child)
      const items = collectRepeatItems(field, subjects, prefixMap);
      if (items.length > 0) target[field.key] = items;
    } else if (value !== undefined) {
      target[field.key] = coerceValue(value, field.type);
    }
  }
}

/**
 * Attempt to collect repeat items from indexed subject keys.
 */
function collectRepeatItems(
  field: FieldDescriptor,
  subjects: Record<string, string>,
  prefixMap: Map<string, string>
): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  if (!field.children) return items;

  // Look for patterns like "parentKey.0.childKey", "parentKey.1.childKey" etc.
  for (let i = 0; i < 100; i++) {
    const item: Record<string, unknown> = {};
    let hasValue = false;
    for (const child of field.children) {
      const indexedKey = `${field.key}.${i}.${child.key}`;
      const fullUri = resolveFieldUri(child.key, prefixMap);
      const value = subjects[indexedKey] ?? subjects[`${fullUri}.${i}`];
      if (value !== undefined) {
        item[child.key] = coerceValue(value, child.type);
        hasValue = true;
      }
    }
    if (!hasValue) break;
    items.push(item);
  }
  return items;
}

function resolveFieldUri(key: string, prefixMap: Map<string, string>): string {
  const colonIdx = key.indexOf(":");
  if (colonIdx <= 0) return key;
  const prefix = key.slice(0, colonIdx);
  const localName = key.slice(colonIdx + 1);
  const ns = prefixMap.get(prefix);
  if (ns) return `${ns}${localName}`;
  return key;
}

function coerceValue(value: string, type: string): unknown {
  if (type === "number") {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  if (type === "boolean") {
    return value === "true" || value === "1";
  }
  return value;
}
