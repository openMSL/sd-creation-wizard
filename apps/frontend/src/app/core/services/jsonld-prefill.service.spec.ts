import { TestBed } from "@angular/core/testing";
import { FormGroup } from "@angular/forms";
import { JsonLdPrefillService } from "./jsonld-prefill.service";
import { FormlyStep, ShaclModel } from "../models/shacl.model";

describe("JsonLdPrefillService", () => {
  let service: JsonLdPrefillService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JsonLdPrefillService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should produce step models from matchedSubjects", () => {
    const model: ShaclModel = {
      prefixList: [{ alias: "ex", url: "http://example.org/" }],
      shapes: [
        {
          schema: "PersonShape",
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

    const steps: FormlyStep[] = [{ label: "Person", fields: [], form: new FormGroup({}) }];

    const matched = {
      "ex:name": "Alice",
      "ex:age": "30",
    };

    const result = service.prefill(matched, steps, model);
    expect(result.length).toBe(1);
    expect(result[0]["ex:name"]).toBe("Alice");
    expect(result[0]["ex:age"]).toBe(30); // coerced to number
  });

  it("should coerce boolean values", () => {
    const model: ShaclModel = {
      prefixList: [],
      shapes: [
        {
          schema: "TestShape",
          targetClassPrefix: "ex",
          targetClassName: "Test",
          constraints: [
            {
              path: { prefix: "ex", value: "active" },
              name: "Active",
              datatype: { prefix: "xsd", value: "boolean" },
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

    const steps: FormlyStep[] = [{ label: "Test", fields: [], form: new FormGroup({}) }];

    const result = service.prefill({ "ex:active": "true" }, steps, model);
    expect(result[0]["ex:active"]).toBe(true);
  });

  it("should skip unmatched fields", () => {
    const model: ShaclModel = {
      prefixList: [],
      shapes: [
        {
          schema: "TestShape",
          targetClassPrefix: "ex",
          targetClassName: "Test",
          constraints: [
            {
              path: { prefix: "ex", value: "missing" },
              name: "Missing",
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

    const steps: FormlyStep[] = [{ label: "Test", fields: [], form: new FormGroup({}) }];

    const result = service.prefill({}, steps, model);
    expect(Object.keys(result[0]).length).toBe(0);
  });
});
