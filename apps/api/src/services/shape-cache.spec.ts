/**
 * Unit tests for the shape-cache service.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We need to reset the module between tests since it has module-level state
let getShapeCache: typeof import("./shape-cache.js").getShapeCache;
let rebuildCache: typeof import("./shape-cache.js").rebuildCache;

const TEST_DIR = join(tmpdir(), `shape-cache-test-${Date.now()}`);

const SIMPLE_TTL = `
  @prefix sh: <http://www.w3.org/ns/shacl#> .
  @prefix ex: <http://example.org/> .
  @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

  ex:PersonShape a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:property [
      sh:path ex:firstName ;
      sh:name "First Name" ;
      sh:datatype xsd:string ;
    ] .
`;

describe("shape-cache", () => {
  beforeEach(async () => {
    // Set env before importing module
    process.env["SHAPES_DIR"] = TEST_DIR;
    // Reimport with fresh module state
    vi.resetModules();
    const mod = await import("./shape-cache.js");
    getShapeCache = mod.getShapeCache;
    rebuildCache = mod.rebuildCache;
  });

  afterEach(() => {
    delete process.env["SHAPES_DIR"];
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("returns empty structure when shapes directory does not exist", () => {
    process.env["SHAPES_DIR"] = "/nonexistent/dir/xyz";
    rebuildCache();
    const cache = getShapeCache();
    expect(cache.availableShapes).toEqual({});
    expect(cache.processedJsons.size).toBe(0);
    expect(cache.getProcessedJson("foo", "bar")).toBeNull();
  });

  it("scans ecosystem/category/file.ttl structure", () => {
    // Create: shapes/envited-x/hdmap/PersonShape.ttl
    const catDir = join(TEST_DIR, "envited-x", "hdmap");
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, "PersonShape.ttl"), SIMPLE_TTL);

    rebuildCache();
    const cache = getShapeCache();

    expect(cache.availableShapes["envited-x"]).toBeDefined();
    expect(cache.availableShapes["envited-x"]!["hdmap"]).toContain("Person.json");
  });

  it("converts TTL to JSON name: removes trailing Shape and capitalizes", () => {
    const catDir = join(TEST_DIR, "eco", "cat");
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, "my-complex-shape.ttl"), SIMPLE_TTL);

    rebuildCache();
    const cache = getShapeCache();

    expect(cache.availableShapes["eco"]!["cat"]).toContain("MyComplex.json");
  });

  it("pre-converts TTL content to ShaclModel JSON", () => {
    const catDir = join(TEST_DIR, "gx", "core");
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, "TestShape.ttl"), SIMPLE_TTL);

    rebuildCache();
    const cache = getShapeCache();

    const model = cache.getProcessedJson("gx", "Test.json");
    expect(model).not.toBeNull();
    expect(model!.shapes.length).toBeGreaterThan(0);
    expect(model!.shapes[0]!.schema).toBe("PersonShape");
  });

  it("handles multiple ecosystems and categories", () => {
    const dir1 = join(TEST_DIR, "envited-x", "hdmap");
    const dir2 = join(TEST_DIR, "envited-x", "scenario");
    const dir3 = join(TEST_DIR, "gaia-x", "participant");
    mkdirSync(dir1, { recursive: true });
    mkdirSync(dir2, { recursive: true });
    mkdirSync(dir3, { recursive: true });
    writeFileSync(join(dir1, "HdmapShape.ttl"), SIMPLE_TTL);
    writeFileSync(join(dir2, "ScenarioShape.ttl"), SIMPLE_TTL);
    writeFileSync(join(dir3, "ParticipantShape.ttl"), SIMPLE_TTL);

    rebuildCache();
    const cache = getShapeCache();

    expect(Object.keys(cache.availableShapes)).toHaveLength(2);
    expect(cache.availableShapes["envited-x"]!["hdmap"]).toContain("Hdmap.json");
    expect(cache.availableShapes["envited-x"]!["scenario"]).toContain("Scenario.json");
    expect(cache.availableShapes["gaia-x"]!["participant"]).toContain("Participant.json");
  });

  it("skips categories with no TTL files", () => {
    const catDir = join(TEST_DIR, "eco", "empty");
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, "readme.md"), "# No TTL here");

    rebuildCache();
    const cache = getShapeCache();

    expect(cache.availableShapes["eco"]).toBeDefined();
    expect(cache.availableShapes["eco"]!["empty"]).toBeUndefined();
  });

  it("handles malformed TTL gracefully", () => {
    const catDir = join(TEST_DIR, "eco", "broken");
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, "BrokenShape.ttl"), "this is not valid turtle @@@");

    rebuildCache();
    const cache = getShapeCache();

    // Shape should be listed but not processable
    expect(cache.availableShapes["eco"]!["broken"]).toContain("Broken.json");
    expect(cache.getProcessedJson("eco", "Broken.json")).toBeNull();
  });

  it("getProcessedJson returns null for nonexistent keys", () => {
    const catDir = join(TEST_DIR, "eco", "cat");
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, "TestShape.ttl"), SIMPLE_TTL);

    rebuildCache();
    const cache = getShapeCache();

    expect(cache.getProcessedJson("eco", "NonExistent.json")).toBeNull();
    expect(cache.getProcessedJson("nonexistent-eco", "Test.json")).toBeNull();
  });
});
