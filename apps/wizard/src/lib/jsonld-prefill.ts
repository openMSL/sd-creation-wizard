import type { ShaclModel } from "@/types";
import type { WizardStep } from "./shape-to-fields";

/**
 * Given matchedSubjects from the API (full URI → value) and the wizard steps,
 * produce per-step default values for react-hook-form.
 */
export function buildPrefillValues(
  matchedSubjects: Record<string, string>,
  steps: WizardStep[],
  model: ShaclModel
): Record<string, Record<string, unknown>> {
  const prefixMap = new Map(model.prefixList.map((p) => [p.alias, p.url]));
  const result: Record<string, Record<string, unknown>> = {};

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const shape = model.shapes[i];
    if (!shape) {
      result[step.label] = {};
      continue;
    }

    const stepModel: Record<string, unknown> = {};
    for (const field of step.fields) {
      const fullUri = resolveFieldUri(field.key, prefixMap);
      const value = matchedSubjects[fullUri] ?? matchedSubjects[field.key];
      if (value === undefined) continue;
      stepModel[field.key] = coerceValue(value, field.type);
    }
    result[step.label] = stepModel;
  }

  return result;
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
  return value;
}
