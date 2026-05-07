/**
 * SHACL-to-form-model extractor.
 * Parses SHACL Turtle and produces a ShaclModel JSON matching the Java API's output.
 */

import { Parser, Store, type Term } from "n3";
import { RdfNavigator } from "./rdf-navigator.js";
import { RDF, SH, SKOS, localName, namespace } from "./namespaces.js";
import type {
  ClassConstraint,
  ConstraintOption,
  ShaclModel,
  ShapeProperties,
  VicShape,
} from "./types.js";

/**
 * Parse a SHACL Turtle string and extract the form model.
 */
export function extractShaclModel(turtleContent: string): ShaclModel {
  const store = new Store();
  const parser = new Parser();
  const prefixList: Array<{ alias: string; url: string }> = [];

  const quads = parser.parse(turtleContent, null, (prefix, prefixNode) => {
    prefixList.push({ alias: prefix, url: prefixNode.value });
  });
  store.addQuads(quads);

  const nav = new RdfNavigator(store);
  const prefixMap = new Map(prefixList.map((p) => [p.url, p.alias]));
  const shapes = extractShapes(nav, store, prefixMap);

  return stripNulls({ prefixList, shapes }) as ShaclModel;
}

/**
 * Recursively strip null/undefined fields from objects and arrays.
 * Matches Jackson @JsonInclude(NON_NULL) behavior.
 * Empty objects {} and empty arrays [] are preserved (they are NOT null).
 */
function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls).filter((v) => v !== undefined);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      result[key] = stripNulls(value);
    }
    return result;
  }
  return obj;
}

/**
 * Find prefix alias for a namespace URL (O(1) lookup).
 */
function getPrefixAlias(prefixMap: Map<string, string>, namespaceUrl: string): string | null {
  return prefixMap.get(namespaceUrl) ?? null;
}

/**
 * Create a ClassConstraint from a URI using the prefix map.
 */
function toClassConstraint(uri: string, prefixMap: Map<string, string>): ClassConstraint {
  const ns = namespace(uri);
  const prefix = getPrefixAlias(prefixMap, ns);
  return { prefix, value: localName(uri) };
}

/**
 * Extract all shapes from the store.
 */
function extractShapes(
  nav: RdfNavigator,
  store: Store,
  prefixMap: Map<string, string>
): VicShape[] {
  const shapeNodes = nav.subjects(RDF.type, SH.NodeShape);

  const shapes: VicShape[] = [];
  for (const shapeNode of shapeNodes) {
    // Skip blank node shapes at top level
    if (shapeNode.termType !== "NamedNode") continue;

    const shape = constructVicShape(nav, shapeNode, prefixMap);
    if (shape) shapes.push(shape);
  }

  // Sort shapes by depth (leaf shapes first, like the Java API)
  return sortShapesByDepth(shapes, nav, store);
}

/**
 * Construct a VicShape from a shape node.
 */
function constructVicShape(
  nav: RdfNavigator,
  shapeNode: Term,
  prefixMap: Map<string, string>
): VicShape | null {
  const targetClassNode = nav.outOne(shapeNode, SH.targetClass);
  const targetUri = targetClassNode ? targetClassNode.value : shapeNode.value;

  const targetNs = namespace(targetUri);
  const targetClassPrefix = getPrefixAlias(prefixMap, targetNs) ?? "";
  const targetClassName = localName(targetUri);

  const constraints = extractProperties(nav, shapeNode, prefixMap);

  return {
    schema: localName(shapeNode.value),
    targetClassPrefix,
    targetClassName,
    constraints,
  };
}

/**
 * Extract property constraints from a shape.
 */
function extractProperties(
  nav: RdfNavigator,
  shapeNode: Term,
  prefixMap: Map<string, string>
): ShapeProperties[] {
  const propertyNodes = nav.out(shapeNode, SH.property);
  const properties: ShapeProperties[] = [];

  for (const propNode of propertyNodes) {
    const prop = extractSingleProperty(nav, propNode, prefixMap);
    if (prop) properties.push(prop);
  }

  // Reverse to match Jena's iteration order (reverse of TTL insertion)
  properties.reverse();
  return properties;
}

/**
 * Extract constraints from a single property shape node.
 */
