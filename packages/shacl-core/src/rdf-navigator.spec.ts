/**
 * Unit tests for RdfNavigator — custom RDF graph traversal on N3 Store.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Store, Parser } from "n3";
import { RdfNavigator } from "./rdf-navigator.js";
import { RDF, SH } from "./namespaces.js";
import { DataFactory } from "n3";

const { namedNode } = DataFactory;

describe("RdfNavigator", () => {
  let store: Store;
  let nav: RdfNavigator;

  const TTL_SAMPLE = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix ex: <http://example.org/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

    ex:PersonShape a sh:NodeShape ;
      sh:targetClass ex:Person ;
      sh:property ex:nameProp, ex:ageProp .

    ex:nameProp
      sh:path ex:name ;
      sh:datatype xsd:string ;
      sh:minCount 1 ;
      sh:maxCount 1 ;
      sh:name "Full Name" .

    ex:ageProp
      sh:path ex:age ;
      sh:datatype xsd:integer ;
      sh:minCount 0 ;
      sh:in ( "young" "middle" "old" ) .
  `;

  beforeEach(() => {
    store = new Store();
    const parser = new Parser();
    store.addQuads(parser.parse(TTL_SAMPLE));
    nav = new RdfNavigator(store);
  });

  describe("out()", () => {
    it("returns all objects for subject-predicate pair", () => {
      const results = nav.out(namedNode("http://example.org/PersonShape"), SH.property);
      expect(results).toHaveLength(2);
    });

    it("returns empty array when no matches", () => {
      const results = nav.out(namedNode("http://example.org/NonExistent"), SH.property);
      expect(results).toHaveLength(0);
    });
  });

  describe("outOne()", () => {
    it("returns the first matching object", () => {
      const result = nav.outOne(namedNode("http://example.org/nameProp"), SH.datatype);
      expect(result).not.toBeNull();
      expect(result!.value).toBe("http://www.w3.org/2001/XMLSchema#string");
    });

    it("returns null when no matches", () => {
      const result = nav.outOne(namedNode("http://example.org/nameProp"), SH.class);
      expect(result).toBeNull();
    });
  });

  describe("subjects()", () => {
    it("finds subjects with given predicate-object", () => {
      const shapes = nav.subjects(RDF.type, SH.NodeShape);
      expect(shapes).toHaveLength(1);
      expect(shapes[0]!.value).toBe("http://example.org/PersonShape");
    });

    it("returns empty array when no matches", () => {
      const result = nav.subjects(RDF.type, namedNode("http://example.org/Nonexistent"));
      expect(result).toHaveLength(0);
    });
  });

  describe("list()", () => {
    it("traverses an RDF list and returns all items", () => {
      const inHead = nav.outOne(namedNode("http://example.org/ageProp"), SH.in);
      expect(inHead).not.toBeNull();

      const items = nav.list(inHead!);
      expect(items).toHaveLength(3);
      expect(items.map((t) => t.value)).toEqual(["young", "middle", "old"]);
    });

    it("returns empty array for rdf:nil", () => {
      const items = nav.list(RDF.nil);
      expect(items).toHaveLength(0);
    });
  });

  describe("stringValue()", () => {
    it("returns string value of a literal", () => {
      const name = nav.stringValue(namedNode("http://example.org/nameProp"), SH.name);
      expect(name).toBe("Full Name");
    });

    it("returns null when predicate not found", () => {
      const result = nav.stringValue(namedNode("http://example.org/nameProp"), SH.description);
      expect(result).toBeNull();
    });
  });

  describe("intValue()", () => {
    it("parses integer from literal", () => {
      const min = nav.intValue(namedNode("http://example.org/nameProp"), SH.minCount);
      expect(min).toBe(1);
    });

    it("returns null when predicate not found", () => {
      const result = nav.intValue(namedNode("http://example.org/nameProp"), SH.order);
      expect(result).toBeNull();
    });

    it("returns null for non-numeric value", () => {
      const result = nav.intValue(namedNode("http://example.org/nameProp"), SH.name);
      expect(result).toBeNull();
    });
  });

  describe("match()", () => {
    it("returns quads matching the pattern", () => {
      const quads = nav.match(namedNode("http://example.org/PersonShape"), null, null);
      expect(quads.length).toBeGreaterThan(0);
    });

    it("returns empty array when no matches", () => {
      const quads = nav.match(namedNode("http://nonexistent.org/"), null, null);
      expect(quads).toHaveLength(0);
    });
  });
});
