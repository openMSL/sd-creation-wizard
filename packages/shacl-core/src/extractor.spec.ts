/**
 * Golden fixture tests for SHACL extractor.
 * Feeds each .ttl input through extractShaclModel and compares
 * the output to the expected .json from the Java API test suite.
 *
 * Uses lenient comparison matching Java's JSONAssert NON_STRICT mode:
 * - Extra fields in actual are allowed
 * - Array order doesn't matter
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { extractShaclModel } from "./extractor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_BASE = join(__dirname, "../../testing/fixtures");
const INPUTS_DIR = join(FIXTURES_BASE, "inputs");
const EXPECTED_DIR = join(FIXTURES_BASE, "expected");

/**
 * Lenient JSON comparison matching JSONAssert NON_STRICT mode:
 * - All fields in expected must exist in actual with correct values
 * - Additional fields in actual are OK (ignored)
 * - Array comparison is order-independent (set-like matching)
 */
function lenientMatch(actual: unknown, expected: unknown, path = ""): string[] {
  const errors: string[] = [];

  if (expected === null || expected === undefined) {
    // Expected null/undefined — actual should also be null/undefined/absent
    if (actual !== null && actual !== undefined) {
      errors.push(`${path}: expected null/undefined but got ${JSON.stringify(actual)}`);
    }
    return errors;
  }

  if (typeof expected !== typeof actual) {
    errors.push(`${path}: type mismatch — expected ${typeof expected} but got ${typeof actual}`);
    return errors;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      errors.push(`${path}: expected array but got ${typeof actual}`);
      return errors;
    }
    // Each expected item must find a match in actual (order-independent)
    const used = new Set<number>();
    for (let i = 0; i < expected.length; i++) {
      let found = false;
      for (let j = 0; j < actual.length; j++) {
        if (used.has(j)) continue;
        const errs = lenientMatch(actual[j], expected[i], `${path}[${i}]`);
        if (errs.length === 0) {
          found = true;
          used.add(j);
          break;
        }
      }
      if (!found) {
        errors.push(
          `${path}[${i}]: no matching item found in actual for ${JSON.stringify(expected[i])}`
        );
      }
    }
    return errors;
  }

  if (typeof expected === "object") {
    if (typeof actual !== "object" || actual === null) {
      errors.push(`${path}: expected object but got ${actual === null ? "null" : typeof actual}`);
      return errors;
    }
    // All keys in expected must exist in actual
    for (const key of Object.keys(expected as Record<string, unknown>)) {
      const exp = (expected as Record<string, unknown>)[key];
      const act = (actual as Record<string, unknown>)[key];
      errors.push(...lenientMatch(act, exp, `${path}.${key}`));
    }
    return errors;
  }

  // Primitive comparison
  if (actual !== expected) {
    errors.push(`${path}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
  return errors;
}

// Build test pairs: input .ttl → expected .json
function getTestCases(): Array<{ name: string; inputPath: string; expectedPath: string }> {
  const inputFiles = readdirSync(INPUTS_DIR).filter((f) => f.endsWith(".ttl"));
  const cases: Array<{ name: string; inputPath: string; expectedPath: string }> = [];

  for (const inputFile of inputFiles) {
    const stem = inputFile.replace(/\.ttl$/, "");
    const expectedFile = `${stem}-output.json`;
    const expectedPath = join(EXPECTED_DIR, expectedFile);

    // Only include if there's a matching expected output
    try {
      readFileSync(expectedPath);
      cases.push({
        name: stem,
        inputPath: join(INPUTS_DIR, inputFile),
        expectedPath,
      });
    } catch {
      // No matching expected file — skip
    }
  }

  return cases;
}

describe("extractShaclModel - golden fixture tests", () => {
  const testCases = getTestCases();

  it.each(testCases)("should produce correct output for $name", ({ inputPath, expectedPath }) => {
    const input = readFileSync(inputPath, "utf-8");
    const expected = JSON.parse(readFileSync(expectedPath, "utf-8"));

    const result = extractShaclModel(input);

    // Lenient comparison (matches Java's JSONAssert NON_STRICT mode)
    const shapeErrors = lenientMatch(result.shapes, expected.shapes, "shapes");
    if (shapeErrors.length > 0) {
      throw new Error(
        `Fixture mismatch:\n${shapeErrors.join("\n")}\n\nActual:\n${JSON.stringify(result.shapes, null, 2)}`
      );
    }
  });

  it("should have test cases available", () => {
    expect(testCases.length).toBeGreaterThan(0);
  });
});
