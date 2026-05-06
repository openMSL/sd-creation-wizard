import { Injectable } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { FormlyFieldConfig } from "@ngx-formly/core";
import {
  ClassConstraint,
  FormlyStep,
  ShaclModel,
  ShapeProperties,
  VicShape,
} from "../models/shacl.model";

@Injectable({ providedIn: "root" })
export class ShapeToFormlyService {
  private model: ShaclModel | null = null;
  private resolving = new Set<string>();

  /**
   * Convert a full ShaclModel into wizard steps.
   * Each VicShape becomes a step; constraints become formly fields.
   */
  toSteps(model: ShaclModel): FormlyStep[] {
    this.model = model;
    this.resolving.clear();
    return model.shapes
      .filter((shape) => this.hasEditableFields(shape))
      .map((shape) => this.shapeToStep(shape));
  }

  /**
   * A shape is "editable" if it has at least one constraint that produces
   * a user-visible form field (not just structural references).
   */
  private hasEditableFields(shape: VicShape): boolean {
    return shape.constraints.some(
      (c) => !c.children && !c.or?.every((branch) => !!branch.children)
    );
  }

  private shapeToStep(shape: VicShape): FormlyStep {
    const sorted = [...shape.constraints].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    // Group by 'group' validation if present, otherwise single group
    const grouped = this.groupByValidation(sorted);

    if (grouped.size <= 1) {
      return {
        label: shape.targetClassName,
        fields: sorted.map((c) => this.toFieldConfig(c)),
        form: new FormGroup({}),
      };
    }

    // Multiple groups → flatten into one step with fieldGroups
    const fields: FormlyFieldConfig[] = [];
    for (const [groupName, constraints] of grouped) {
      fields.push({
        props: { label: groupName },
        fieldGroup: constraints.map((c) => this.toFieldConfig(c)),
        fieldGroupClassName: "shape-field-group",
      });
    }

    return {
      label: shape.targetClassName,
      fields,
      form: new FormGroup({}),
    };
  }

  private groupByValidation(constraints: ShapeProperties[]): Map<string, ShapeProperties[]> {
    const map = new Map<string, ShapeProperties[]>();
    for (const c of constraints) {
      const group = c.validations.find((v) => v.key === "group")?.value?.toString() ?? "General";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(c);
    }
    return map;
  }

  toFieldConfig(prop: ShapeProperties): FormlyFieldConfig {
    const key = this.buildKey(prop.path);
    const label = prop.name ?? key;
    const description = prop.description ? Object.values(prop.description)[0] : undefined;

    const base: FormlyFieldConfig = {
      key,
      props: {
        label,
        description,
        required: (prop.minCount ?? 0) > 0,
        placeholder: prop.example ?? "",
      },
    };

    // sh:in → select field
    if (prop.in?.length) {
      return this.buildSelect(base, prop);
    }

    // sh:or → union field (type selector)
    if (prop.or?.length) {
      return this.buildUnion(base, prop);
    }

    // Nested shape (children reference)
    if (prop.children) {
      return this.buildNodeShape(base, prop);
    }

    // Repeatable field (maxCount > 1 or null)
    if (prop.maxCount === null || (prop.maxCount !== null && prop.maxCount > 1)) {
      return this.buildRepeat(base, prop);
    }

    // Simple primitive field
    return this.buildPrimitive(base, prop);
  }

  private buildSelect(base: FormlyFieldConfig, prop: ShapeProperties): FormlyFieldConfig {
    const multiple = prop.maxCount === null || (prop.maxCount !== null && prop.maxCount > 1);
    return {
      ...base,
      type: "select",
      props: {
        ...base.props,
        multiple,
        options: prop.in.map((item) => ({
          value: this.constraintValue(item),
          label: item.value,
        })),
      },
    };
  }

  private buildUnion(base: FormlyFieldConfig, prop: ShapeProperties): FormlyFieldConfig {
    return {
      ...base,
      type: "union-field",
      props: {
        ...base.props,
        branches: prop.or!.map((branch, i) => ({
          label: branch.name ?? `Option ${i + 1}`,
          fields: [this.toFieldConfig(branch)],
        })),
      },
    };
  }

  private buildNodeShape(base: FormlyFieldConfig, prop: ShapeProperties): FormlyFieldConfig {
    const childName = prop.children!;

    // Guard against circular references
    if (this.resolving.has(childName)) {
      return {
        ...base,
        type: "formly-group",
        fieldGroup: [],
        props: { ...base.props, description: `(circular reference to ${childName})` },
      };
    }

    // Look up the referenced shape in the model
    const childShape = this.model?.shapes.find((s) => s.targetClassName === childName);
    if (!childShape) {
      return {
        ...base,
        type: "formly-group",
        fieldGroup: [],
        props: { ...base.props },
      };
    }

    // Recursively build child constraints
    this.resolving.add(childName);
    const childFields = [...childShape.constraints]
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map((c) => this.toFieldConfig(c));
    this.resolving.delete(childName);

    // If the field is repeatable, wrap in fieldArray
    if (prop.maxCount === null || (prop.maxCount !== null && prop.maxCount > 1)) {
      return {
        ...base,
        type: "repeat",
        props: {
          ...base.props,
          maxItems: prop.maxCount,
          minItems: prop.minCount ?? 0,
        },
        fieldArray: {
          fieldGroup: childFields,
        },
      };
    }

    return {
      ...base,
      type: "formly-group",
      fieldGroup: childFields,
      props: { ...base.props },
    };
  }

  private buildRepeat(base: FormlyFieldConfig, prop: ShapeProperties): FormlyFieldConfig {
    return {
      ...base,
      type: "repeat",
      props: {
        ...base.props,
        maxItems: prop.maxCount,
        minItems: prop.minCount ?? 0,
      },
      fieldArray: {
        type: this.resolveInputType(prop),
        props: { ...base.props },
      },
    };
  }

  private buildPrimitive(base: FormlyFieldConfig, prop: ShapeProperties): FormlyFieldConfig {
    const type = this.resolveInputType(prop);
    const config: FormlyFieldConfig = { ...base, type };

    // Add numeric validators
    const minInclusive = prop.validations.find((v) => v.key === "minInclusive");
    const maxInclusive = prop.validations.find((v) => v.key === "maxInclusive");
    if (minInclusive) config.props = { ...config.props, min: Number(minInclusive.value) };
    if (maxInclusive) config.props = { ...config.props, max: Number(maxInclusive.value) };

    return config;
  }

  private resolveInputType(prop: ShapeProperties): string {
    const dt = this.constraintValue(prop.datatype as ClassConstraint | null)?.toLowerCase();
    if (!dt) return "input";
    if (dt.includes("boolean")) return "checkbox";
    if (
      dt.includes("integer") ||
      dt.includes("decimal") ||
      dt.includes("float") ||
      dt.includes("double")
    ) {
      return "number";
    }
    if (dt.includes("date") || dt.includes("datetime")) return "datepicker";
    if (dt.includes("anyuri") || dt.includes("iri")) return "iri";
    return "input";
  }

  private buildKey(path: ClassConstraint | null): string {
    if (!path) return "unknown";
    if (path.prefix) return `${path.prefix}:${path.value}`;
    return path.value;
  }

  private constraintValue(c: ClassConstraint | null): string | null {
    if (!c) return null;
    return c.value;
  }
}
