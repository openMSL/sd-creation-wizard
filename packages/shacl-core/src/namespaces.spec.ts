/**
 * Unit tests for namespace utilities.
 */

import { describe, it, expect } from "vitest";
import { RDF, SH, SKOS, localName, namespace } from "./namespaces.js";

describe("Namespace constants", () => {
  it("SH namespace has correct base URI", () => {
    expect(SH.NodeShape.value).toBe("http://www.w3.org/ns/shacl#NodeShape");
    expect(SH.property.value).toBe("http://www.w3.org/ns/shacl#property");
    expect(SH.path.value).toBe("http://www.w3.org/ns/shacl#path");
    expect(SH.datatype.value).toBe("http://www.w3.org/ns/shacl#datatype");
    expect(SH.minCount.value).toBe("http://www.w3.org/ns/shacl#minCount");
    expect(SH.maxCount.value).toBe("http://www.w3.org/ns/shacl#maxCount");
    expect(SH.in.value).toBe("http://www.w3.org/ns/shacl#in");
    expect(SH.or.value).toBe("http://www.w3.org/ns/shacl#or");
    expect(SH.and.value).toBe("http://www.w3.org/ns/shacl#and");
    expect(SH.node.value).toBe("http://www.w3.org/ns/shacl#node");
    expect(SH.nodeKind.value).toBe("http://www.w3.org/ns/shacl#nodeKind");
    expect(SH.IRI.value).toBe("http://www.w3.org/ns/shacl#IRI");
    expect(SH.class.value).toBe("http://www.w3.org/ns/shacl#class");
    expect(SH.name.value).toBe("http://www.w3.org/ns/shacl#name");
    expect(SH.description.value).toBe("http://www.w3.org/ns/shacl#description");
    expect(SH.order.value).toBe("http://www.w3.org/ns/shacl#order");
    expect(SH.group.value).toBe("http://www.w3.org/ns/shacl#group");
    expect(SH.targetClass.value).toBe("http://www.w3.org/ns/shacl#targetClass");
    expect(SH.pattern.value).toBe("http://www.w3.org/ns/shacl#pattern");
    expect(SH.minLength.value).toBe("http://www.w3.org/ns/shacl#minLength");
    expect(SH.maxLength.value).toBe("http://www.w3.org/ns/shacl#maxLength");
    expect(SH.minInclusive.value).toBe("http://www.w3.org/ns/shacl#minInclusive");
    expect(SH.maxInclusive.value).toBe("http://www.w3.org/ns/shacl#maxInclusive");
    expect(SH.minExclusive.value).toBe("http://www.w3.org/ns/shacl#minExclusive");
    expect(SH.maxExclusive.value).toBe("http://www.w3.org/ns/shacl#maxExclusive");
  });

  it("RDF namespace has correct terms", () => {
    expect(RDF.type.value).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    expect(RDF.first.value).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#first");
    expect(RDF.rest.value).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest");
    expect(RDF.nil.value).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");
  });

  it("SKOS namespace has correct terms", () => {
    expect(SKOS.example.value).toBe("http://www.w3.org/2004/02/skos/core#example");
  });
});

describe("localName()", () => {
  it("extracts fragment after hash", () => {
    expect(localName("http://www.w3.org/ns/shacl#NodeShape")).toBe("NodeShape");
  });

  it("extracts segment after last slash", () => {
    expect(localName("http://schema.org/Person")).toBe("Person");
  });

  it("handles URIs with both hash and slashes", () => {
    expect(localName("http://example.org/ns#localPart")).toBe("localPart");
  });

  it("returns full URI when no separator found", () => {
    expect(localName("urn:example")).toBe("urn:example");
  });

  it("handles empty fragment", () => {
    expect(localName("http://example.org/")).toBe("");
  });
});

describe("namespace()", () => {
  it("extracts namespace up to and including hash", () => {
    expect(namespace("http://www.w3.org/ns/shacl#NodeShape")).toBe("http://www.w3.org/ns/shacl#");
  });

  it("extracts namespace up to and including last slash", () => {
    expect(namespace("http://schema.org/Person")).toBe("http://schema.org/");
  });

  it("returns empty string when no # or / separator", () => {
    expect(namespace("urn:example")).toBe("");
  });
});
