/**
 * Integration tests for shape routes.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Hono } from "hono";

const TEST_DIR = join(tmpdir(), `shapes-route-test-${Date.now()}`);

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

let app: Hono;

describe("shapes routes", () => {
  beforeAll(async () => {
    // Create test shapes directory structure
    const hdmapDir = join(TEST_DIR, "envited-x", "hdmap");
    const scenarioDir = join(TEST_DIR, "envited-x", "scenario");
    mkdirSync(hdmapDir, { recursive: true });
    mkdirSync(scenarioDir, { recursive: true });
    writeFileSync(join(hdmapDir, "PersonShape.ttl"), SIMPLE_TTL);
    writeFileSync(join(scenarioDir, "VehicleShape.ttl"), SIMPLE_TTL);

    // Set env and reimport
    process.env["SHAPES_DIR"] = TEST_DIR;
    vi.resetModules();
    const { rebuildCache } = await import("../services/shape-cache.js");
    const { shapesRoutes } = await import("./shapes.js");
    rebuildCache();

    app = new Hono();
    app.route("/", shapesRoutes);
  });

  afterAll(() => {
    delete process.env["SHAPES_DIR"];
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("GET /getAvailableShapes", () => {
    it("returns all shapes grouped by ecosystem/category", async () => {
      const res = await app.request("/getAvailableShapes");
      expect(res.status).toBe(200);

      const data = (await res.json()) as Record<string, Record<string, string[]>>;
      expect(data["envited-x"]).toBeDefined();
      expect(data["envited-x"]!["hdmap"]).toContain("Person.json");
      expect(data["envited-x"]!["scenario"]).toContain("Vehicle.json");
    });
  });

  describe("GET /getAvailableShapesCategorized", () => {
    it("returns shapes for a specific ecosystem", async () => {
      const res = await app.request("/getAvailableShapesCategorized?ecosystem=envited-x");
      expect(res.status).toBe(200);

      const data = (await res.json()) as Record<string, string[]>;
      expect(data["hdmap"]).toContain("Person.json");
    });

    it("returns 400 when ecosystem is missing", async () => {
      const res = await app.request("/getAvailableShapesCategorized");
      expect(res.status).toBe(400);
    });

    it("returns empty object for unknown ecosystem", async () => {
      const res = await app.request("/getAvailableShapesCategorized?ecosystem=unknown");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({});
    });
  });

  describe("GET /getJSON", () => {
    it("returns pre-converted shape JSON", async () => {
      const res = await app.request("/getJSON?ecosystem=envited-x&name=Person.json");
      expect(res.status).toBe(200);

      const data = (await res.json()) as { shapes: unknown[] };
      expect(data.shapes).toBeDefined();
      expect(data.shapes.length).toBeGreaterThan(0);
    });

    it("returns 400 when parameters are missing", async () => {
      const res = await app.request("/getJSON?ecosystem=envited-x");
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent shape", async () => {
      const res = await app.request("/getJSON?ecosystem=envited-x&name=NonExistent.json");
      expect(res.status).toBe(404);
    });

    it("rejects path traversal attempts", async () => {
      const res = await app.request("/getJSON?ecosystem=envited-x&name=../../../etc/passwd");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /getSearchQuery/:ecoSystem/:query", () => {
    it("finds shapes matching substring query", async () => {
      const res = await app.request("/getSearchQuery/envited-x/person");
      expect(res.status).toBe(200);

      const data = (await res.json()) as Record<string, string[]>;
      expect(data["hdmap"]).toContain("Person.json");
    });

    it("returns empty object for no matches", async () => {
      const res = await app.request("/getSearchQuery/envited-x/nonexistent");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({});
    });

    it("returns empty object for unknown ecosystem", async () => {
      const res = await app.request("/getSearchQuery/unknown/test");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({});
    });

    it("performs case-insensitive search", async () => {
      const res = await app.request("/getSearchQuery/envited-x/PERSON");
      expect(res.status).toBe(200);

      const data = (await res.json()) as Record<string, string[]>;
      expect(data["hdmap"]).toContain("Person.json");
    });
  });
});
