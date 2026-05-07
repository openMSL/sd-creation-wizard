/**
 * End-to-end integration test: proves ALL ontology-management-base SHACL files
 * can be parsed → converted to wizard steps → auto-filled → serialized to JSON-LD.
 *
 * This test exercises the full pipeline without a browser:
 * 1. extractShaclModel (shacl-core) — parse TTL to ShaclModel
 * 2. shapeToSteps (wizard lib) — convert to renderable field descriptors
 * 3. autoFillStep — generate valid form values for every field type
 * 4. serializeToJsonLd — produce JSON-LD output
 *
 * A passing test means every ontology can be rendered and exported in the wizard.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { extractShaclModel } from "@sd-creation-wizard/shacl-core";
import { shapeToSteps, type WizardStep, type FieldDescriptor } from "../shape-to-fields";
import { serializeToJsonLd } from "../jsonld-serializer";

const OMB_ARTIFACTS = resolve(
  import.meta.dirname,
  "../../../../../submodules/ontology-management-base/artifacts"
);

function findShaclFiles(): Array<{ name: string; path: string }> {
  const results: Array<{ name: string; path: string }> = [];
  const dirs = readdirSync(OMB_ARTIFACTS, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const dirPath = resolve(OMB_ARTIFACTS, dir.name);
    const files = readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith(".shacl.ttl")) {
        results.push({ name: `${dir.name}/${file}`, path: resolve(dirPath, file) });
      }
    }
  }
  return results;
}

/**
 * Generate valid form values for a field descriptor tree.
 * This simulates a user filling out the wizard form.
 */
function autoFillField(field: FieldDescriptor): unknown {
  switch (field.type) {
    case "text":
      return field.placeholder || "test-value";
    case "number":
      return field.min ?? 1;
    case "date":
      return "2024-01-01";
    case "iri":
      return "https://example.org/resource";
    case "boolean":
      return true;
    case "select":
      return field.options?.[0]?.value ?? "";
    case "group":
      return autoFillFields(field.children ?? []);
    case "repeat": {
      const item = autoFillFields(field.children ?? []);
      return [item];
    }
    case "union": {
      if (field.branches && field.branches.length > 0) {
        const firstBranch = field.branches[0]!;
        if (firstBranch.length > 0) {
          return autoFillField(firstBranch[0]!);
        }
      }
      return "test-value";
    }
    default:
      return "test-value";
  }
}

function autoFillFields(fields: FieldDescriptor[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    values[field.key] = autoFillField(field);
  }
  return values;
}

function autoFillStep(step: WizardStep): Record<string, unknown> {
  return autoFillFields(step.fields);
}

const shaclFiles = findShaclFiles();

