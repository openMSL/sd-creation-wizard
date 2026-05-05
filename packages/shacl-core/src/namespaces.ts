/**
 * RDF/SHACL namespace URI constants.
 */

import { DataFactory } from "n3";

const { namedNode } = DataFactory;

export const RDF = {
  type: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
  first: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#first"),
  rest: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"),
  nil: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"),
} as const;

export const SH = {
  NodeShape: namedNode("http://www.w3.org/ns/shacl#NodeShape"),
  targetClass: namedNode("http://www.w3.org/ns/shacl#targetClass"),
  property: namedNode("http://www.w3.org/ns/shacl#property"),
  path: namedNode("http://www.w3.org/ns/shacl#path"),
  name: namedNode("http://www.w3.org/ns/shacl#name"),
  description: namedNode("http://www.w3.org/ns/shacl#description"),
  datatype: namedNode("http://www.w3.org/ns/shacl#datatype"),
  nodeKind: namedNode("http://www.w3.org/ns/shacl#nodeKind"),
  IRI: namedNode("http://www.w3.org/ns/shacl#IRI"),
  class: namedNode("http://www.w3.org/ns/shacl#class"),
  node: namedNode("http://www.w3.org/ns/shacl#node"),
  in: namedNode("http://www.w3.org/ns/shacl#in"),
  or: namedNode("http://www.w3.org/ns/shacl#or"),
  and: namedNode("http://www.w3.org/ns/shacl#and"),
  minCount: namedNode("http://www.w3.org/ns/shacl#minCount"),
  maxCount: namedNode("http://www.w3.org/ns/shacl#maxCount"),
  minLength: namedNode("http://www.w3.org/ns/shacl#minLength"),
  maxLength: namedNode("http://www.w3.org/ns/shacl#maxLength"),
  minInclusive: namedNode("http://www.w3.org/ns/shacl#minInclusive"),
  maxInclusive: namedNode("http://www.w3.org/ns/shacl#maxInclusive"),
  minExclusive: namedNode("http://www.w3.org/ns/shacl#minExclusive"),
  maxExclusive: namedNode("http://www.w3.org/ns/shacl#maxExclusive"),
  pattern: namedNode("http://www.w3.org/ns/shacl#pattern"),
  order: namedNode("http://www.w3.org/ns/shacl#order"),
  group: namedNode("http://www.w3.org/ns/shacl#group"),
  message: namedNode("http://www.w3.org/ns/shacl#message"),
} as const;

export const SKOS = {
  example: namedNode("http://www.w3.org/2004/02/skos/core#example"),
} as const;

/**
 * Extract the local name from a full URI (part after last # or /).
 */
export function localName(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx >= 0) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx >= 0) return uri.slice(slashIdx + 1);
  return uri;
}

/**
 * Extract the namespace from a full URI (part before and including last # or /).
 */
export function namespace(uri: string): string {
  const hashIdx = uri.lastIndexOf("#");
  if (hashIdx >= 0) return uri.slice(0, hashIdx + 1);
  const slashIdx = uri.lastIndexOf("/");
  if (slashIdx >= 0) return uri.slice(0, slashIdx + 1);
  return "";
}