function extractSingleProperty(
  nav: RdfNavigator,
  propNode: Term,
  prefixMap: Map<string, string>
): ShapeProperties | null {
  const pathNode = nav.outOne(propNode, SH.path);

  const path = pathNode ? toClassConstraint(pathNode.value, prefixMap) : null;
  const name = nav.stringValue(propNode, SH.name) ?? null;

  // Datatype (Java always returns a Map — empty {} when not present)
  let datatype: ClassConstraint | Record<string, never> = {};
  const datatypeNode = nav.outOne(propNode, SH.datatype);
  if (datatypeNode) {
    datatype = toClassConstraint(datatypeNode.value, prefixMap);
  }

  // NodeKind (overrides datatype if IRI)
  const nodeKindNode = nav.outOne(propNode, SH.nodeKind);
  if (nodeKindNode?.value === SH.IRI.value) {
    datatype = { prefix: "nodeKind", value: "IRI" };
  }

  // Class constraint
  let clazz: ClassConstraint | null = null;
  const classNode = nav.outOne(propNode, SH.class);
  if (classNode) {
    clazz = toClassConstraint(classNode.value, prefixMap);
  }

  // Counts and order
  const minCount = nav.intValue(propNode, SH.minCount);
  const maxCount = nav.intValue(propNode, SH.maxCount);
  const order = nav.intValue(propNode, SH.order);

  // Group (goes into validations, not a separate field — matches Java)
  const groupNode = nav.outOne(propNode, SH.group);

  // Description (multi-language)
  const description = readMultiLanguageProperty(nav, propNode, SH.description);

  // Example
  const example = nav.stringValue(propNode, SKOS.example);

  // sh:in (enum values — Java always returns a List, empty [] when not present)
  const inValues = extractInValues(nav, propNode, prefixMap);

  // sh:or (union constraints)
  const orValues = extractOrValues(nav, propNode, prefixMap);

  // sh:node (nested children — use local name like Java API)
  const nodeRef = nav.outOne(propNode, SH.node);
  const children = nodeRef ? localName(nodeRef.value) : null;

  // Validation constraints
  const validations = extractValidations(nav, propNode);

  // Add group to validations if present (Java puts group in validations array)
  if (groupNode) {
    validations.push({ key: "group", value: localName(groupNode.value) });
  }

  return {
    path,
    name,
    datatype,
    clazz,
    minCount,
    maxCount,
    order,
    description: description && Object.keys(description).length > 0 ? description : null,
    example,
    in: inValues,
    or: orValues,
    validations,
    children,
  };
}

/**
 * Extract sh:in enum values.
 */
function extractInValues(
  nav: RdfNavigator,
  propNode: Term,
  prefixMap: Map<string, string>
): ClassConstraint[] {
  const inListHead = nav.outOne(propNode, SH.in);
  if (!inListHead) return [];

  const items = nav.list(inListHead);
  if (items.length === 0) return [];

  return items.map((item) => {
    if (item.termType === "Literal") {
      return { prefix: null, value: item.value };
    }
    return toClassConstraint(item.value, prefixMap);
  });
}

/**
 * Extract sh:or union constraints.
 */
function extractOrValues(
  nav: RdfNavigator,
  propNode: Term,
  prefixMap: Map<string, string>
): ShapeProperties[] | null {
  const orListHead = nav.outOne(propNode, SH.or);
  if (!orListHead) return null;

  const orItems = nav.list(orListHead);
  if (orItems.length === 0) return null;

  const results: ShapeProperties[] = [];
  for (const orItem of orItems) {
    // Skip items with sh:and or sh:property (complex, unsupported like Java)
    const hasAnd = nav.outOne(orItem, SH.and);
    const hasProperty = nav.outOne(orItem, SH.property);
    if (hasAnd || hasProperty) continue;

    const prop = extractOrBranch(nav, orItem, prefixMap);
    if (prop) results.push(prop);
  }

  return results.length > 0 ? results : null;
}

/**
 * Extract a single sh:or branch's constraints.
 * Now includes name, description, in values, and validations (matching main property extraction).
 */
