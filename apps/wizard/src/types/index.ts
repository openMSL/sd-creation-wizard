export type {
  ShaclModel,
  VicShape,
  ShapeProperties,
  ClassConstraint,
  ConstraintOption,
  ResponseShaclJsonPair,
} from "@sd-creation-wizard/shacl-core";

export interface FieldProvenance {
  method: "extraction" | "calculation" | "rule-based-inference" | "llm-inference" | "manual";
  confidence: "high" | "medium" | "low";
}

export interface ProvenanceData {
  assetName: string;
  assetType: string;
  tool: { name: string; version: string; llmModel?: string };
  fields: Record<string, FieldProvenance>;
}
