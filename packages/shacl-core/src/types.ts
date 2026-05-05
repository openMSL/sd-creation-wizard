/**
 * TypeScript interfaces matching the Java API's DTO response shape.
 * These must remain backwards-compatible with the frontend contract.
 */

export interface ClassConstraint {
  prefix: string | null;
  value: string;
}

export interface ConstraintOption {
  key: string;
  value: string | number;
}

export interface ShapeProperties {
  path: ClassConstraint | null;
  name: string | null;
  datatype: ClassConstraint | Record<string, never>;
  clazz: ClassConstraint | null;
  minCount: number | null;
  maxCount: number | null;
  order: number | null;
  description: Record<string, string> | null;
  example: string | null;
  in: ClassConstraint[];
  or: ShapeProperties[] | null;
  validations: ConstraintOption[];
  children: string | null;
}

export interface VicShape {
  schema: string;
  targetClassPrefix: string;
  targetClassName: string;
  constraints: ShapeProperties[];
}

export interface ShaclModel {
  prefixList: Array<{ alias: string; url: string }>;
  shapes: VicShape[];
}

export interface ResponseShaclJsonPair {
  shaclModel: ShaclModel;
  matchedSubjects: Record<string, string>;
}