function extractOrBranch(
  nav: RdfNavigator,
  orItem: Term,
  prefixMap: Map<string, string>
): ShapeProperties | null {
  let datatype: ClassConstraint | Record<string, never> = {};
  const datatypeNode = nav.outOne(orItem, SH.datatype);
  if (datatypeNode) {
    datatype = toClassConstraint(datatypeNode.value, prefixMap);
  }

  const nodeKindNode = nav.outOne(orItem, SH.nodeKind);
  if (nodeKindNode?.value === SH.IRI.value) {
    datatype = { prefix: "nodeKind", value: "IRI" };
  }

  let clazz: ClassConstraint | null = null;
  const classNode = nav.outOne(orItem, SH.class);
  if (classNode) {
    clazz = toClassConstraint(classNode.value, prefixMap);
  }

  let path: ClassConstraint | null = null;
  const pathNode = nav.outOne(orItem, SH.path);
  if (pathNode) {
    path = toClassConstraint(pathNode.value, prefixMap);
  }

  const minCount = nav.intValue(orItem, SH.minCount);
  const maxCount = nav.intValue(orItem, SH.maxCount);

  const nodeRef = nav.outOne(orItem, SH.node);
  const children = nodeRef ? localName(nodeRef.value) : null;

  // Extract name and description (previously missing)
  const name = nav.stringValue(orItem, SH.name) ?? null;
  const description = readMultiLanguageProperty(nav, orItem, SH.description);

  // Extract sh:in values (previously missing)
  const inValues = extractInValues(nav, orItem, prefixMap);

  // Extract validations (previously missing)
  const validations = extractValidations(nav, orItem);

  return {
    path,
    name,
    datatype,
    clazz,
    minCount,
    maxCount,
    order: null,
    description: description && Object.keys(description).length > 0 ? description : null,
    example: null,
    in: inValues,
    or: null,
    validations,
    children,
  };
}

/**
 * Extract validation constraints (minLength, maxLength, etc.)
 * Numeric validators use integer values; pattern uses string — matching Java behavior.
 */
function extractValidations(nav: RdfNavigator, propNode: Term): ConstraintOption[] {
  const validations: ConstraintOption[] = [];

  const numericChecks: Array<{ predicate: Term; key: string }> = [
    { predicate: SH.minLength, key: "minLength" },
    { predicate: SH.maxLength, key: "maxLength" },
    { predicate: SH.minInclusive, key: "minInclusive" },
    { predicate: SH.maxInclusive, key: "maxInclusive" },
    { predicate: SH.minExclusive, key: "minExclusive" },
    { predicate: SH.maxExclusive, key: "maxExclusive" },
  ];

  for (const { predicate, key } of numericChecks) {
    const value = nav.intValue(propNode, predicate);
    if (value !== null) {
      validations.push({ key, value });
    }
  }

  // Pattern is a string value
  const pattern = nav.stringValue(propNode, SH.pattern);
  if (pattern !== null) {
    validations.push({ key: "pattern", value: pattern });
  }

  return validations;
}

/**
 * Read multi-language property (e.g., sh:description with language tags).
 */
function readMultiLanguageProperty(
  nav: RdfNavigator,
  subject: Term,
  predicate: Term
): Record<string, string> | null {
  const objects = nav.out(subject, predicate);
  if (objects.length === 0) return null;

  const result: Record<string, string> = {};
  for (const obj of objects) {
    if (obj.termType === "Literal") {
      // Use the literal's language tag; default to "en" for untagged literals
      // (matches Java API behavior where plain strings are treated as English)
      const lang = (obj as { language?: string }).language || "en";
      result[lang] = obj.value;
    } else {
      result["en"] = obj.value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Sort shapes by depth (leaf shapes first) to match Java API behavior.
 */
function sortShapesByDepth(shapes: VicShape[], _nav: RdfNavigator, _store: Store): VicShape[] {
  // Calculate depth: shapes referenced as children have higher depth
  const depthMap = new Map<string, number>();

  for (const shape of shapes) {
    if (!depthMap.has(shape.schema)) {
      depthMap.set(shape.schema, calculateDepth(shape.schema, shapes, depthMap));
    }
  }

  return [...shapes].sort((a, b) => {
    const depthA = depthMap.get(a.schema) ?? 0;
    const depthB = depthMap.get(b.schema) ?? 0;
    return depthA - depthB;
  });
}

/**
 * Calculate the nesting depth of a shape.
 * Uses a visiting set to detect cycles (self-referencing shapes).
 */
function calculateDepth(
  schemaUri: string,
  shapes: VicShape[],
  depthMap: Map<string, number>,
  visiting?: Set<string>
): number {
  if (depthMap.has(schemaUri)) return depthMap.get(schemaUri)!;

  const currentVisiting = visiting ?? new Set<string>();
  if (currentVisiting.has(schemaUri)) return 0; // cycle detected
  currentVisiting.add(schemaUri);

  const shape = shapes.find((s) => s.schema === schemaUri);
  if (!shape) return 0;

  let maxChildDepth = 0;
  for (const constraint of shape.constraints) {
    if (constraint.children) {
      const childDepth = calculateDepth(constraint.children, shapes, depthMap, currentVisiting);
      maxChildDepth = Math.max(maxChildDepth, childDepth + 1);
    }
  }

  depthMap.set(schemaUri, maxChildDepth);
  return maxChildDepth;
}
