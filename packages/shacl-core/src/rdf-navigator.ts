/**
 * Lightweight RDF graph navigator built on N3 Store.
 * Replaces clownface/grapoi with zero external dependencies.
 */

import type { Store, Term, Quad } from "n3";
import { RDF } from "./namespaces.js";

export class RdfNavigator {
  constructor(private store: Store) {}

  /**
   * Get all objects for a given subject and predicate.
   */
  out(subject: Term, predicate: Term): Term[] {
    return this.store.getObjects(subject, predicate, null);
  }

  /**
   * Get the first object for a given subject and predicate, or null.
   */
  outOne(subject: Term, predicate: Term): Term | null {
    const objects = this.store.getObjects(subject, predicate, null);
    return objects.length > 0 ? objects[0]! : null;
  }

  /**
   * Get all subjects that have the given predicate and object.
   */
  subjects(predicate: Term, object: Term): Term[] {
    return this.store.getSubjects(predicate, object, null);
  }

  /**
   * Traverse an RDF list (rdf:first/rdf:rest chain) and return all items.
   */
  list(head: Term): Term[] {
    const items: Term[] = [];
    let current: Term = head;

    while (current.value !== RDF.nil.value) {
      const firstValues = this.store.getObjects(current, RDF.first, null);
      if (firstValues.length === 0) break;
      items.push(firstValues[0]!);

      const restValues = this.store.getObjects(current, RDF.rest, null);
      if (restValues.length === 0) break;
      current = restValues[0]!;
    }

    return items;
  }

  /**
   * Get all quads matching the pattern.
   */
  match(subject?: Term | null, predicate?: Term | null, object?: Term | null): Quad[] {
    return this.store.getQuads(subject ?? null, predicate ?? null, object ?? null, null);
  }

  /**
   * Read a string value from a predicate, or null if not present.
   */
  stringValue(subject: Term, predicate: Term): string | null {
    const obj = this.outOne(subject, predicate);
    return obj ? obj.value : null;
  }

  /**
   * Read an integer value from a predicate, or null if not present.
   */
  intValue(subject: Term, predicate: Term): number | null {
    const obj = this.outOne(subject, predicate);
    if (!obj) return null;
    const parsed = parseInt(obj.value, 10);
    return isNaN(parsed) ? null : parsed;
  }
}
