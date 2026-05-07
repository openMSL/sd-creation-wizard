import { describe, it, expect } from "vitest";
import { shapeToSteps } from "../shape-to-fields";
import type { ShaclModel } from "@/types";

describe("shapeToSteps", () => {
  it("converts a simple model into wizard steps", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "https://example.org/" }],
      shapes: [
        {
          schema: "https://example.org/PersonShape",
          targetClassPrefix: "ex",
          targetClassName: "Person",
          constraints: [
            {
              path: { prefix: "ex", value: "name" },
              name: "Name",
              datatype: { prefix: "xsd", value: "string" },
              clazz: null,
              minCount: 1,
              maxCount: 1,
              order: 1,
              description: null,
              example: null,
              in: [],
              or: null,
              validations: [],
              children: null,
            },
            {
              path: { prefix: "ex", value: "age" },
              name: "Age",
              datatype: { prefix: "xsd", value: "integer" },
              clazz: null,
              minCount: 0,
              maxCount: 1,
              order: 2,
              description: null,
              example: null,
              in: [],
              or: null,
              validations: [],
              children: null,
            },
          ],
        },
      ],
    };

    const steps = shapeToSteps(model);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.label).toBe("Person");
    expect(steps[0]!.fields).toHaveLength(2);
    expect(steps[0]!.fields[0]!.key).toBe("ex:name");
    expect(steps[0]!.fields[0]!.type).toBe("text");
    expect(steps[0]!.fields[0]!.required).toBe(true);
    expect(steps[0]!.fields[1]!.key).toBe("ex:age");
    expect(steps[0]!.fields[1]!.type).toBe("number");
    expect(steps[0]!.fields[1]!.required).toBe(false);
  });

  it("handles sh:in as select fields", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "https://example.org/" }],
      shapes: [
        {
          schema: "https://example.org/TestShape",
          targetClassPrefix: "ex",
          targetClassName: "Test",
          constraints: [
            {
              path: { prefix: "ex", value: "color" },
              name: "Color",
              datatype: {},
              clazz: null,
              minCount: 1,
              maxCount: 1,
              order: 1,
              description: null,
              example: null,
              in: [
                { prefix: null, value: "Red" },
                { prefix: null, value: "Blue" },
                { prefix: null, value: "Green" },
              ],
              or: null,
              validations: [],
              children: null,
            },
          ],
        },
      ],
    };

    const steps = shapeToSteps(model);
    const field = steps[0]!.fields[0]!;
    expect(field.type).toBe("select");
    expect(field.options).toHaveLength(3);
    expect(field.options![0]!.label).toBe("Red");
  });

  it("handles nested sh:node as field groups", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "https://example.org/" }],
      shapes: [
        {
          schema: "https://example.org/ParentShape",
          targetClassPrefix: "ex",
          targetClassName: "Parent",
          constraints: [
            {
              path: { prefix: "ex", value: "child" },
              name: "Child",
              datatype: {},
              clazz: null,
              minCount: 1,
              maxCount: 1,
              order: 1,
              description: null,
              example: null,
              in: [],
              or: null,
              validations: [],
              children: "ChildShape",
            },
          ],
        },
        {
          schema: "https://example.org/ChildShape",
          targetClassPrefix: "ex",
          targetClassName: "Child",
          constraints: [
            {
              path: { prefix: "ex", value: "value" },
              name: "Value",
              datatype: { prefix: "xsd", value: "string" },
              clazz: null,
              minCount: 0,
              maxCount: 1,
              order: 1,
              description: null,
              example: null,
              in: [],
              or: null,
              validations: [],
              children: null,
            },
          ],
        },
      ],
    };

    const steps = shapeToSteps(model);
    const parentStep = steps.find((s) => s.label === "Parent")!;
    expect(parentStep).toBeDefined();
    const childField = parentStep.fields[0]!;
    expect(childField.type).toBe("group");
    expect(childField.children).toHaveLength(1);
    expect(childField.children![0]!.key).toBe("ex:value");
  });

  it("handles repeatable fields", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "https://example.org/" }],
      shapes: [
        {
          schema: "https://example.org/ListShape",
          targetClassPrefix: "ex",
          targetClassName: "List",
          constraints: [
            {
              path: { prefix: "ex", value: "items" },
              name: "Items",
              datatype: {},
              clazz: null,
              minCount: 0,
              maxCount: null,
              order: 1,
              description: null,
              example: null,
              in: [],
              or: null,
              validations: [],
              children: "Item",
            },
          ],
        },
        {
          schema: "https://example.org/ItemShape",
          targetClassPrefix: "ex",
          targetClassName: "Item",
          constraints: [
            {
              path: { prefix: "ex", value: "label" },
              name: "Label",
              datatype: { prefix: "xsd", value: "string" },
              clazz: null,
              minCount: 1,
              maxCount: 1,
              order: 1,
              description: null,
              example: null,
              in: [],
              or: null,
              validations: [],
              children: null,
            },
          ],
        },
      ],
    };

    const steps = shapeToSteps(model);
    const listStep = steps.find((s) => s.label === "List")!;
    const field = listStep.fields[0]!;
    expect(field.type).toBe("repeat");
    expect(field.maxItems).toBeNull();
    expect(field.children).toHaveLength(1);
  });
});
