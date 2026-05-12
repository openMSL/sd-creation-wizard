/**
 * Unit tests for the prefill service.
 */

import { describe, it, expect } from "vitest";
import { extractShaclModel } from "@sd-creation-wizard/shacl-core";
import { prefillFromJsonLd } from "./prefill.js";

const SHACL_TTL = `
  @prefix sh: <http://www.w3.org/ns/shacl#> .
  @prefix ex: <http://example.org/> .
  @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

  ex:PersonShape a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:property [
      sh:path ex:firstName ;
      sh:datatype xsd:string ;
    ] ;
    sh:property [
      sh:path ex:lastName ;
      sh:datatype xsd:string ;
    ] ;
    sh:property [
      sh:path ex:age ;
      sh:datatype xsd:integer ;
    ] .
`;

const model = extractShaclModel(SHACL_TTL);

describe("prefillFromJsonLd", () => {
  it("matches simple string values from JSON-LD", () => {
    const jsonLd = JSON.stringify({
      "http://example.org/firstName": "Alice",
      "http://example.org/lastName": "Smith",
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("Alice");
    expect(result["http://example.org/lastName"]).toBe("Smith");
  });

  it("matches numeric values (converted to string)", () => {
    const jsonLd = JSON.stringify({
      "http://example.org/age": 25,
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/age"]).toBe("25");
  });

  it("matches @value objects", () => {
    const jsonLd = JSON.stringify({
      "http://example.org/firstName": {
        "@value": "Bob",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("Bob");
  });

  it("matches @id references", () => {
    const jsonLd = JSON.stringify({
      "http://example.org/firstName": { "@id": "http://example.org/people/alice" },
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("http://example.org/people/alice");
  });

  it("ignores predicates not in SHACL paths", () => {
    const jsonLd = JSON.stringify({
      "http://example.org/firstName": "Alice",
      "http://other.org/unrelated": "ignored",
      "http://example.org/email": "alice@example.org",
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("Alice");
    expect(result).not.toHaveProperty("http://other.org/unrelated");
    expect(result).not.toHaveProperty("http://example.org/email");
  });

  it("handles nested JSON-LD objects", () => {
    const jsonLd = JSON.stringify({
      "@type": "http://example.org/Person",
      "http://example.org/details": {
        "http://example.org/firstName": "Nested",
      },
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("Nested");
  });

  it("handles JSON-LD arrays", () => {
    const jsonLd = JSON.stringify([
      { "http://example.org/firstName": "First" },
      { "http://example.org/lastName": "Last" },
    ]);

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("First");
    expect(result["http://example.org/lastName"]).toBe("Last");
  });

  it("returns empty map for invalid JSON", () => {
    const result = prefillFromJsonLd(model, model.prefixList, "not json at all {{{");
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("returns empty map for empty JSON", () => {
    const result = prefillFromJsonLd(model, model.prefixList, "{}");
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("skips @context and other JSON-LD keywords", () => {
    const jsonLd = JSON.stringify({
      "@context": { ex: "http://example.org/" },
      "@type": "ex:Person",
      "@id": "http://example.org/people/1",
      "http://example.org/firstName": "Test",
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("Test");
    expect(result).not.toHaveProperty("@context");
    expect(result).not.toHaveProperty("@type");
    expect(result).not.toHaveProperty("@id");
  });

  it("matches prefixed keys using the prefix list", () => {
    const jsonLd = JSON.stringify({
      "ex:firstName": "PrefixAlice",
      "ex:age": 30,
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("PrefixAlice");
    expect(result["http://example.org/age"]).toBe("30");
  });

  it("matches bare local names against SHACL path local names", () => {
    const jsonLd = JSON.stringify({
      "@type": "ex:Person",
      "ex:details": {
        "firstName": "BareName",
        "lastName": "LocalOnly",
      },
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("BareName");
    expect(result["http://example.org/lastName"]).toBe("LocalOnly");
  });

  it("matches nested prefixed keys (pipeline format)", () => {
    const jsonLd = JSON.stringify({
      "ex:hasPerson": {
        "@type": "ex:Person",
        "ex:firstName": "Nested",
        "age": 42,
      },
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("Nested");
    expect(result["http://example.org/age"]).toBe("42");
  });

  it("extracts values from arrays", () => {
    const jsonLd = JSON.stringify({
      "http://example.org/firstName": ["Alice", "Bob"],
    });

    const result = prefillFromJsonLd(model, model.prefixList, jsonLd);
    expect(result["http://example.org/firstName"]).toBe("Alice, Bob");
  });
});
