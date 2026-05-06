import { TestBed } from "@angular/core/testing";
import { ShapeToFormlyService } from "./shape-to-formly.service";
import { ShaclModel, ShapeProperties } from "../models/shacl.model";

describe("ShapeToFormlyService", () => {
  let service: ShapeToFormlyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShapeToFormlyService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should convert a ShaclModel to steps", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "scenario", url: "https://example.org/scenario/" }],
      shapes: [
        {
          schema: "https://example.org/scenario.shacl.ttl",
          targetClassPrefix: "scenario",
          targetClassName: "Content",
          constraints: [
            {
              path: { prefix: "scenario", value: "hasRoadType" },
              name: "road type",
              datatype: { prefix: "xsd", value: "string" },
              clazz: null,
              minCount: 1,
              maxCount: null,
              order: 1,
              description: { en: "Types of roads." },
              example: "motorway",
              in: [
                { prefix: null, value: "motorway" },
                { prefix: null, value: "rural" },
              ],
              or: null,
              validations: [],
              children: null,
            },
          ],
        },
      ],
    };

    const steps = service.toSteps(model);
    expect(steps.length).toBe(1);
    expect(steps[0].label).toBe("Content");
    expect(steps[0].fields.length).toBe(1);

    const field = steps[0].fields[0];
    expect(field.key).toBe("scenario:hasRoadType");
    expect(field.type).toBe("select");
    expect(field.props?.["multiple"]).toBe(true);
    expect((field.props?.["options"] as unknown[])?.length).toBe(2);
  });

  it("should map a required string field", () => {
    const prop: ShapeProperties = {
      path: { prefix: "ex", value: "name" },
      name: "Name",
      datatype: { prefix: "xsd", value: "string" },
      clazz: null,
      minCount: 1,
      maxCount: 1,
      order: 1,
      description: { en: "A name field" },
      example: "John",
      in: [],
      or: null,
      validations: [],
      children: null,
    };

    const config = service.toFieldConfig(prop);
    expect(config.key).toBe("ex:name");
    expect(config.type).toBe("input");
    expect(config.props?.required).toBe(true);
  });

  it("should map a boolean field to checkbox", () => {
    const prop: ShapeProperties = {
      path: { prefix: "ex", value: "active" },
      name: "Active",
      datatype: { prefix: "xsd", value: "boolean" },
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
    };

    const config = service.toFieldConfig(prop);
    expect(config.type).toBe("checkbox");
  });

  it("should map repeatable field to repeat type", () => {
    const prop: ShapeProperties = {
      path: { prefix: "ex", value: "tags" },
      name: "Tags",
      datatype: { prefix: "xsd", value: "string" },
      clazz: null,
      minCount: 0,
      maxCount: null,
      order: 3,
      description: null,
      example: null,
      in: [],
      or: null,
      validations: [],
      children: null,
    };

    const config = service.toFieldConfig(prop);
    expect(config.type).toBe("repeat");
  });

  it("should map sh:or to union-field type", () => {
    const prop: ShapeProperties = {
      path: { prefix: "ex", value: "value" },
      name: "Value",
      datatype: {},
      clazz: null,
      minCount: 1,
      maxCount: 1,
      order: 1,
      description: null,
      example: null,
      in: [],
      or: [
        {
          path: { prefix: "ex", value: "stringVal" },
          name: "String",
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
      validations: [],
      children: null,
    };

    const config = service.toFieldConfig(prop);
    expect(config.type).toBe("union-field");
    expect(config.props?.["branches"]?.length).toBe(1);
  });

  it("should resolve nested sh:node into recursive fieldGroup", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "https://example.org/" }],
      shapes: [
        {
          schema: "https://example.org/ParentShape",
          targetClassPrefix: "ex",
          targetClassName: "Parent",
          constraints: [
            {
              path: { prefix: "ex", value: "hasChild" },
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
              children: "Child",
            },
          ],
        },
        {
          schema: "https://example.org/ChildShape",
          targetClassPrefix: "ex",
          targetClassName: "Child",
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

    const steps = service.toSteps(model);
    const parentStep = steps.find((s) => s.label === "Parent")!;
    const childField = parentStep.fields[0];

    expect(childField.key).toBe("ex:hasChild");
    expect(childField.type).toBe("formly-group");
    expect(childField.fieldGroup?.length).toBe(2);
    expect(childField.fieldGroup?.[0].key).toBe("ex:name");
    expect(childField.fieldGroup?.[0].type).toBe("input");
    expect(childField.fieldGroup?.[1].key).toBe("ex:age");
    expect(childField.fieldGroup?.[1].type).toBe("number");
  });

  it("should handle repeatable nested shapes as fieldArray", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "https://example.org/" }],
      shapes: [
        {
          schema: "https://example.org/ParentShape",
          targetClassPrefix: "ex",
          targetClassName: "Parent",
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

    const steps = service.toSteps(model);
    const parentStep = steps.find((s) => s.label === "Parent")!;
    const field = parentStep.fields[0];

    expect(field.type).toBe("repeat");
    expect(field.fieldArray).toBeDefined();
    expect((field.fieldArray as { fieldGroup: unknown[] }).fieldGroup?.length).toBe(1);
  });

  it("should handle circular sh:node references gracefully", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "https://example.org/" }],
      shapes: [
        {
          schema: "https://example.org/NodeShape",
          targetClassPrefix: "ex",
          targetClassName: "Node",
          constraints: [
            {
              path: { prefix: "ex", value: "next" },
              name: "Next",
              datatype: {},
              clazz: null,
              minCount: 0,
              maxCount: 1,
              order: 1,
              description: null,
              example: null,
              in: [],
              or: null,
              validations: [],
              children: "Node",
            },
          ],
        },
      ],
    };

    const steps = service.toSteps(model);
    const nodeStep = steps[0];
    const field = nodeStep.fields[0];

    // First level resolves, but the recursive self-ref should be caught
    expect(field.type).toBe("formly-group");
    expect(field.fieldGroup?.length).toBe(1);
    const nestedField = field.fieldGroup![0];
    expect(nestedField.type).toBe("formly-group");
    expect(nestedField.fieldGroup?.length).toBe(0); // circular → empty
  });
});
