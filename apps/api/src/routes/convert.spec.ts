/**
 * Integration tests for the API convert routes.
 * Tests the full request → parse → response cycle.
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { convertRoutes } from "./convert.js";

const app = new Hono();
app.route("/", convertRoutes);

describe("POST /convertFile", () => {
  it("converts a valid SHACL Turtle file to ShaclModel JSON", async () => {
    const ttl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:PersonShape a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:property [
          sh:path ex:name ;
          sh:name "Name" ;
          sh:datatype xsd:string ;
          sh:minCount 1 ;
        ] .
    `;

    const formData = new FormData();
    formData.append("file", new Blob([ttl], { type: "text/turtle" }), "test.ttl");

    const res = await app.request("/convertFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    expect(json.prefixList).toBeDefined();
    expect(json.shapes).toBeInstanceOf(Array);
    expect(json.shapes).toHaveLength(1);
    expect(json.shapes[0].schema).toBe("PersonShape");
    expect(json.shapes[0].targetClassName).toBe("Person");
    expect(json.shapes[0].constraints).toHaveLength(1);
    expect(json.shapes[0].constraints[0].path.value).toBe("name");
    expect(json.shapes[0].constraints[0].name).toBe("Name");
    expect(json.shapes[0].constraints[0].datatype.prefix).toBe("xsd");
    expect(json.shapes[0].constraints[0].datatype.value).toBe("string");
    expect(json.shapes[0].constraints[0].minCount).toBe(1);
  });

  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData();

    const res = await app.request("/convertFile", { method: "POST", body: formData });
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain("Error:");
  });

  it("returns 400 for invalid Turtle content", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["not valid turtle @@@@"]), "bad.ttl");

    const res = await app.request("/convertFile", { method: "POST", body: formData });
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text.startsWith("Error:")).toBe(true);
  });

  it("handles multiple shapes correctly", async () => {
    const ttl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .

      ex:ShapeA a sh:NodeShape ; sh:targetClass ex:ClassA ;
        sh:property [ sh:path ex:propA ] .
      ex:ShapeB a sh:NodeShape ; sh:targetClass ex:ClassB ;
        sh:property [ sh:path ex:propB ] .
    `;

    const formData = new FormData();
    formData.append("file", new Blob([ttl]), "multi.ttl");

    const res = await app.request("/convertFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    expect(json.shapes).toHaveLength(2);
    const schemas = json.shapes.map((s: { schema: string }) => s.schema).sort();
    expect(schemas).toContain("ShapeA");
    expect(schemas).toContain("ShapeB");
  });

  it("handles sh:in enum values", async () => {
    const ttl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .

      ex:ColorShape a sh:NodeShape ;
        sh:targetClass ex:Color ;
        sh:property [
          sh:path ex:value ;
          sh:in ( "red" "green" "blue" ) ;
        ] .
    `;

    const formData = new FormData();
    formData.append("file", new Blob([ttl]), "enum.ttl");

    const res = await app.request("/convertFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    const inValues = json.shapes[0].constraints[0].in;
    expect(inValues).toHaveLength(3);
    expect(inValues.map((v: { value: string }) => v.value)).toEqual(["red", "green", "blue"]);
  });

  it("handles sh:or union constraints", async () => {
    const ttl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:TestShape a sh:NodeShape ;
        sh:targetClass ex:Test ;
        sh:property [
          sh:path ex:value ;
          sh:or (
            [ sh:datatype xsd:string ]
            [ sh:datatype xsd:integer ]
          ) ;
        ] .
    `;

    const formData = new FormData();
    formData.append("file", new Blob([ttl]), "or.ttl");

    const res = await app.request("/convertFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    const orValues = json.shapes[0].constraints[0].or;
    expect(orValues).toHaveLength(2);
  });

  it("handles nested shapes with sh:node", async () => {
    const ttl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .

      ex:ParentShape a sh:NodeShape ;
        sh:targetClass ex:Parent ;
        sh:property [
          sh:path ex:child ;
          sh:node ex:ChildShape ;
        ] .
      ex:ChildShape a sh:NodeShape ;
        sh:targetClass ex:Child ;
        sh:property [ sh:path ex:name ] .
    `;

    const formData = new FormData();
    formData.append("file", new Blob([ttl]), "nested.ttl");

    const res = await app.request("/convertFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    // Find the parent shape
    const parent = json.shapes.find((s: { schema: string }) => s.schema === "ParentShape");
    expect(parent).toBeDefined();
    expect(parent.constraints[0].children).toBe("ChildShape");
  });
});

describe("POST /convertAndPrefillFile", () => {
  const shaclTtl = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix ex: <http://example.org/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    ex:PersonShape a sh:NodeShape ;
      sh:targetClass ex:Person ;
      sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
      ] ;
      sh:property [
        sh:path ex:age ;
        sh:datatype xsd:integer ;
      ] .
  `;

  it("returns both shaclModel and matchedSubjects", async () => {
    const jsonLd = JSON.stringify({
      "@context": { ex: "http://example.org/" },
      "@type": "ex:Person",
      "http://example.org/name": "Alice",
      "http://example.org/age": 30,
    });

    const formData = new FormData();
    formData.append("file", new Blob([shaclTtl]), "shape.ttl");
    formData.append("jsonFile", new Blob([jsonLd]), "data.json");

    const res = await app.request("/convertAndPrefillFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    expect(json.shaclModel).toBeDefined();
    expect(json.shaclModel.shapes).toHaveLength(1);
    expect(json.matchedSubjects).toBeDefined();
    expect(json.matchedSubjects["http://example.org/name"]).toBe("Alice");
    expect(json.matchedSubjects["http://example.org/age"]).toBe("30");
  });

  it("returns 400 when SHACL file is missing", async () => {
    const formData = new FormData();
    formData.append("jsonFile", new Blob(["{}"]), "data.json");

    const res = await app.request("/convertAndPrefillFile", { method: "POST", body: formData });
    expect(res.status).toBe(400);
  });

  it("returns 400 when JSON-LD file is missing", async () => {
    const formData = new FormData();
    formData.append("file", new Blob([shaclTtl]), "shape.ttl");

    const res = await app.request("/convertAndPrefillFile", { method: "POST", body: formData });
    expect(res.status).toBe(400);
  });

  it("handles @value objects in JSON-LD", async () => {
    const jsonLd = JSON.stringify({
      "http://example.org/name": {
        "@value": "Bob",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
    });

    const formData = new FormData();
    formData.append("file", new Blob([shaclTtl]), "shape.ttl");
    formData.append("jsonFile", new Blob([jsonLd]), "data.json");

    const res = await app.request("/convertAndPrefillFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    expect(json.matchedSubjects["http://example.org/name"]).toBe("Bob");
  });

  it("returns empty matchedSubjects when no predicates match", async () => {
    const jsonLd = JSON.stringify({
      "http://other.org/unrelated": "value",
    });

    const formData = new FormData();
    formData.append("file", new Blob([shaclTtl]), "shape.ttl");
    formData.append("jsonFile", new Blob([jsonLd]), "data.json");

    const res = await app.request("/convertAndPrefillFile", { method: "POST", body: formData });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, any>;
    expect(Object.keys(json.matchedSubjects)).toHaveLength(0);
  });
});
