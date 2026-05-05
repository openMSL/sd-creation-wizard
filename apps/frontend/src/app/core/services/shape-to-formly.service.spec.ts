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
});
