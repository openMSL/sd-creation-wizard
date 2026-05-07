import type { ClassConstraint, ShapeProperties, ShaclModel, VicShape } from "@/types";

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "iri"
  | "union"
  | "repeat"
  | "group";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldDescriptor {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  pattern?: string;
  options?: FieldOption[];
  children?: FieldDescriptor[];
  branches?: FieldDescriptor[][];
  minItems?: number;
  maxItems?: number | null;
}

export interface WizardStep {
  id: string;
  label: string;
  fields: FieldDescriptor[];
}

/**
 * Convert a ShaclModel into wizard steps with field descriptors.
 */
export function shapeToSteps(model: ShaclModel): WizardStep[] {
  const resolving = new Set<string>();
  return model.shapes
    .filter((shape) => hasEditableFields(shape))
    .map((shape) => ({
      id: shape.schema,
      label: shape.targetClassName,
      fields: shapeToFields(shape, model.shapes, resolving),
    }));
}

function hasEditableFields(shape: VicShape): boolean {
  return shape.constraints.some(
    (c) => c.children || !c.or || !c.or.every((branch) => !!branch.children)
  );
}

function shapeToFields(
  shape: VicShape,
  allShapes: VicShape[],
  resolving: Set<string>
): FieldDescriptor[] {
  return [...shape.constraints]
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map((c) => constraintToField(c, allShapes, resolving));
}

function constraintToField(
  prop: ShapeProperties,
  allShapes: VicShape[],
  resolving: Set<string>
): FieldDescriptor {
  const key = buildKey(prop.path);
  const label = prop.name ?? key;
  const required = (prop.minCount ?? 0) > 0;
  const description = prop.description ? Object.values(prop.description).join(" / ") : undefined;

  // Nested sh:node
  if (prop.children) {
    return buildNodeField(key, label, required, description, prop, allShapes, resolving);
  }

  // sh:or (union type)
  if (prop.or && prop.or.length > 0) {
    return buildUnionField(key, label, required, description, prop, allShapes, resolving);
  }

  // sh:in (select/dropdown)
  if (prop.in && prop.in.length > 0) {
    return {
      key,
      label,
      type: "select",
      required,
      description,
      options: prop.in.map((opt) => ({
        label: opt.value,
        value: opt.prefix ? `${opt.prefix}:${opt.value}` : opt.value,
      })),
    };
  }

  // Determine type from datatype
  const type = resolveFieldType(prop.datatype as ClassConstraint | null);
  const validations = extractValidations(prop);

  return { key, label, type, required, description, ...validations };
}

function buildNodeField(
  key: string,
  label: string,
  required: boolean,
  description: string | undefined,
  prop: ShapeProperties,
  allShapes: VicShape[],
  resolving: Set<string>
): FieldDescriptor {
  const childName = prop.children!;

  if (resolving.has(childName)) {
    return { key, label, type: "group", required, description, children: [] };
  }

  const childShape = allShapes.find(
    (s) => s.targetClassName === childName || localName(s.schema) === childName
  );
  if (!childShape) {
    return { key, label, type: "group", required, description, children: [] };
  }

  resolving.add(childName);
  const children = shapeToFields(childShape, allShapes, resolving);
  resolving.delete(childName);

  const isRepeat = prop.maxCount === null || (prop.maxCount !== null && prop.maxCount > 1);
  if (isRepeat) {
    return {
      key,
      label,
      type: "repeat",
      required,
      description,
      children,
      minItems: prop.minCount ?? 0,
      maxItems: prop.maxCount,
    };
  }

  return { key, label, type: "group", required, description, children };
}

function buildUnionField(
  key: string,
  label: string,
  required: boolean,
  description: string | undefined,
  prop: ShapeProperties,
  allShapes: VicShape[],
  resolving: Set<string>
): FieldDescriptor {
  const branches = prop.or!.map((branch) => {
    if (branch.children) {
      const childField = buildNodeField(
        buildKey(branch.path),
        branch.name ?? buildKey(branch.path),
        false,
        undefined,
        branch,
        allShapes,
        resolving
      );
      return [childField];
    }
    return [constraintToField(branch, allShapes, resolving)];
  });

  return { key, label, type: "union", required, description, branches };
}

function resolveFieldType(datatype: ClassConstraint | null): FieldType {
  if (!datatype || !("value" in datatype) || !datatype.value) return "text";
  const dt = datatype.value.toLowerCase();

  if (
    dt.includes("integer") ||
    dt.includes("decimal") ||
    dt.includes("float") ||
    dt.includes("double")
  ) {
    return "number";
  }
  if (dt.includes("date") || dt.includes("datetime")) return "date";
  if (dt.includes("anyuri") || dt.includes("iri")) return "iri";
  return "text";
}

function extractValidations(prop: ShapeProperties): Partial<FieldDescriptor> {
  const result: Partial<FieldDescriptor> = {};
  for (const v of prop.validations) {
    if (v.key === "minLength" || v.key === "min") result.min = Number(v.value);
    if (v.key === "maxLength" || v.key === "max") result.max = Number(v.value);
    if (v.key === "pattern") result.pattern = String(v.value);
  }
  if (prop.example) result.placeholder = prop.example;
  return result;
}

function buildKey(path: ClassConstraint | null): string {
  if (!path) return "unknown";
  if (path.prefix) return `${path.prefix}:${path.value}`;
  return path.value;
}

function localName(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx >= 0) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx >= 0) return uri.slice(slashIdx + 1);
  return uri;
}