describe("OMB Ontology End-to-End Wizard Integration", () => {
  it("discovers at least 20 SHACL files", () => {
    expect(shaclFiles.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(shaclFiles)("$name", ({ name, path }) => {
    const ttl = readFileSync(path, "utf-8");
    let model: ReturnType<typeof extractShaclModel>;
    let steps: WizardStep[];

    it("parses without error", () => {
      model = extractShaclModel(ttl);
      expect(model).toBeDefined();
      expect(model.shapes).toBeDefined();
      expect(model.shapes.length).toBeGreaterThan(0);
    });

    it("converts to wizard steps", () => {
      model = extractShaclModel(ttl);
      steps = shapeToSteps(model);
      // Every ontology should produce at least one step
      expect(steps.length).toBeGreaterThan(0);
    });

    it("every step has at least one field", () => {
      model = extractShaclModel(ttl);
      steps = shapeToSteps(model);
      for (const step of steps) {
        expect(step.fields.length, `Step "${step.label}" has no fields`).toBeGreaterThan(0);
      }
    });

    it("all fields have valid types", () => {
      model = extractShaclModel(ttl);
      steps = shapeToSteps(model);
      const validTypes = new Set([
        "text",
        "number",
        "select",
        "date",
        "iri",
        "boolean",
        "union",
        "repeat",
        "group",
      ]);

      function assertFieldTypes(fields: FieldDescriptor[], path: string): void {
        for (const field of fields) {
          expect(
            validTypes.has(field.type),
            `Invalid type "${field.type}" at ${path}.${field.key}`
          ).toBe(true);
          expect(field.key, `Missing key at ${path}`).toBeTruthy();
          if (field.children) {
            assertFieldTypes(field.children, `${path}.${field.key}`);
          }
          if (field.branches) {
            for (let i = 0; i < field.branches.length; i++) {
              assertFieldTypes(field.branches[i]!, `${path}.${field.key}[branch${i}]`);
            }
          }
        }
      }

      for (const step of steps) {
        assertFieldTypes(step.fields, step.label);
      }
    });

    it("can be auto-filled without errors", () => {
      model = extractShaclModel(ttl);
      steps = shapeToSteps(model);
      const stepValues: Record<string, Record<string, unknown>> = {};
      for (const step of steps) {
        stepValues[step.label] = autoFillStep(step);
      }
      // All steps should produce non-empty values
      for (const step of steps) {
        const values = stepValues[step.label]!;
        expect(
          Object.keys(values).length,
          `Step "${step.label}" auto-fill is empty`
        ).toBeGreaterThan(0);
      }
    });

    it("serializes to valid JSON-LD", () => {
      model = extractShaclModel(ttl);
      steps = shapeToSteps(model);
      const stepValues: Record<string, Record<string, unknown>> = {};
      for (const step of steps) {
        stepValues[step.label] = autoFillStep(step);
      }

      const jsonLd = serializeToJsonLd(stepValues, model);
      expect(jsonLd).toBeTruthy();

      // Must be valid JSON
      const parsed = JSON.parse(jsonLd);
      expect(parsed).toBeDefined();

      // Must have @context
      expect(parsed["@context"]).toBeDefined();
      expect(typeof parsed["@context"]).toBe("object");

      // Must have at least one typed node (either top-level @type or @graph)
      if (parsed["@graph"]) {
        expect(parsed["@graph"].length).toBeGreaterThan(0);
        for (const node of parsed["@graph"]) {
          expect(node["@type"]).toBeDefined();
        }
      } else {
        expect(parsed["@type"]).toBeDefined();
      }
    });

    it("reports field statistics", () => {
      model = extractShaclModel(ttl);
      steps = shapeToSteps(model);

      function countFields(fields: FieldDescriptor[]): {
        total: number;
        nested: number;
        repeats: number;
        selects: number;
        unions: number;
      } {
        let total = 0;
        let nested = 0;
        let repeats = 0;
        let selects = 0;
        let unions = 0;
        for (const f of fields) {
          total++;
          if (f.type === "group") {
            nested++;
            const sub = countFields(f.children ?? []);
            total += sub.total;
            nested += sub.nested;
            repeats += sub.repeats;
            selects += sub.selects;
            unions += sub.unions;
          }
          if (f.type === "repeat") {
            repeats++;
            const sub = countFields(f.children ?? []);
            total += sub.total;
            nested += sub.nested;
            repeats += sub.repeats;
            selects += sub.selects;
            unions += sub.unions;
          }
          if (f.type === "select") selects++;
          if (f.type === "union") {
            unions++;
            for (const branch of f.branches ?? []) {
              const sub = countFields(branch);
              total += sub.total;
              nested += sub.nested;
              repeats += sub.repeats;
              selects += sub.selects;
              unions += sub.unions;
            }
          }
        }
        return { total, nested, repeats, selects, unions };
      }

      const stats = { steps: steps.length, ...countFields(steps.flatMap((s) => s.fields)) };
      // Just ensure it doesn't crash — the stats are for observability
      expect(stats.steps).toBeGreaterThan(0);
      expect(stats.total).toBeGreaterThan(0);

      // Log stats for human review (visible in verbose test output)
      console.log(
        `  📊 ${name}: ${stats.steps} steps, ${stats.total} fields (${stats.nested} nested, ${stats.repeats} repeats, ${stats.selects} selects, ${stats.unions} unions)`
      );
    });
  });
});
