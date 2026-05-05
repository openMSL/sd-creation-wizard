import { TestBed } from "@angular/core/testing";
import { JsonLdSerializerService } from "./jsonld-serializer.service";
import { ShaclModel } from "../models/shacl.model";

describe("JsonLdSerializerService", () => {
  let service: JsonLdSerializerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JsonLdSerializerService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should serialize form values to JSON-LD", () => {
    const model: ShaclModel = {
      prefixList: [
        { alias: "scenario", url: "https://example.org/scenario/" },
        { alias: "xsd", url: "http://www.w3.org/2001/XMLSchema#" },
      ],
      shapes: [
        {
          schema: "test",
          targetClassPrefix: "scenario",
          targetClassName: "Content",
          constraints: [
            {
              path: { prefix: "scenario", value: "hasRoadType" },
              name: "road type",
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
              path: { prefix: "scenario", value: "hasSpeed" },
              name: "speed",
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

    const formValues = {
      Content: {
        "scenario:hasRoadType": "motorway",
        "scenario:hasSpeed": 120,
      },
    };

    const result = service.serialize(formValues, model) as Record<string, unknown>;
    expect(result["@context"]).toEqual({
      scenario: "https://example.org/scenario/",
      xsd: "http://www.w3.org/2001/XMLSchema#",
    });
    expect(result["@type"]).toBe("scenario:Content");
    expect(result["scenario:hasRoadType"]).toEqual({ "@value": "motorway" });
    expect(result["scenario:hasSpeed"]).toEqual({
      "@value": 120,
      "@type": "xsd:integer",
    });
  });

  it("should handle empty values gracefully", () => {
    const model: ShaclModel = {
      prefixList: [],
      shapes: [
        {
          schema: "test",
          targetClassPrefix: "ex",
          targetClassName: "Thing",
          constraints: [
            {
              path: { prefix: "ex", value: "name" },
              name: "name",
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

    const result = service.serialize({ Thing: {} }, model) as Record<string, unknown>;
    // Empty form = only @context returned (no node since no values)
    expect(result["@context"]).toEqual({});
  });
});
