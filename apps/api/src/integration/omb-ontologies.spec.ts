/**
 * Integration tests: verify the API correctly parses all 23 OMB SHACL ontologies.
 * These tests use the real ontology files from the sl-5-8-asset-tools submodule.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { Hono } from "hono";
import { convertRoutes } from "../routes/convert.js";

const app = new Hono();
app.route("/", convertRoutes);

/**
 * Discover all .shacl.ttl files recursively.
 */
function findShaclFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...findShaclFiles(full));
      } else if (entry.endsWith(".shacl.ttl")) {
        results.push(full);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return results;
}

// Try multiple paths to locate OMB artifacts
const candidatePaths = [
  process.env["OMB_ARTIFACTS_PATH"],
  join(__dirname, "../../../../submodules/ontology-management-base/artifacts"),
].filter(Boolean) as string[];

let shaclFiles: string[] = [];
for (const candidate of candidatePaths) {
  try {
    shaclFiles = findShaclFiles(candidate);
    if (shaclFiles.length > 0) break;
  } catch {
    // Try next path
  }
}

describe("OMB Ontology Integration Tests", () => {
  if (shaclFiles.length === 0) {
    it.skip("OMB artifacts not found — skipping integration tests", () => {});
    return;
  }

  it(`discovered ${shaclFiles.length} SHACL ontologies`, () => {
    expect(shaclFiles.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(shaclFiles.map((f) => [basename(f, ".shacl.ttl"), f]))(
    "ontology: %s",
    (_name, filePath) => {
      it("parses without error and returns valid ShaclModel", async () => {
        const content = readFileSync(filePath as string, "utf-8");
        const formData = new FormData();
        formData.append(
          "file",
          new Blob([content], { type: "text/turtle" }),
          basename(filePath as string)
        );

        const res = await app.request("/convertFile", {
          method: "POST",
          body: formData,
        });

        expect(res.status).toBe(200);

        const json = (await res.json()) as Record<string, any>;

        // Must have prefixList and shapes arrays
        expect(json.prefixList).toBeDefined();
        expect(Array.isArray(json.prefixList)).toBe(true);
        expect(json.shapes).toBeDefined();
        expect(Array.isArray(json.shapes)).toBe(true);

        // At least one shape must be extracted
        expect(json.shapes.length).toBeGreaterThanOrEqual(1);

        // Each shape must have required structure
        for (const shape of json.shapes) {
          expect(shape.schema).toBeTruthy();
          expect(shape.targetClassName).toBeTruthy();
          expect(Array.isArray(shape.constraints)).toBe(true);

          // Each constraint must have the core properties
          for (const constraint of shape.constraints) {
            // path is always present (extracted from sh:path)
            expect(constraint).toHaveProperty("path");
            // in is always an array (empty if no sh:in)
            expect(constraint).toHaveProperty("in");
            expect(Array.isArray(constraint.in)).toBe(true);
          }
        }
      });

      it("extracts at least one constraint with a path", async () => {
        const content = readFileSync(filePath as string, "utf-8");
        const formData = new FormData();
        formData.append(
          "file",
          new Blob([content], { type: "text/turtle" }),
          basename(filePath as string)
        );

        const res = await app.request("/convertFile", {
          method: "POST",
          body: formData,
        });
        const json = (await res.json()) as Record<string, any>;

        const allConstraints = json.shapes.flatMap((s: { constraints: any[] }) => s.constraints);
        const withPath = allConstraints.filter((c: { path: any }) => c.path !== null);
        expect(withPath.length).toBeGreaterThan(0);
      });
    }
  );
});

describe("Prefill Integration Tests", () => {
  if (shaclFiles.length === 0) {
    it.skip("OMB artifacts not found", () => {});
    return;
  }

  it("prefills hdmap ontology with matching JSON-LD", async () => {
    const hdmapShacl = shaclFiles.find((f) => f.includes("hdmap/hdmap.shacl"));
    if (!hdmapShacl) {
      return;
    }

    const shaclContent = readFileSync(hdmapShacl, "utf-8");
    // Use the actual full URI that the SHACL parser resolves
    const jsonLd = JSON.stringify({
      "https://w3id.org/ascs-ev/envited-x/hdmap/v6/formatType": {
        "@value": "OpenDRIVE",
      },
      "https://w3id.org/ascs-ev/envited-x/hdmap/v6/version": {
        "@value": "1.6",
      },
    });

    const formData = new FormData();
    formData.append("file", new Blob([shaclContent], { type: "text/turtle" }), "hdmap.shacl.ttl");
    formData.append("jsonFile", new Blob([jsonLd], { type: "application/ld+json" }), "hdmap.json");

    const res = await app.request("/convertAndPrefillFile", {
      method: "POST",
      body: formData,
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    expect(json.shaclModel).toBeDefined();
    expect(json.shaclModel.shapes.length).toBeGreaterThan(0);
    expect(json.matchedSubjects).toBeDefined();

    // Should match at least the formatType predicate
    const matchedKeys = Object.keys(json.matchedSubjects);
    expect(matchedKeys.length).toBeGreaterThan(0);
    expect(json.matchedSubjects["https://w3id.org/ascs-ev/envited-x/hdmap/v6/formatType"]).toBe(
      "OpenDRIVE"
    );
  });

  it("prefills scenario ontology with matching JSON-LD", async () => {
    const scenarioShacl = shaclFiles.find((f) => f.includes("scenario/scenario.shacl"));
    if (!scenarioShacl) {
      return;
    }

    const shaclContent = readFileSync(scenarioShacl, "utf-8");
    // Use a direct property that exists as sh:path in the SHACL
    // hasResourceDescription is a top-level path in ScenarioShape
    const jsonLd = JSON.stringify({
      "https://w3id.org/ascs-ev/envited-x/scenario/v6/hasResourceDescription": "A highway scenario",
    });

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([shaclContent], { type: "text/turtle" }),
      "scenario.shacl.ttl"
    );
    formData.append(
      "jsonFile",
      new Blob([jsonLd], { type: "application/ld+json" }),
      "scenario.json"
    );

    const res = await app.request("/convertAndPrefillFile", {
      method: "POST",
      body: formData,
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    expect(json.shaclModel).toBeDefined();
    expect(json.matchedSubjects).toBeDefined();
    expect(
      json.matchedSubjects["https://w3id.org/ascs-ev/envited-x/scenario/v6/hasResourceDescription"]
    ).toBe("A highway scenario");
  });
});
