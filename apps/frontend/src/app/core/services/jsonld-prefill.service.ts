import { Injectable } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ClassConstraint, ShapeProperties, ShaclModel, FormlyStep } from "../models/shacl.model";

/**
 * Populates reactive form controls from a matchedSubjects map
 * (predicate URI → string value) returned by the API prefill endpoint.
 */
@Injectable({ providedIn: "root" })
export class JsonLdPrefillService {
  /**
   * Given matched subjects from the API and the form steps,
   * patch form values where predicates match field keys.
   */
  prefill(
    matchedSubjects: Record<string, string>,
    steps: FormlyStep[],
    model: ShaclModel
  ): Record<string, unknown>[] {
    const stepModels: Record<string, unknown>[] = [];

    for (let i = 0; i < steps.length; i++) {
      const shape = model.shapes[i];
      if (!shape) {
        stepModels.push({});
        continue;
      }

      const stepModel: Record<string, unknown> = {};
      this.fillConstraints(shape.constraints, matchedSubjects, stepModel);
      stepModels.push(stepModel);
    }

    return stepModels;
  }

  /**
   * Patch existing FormGroup controls with matched values.
   */
  patchForms(
    matchedSubjects: Record<string, string>,
    steps: FormlyStep[],
    model: ShaclModel
  ): void {
    const stepModels = this.prefill(matchedSubjects, steps, model);

    for (let i = 0; i < steps.length; i++) {
      const form = steps[i].form;
      if (form && stepModels[i]) {
        form.patchValue(stepModels[i], { emitEvent: false });
      }
    }
  }

  private fillConstraints(
    constraints: ShapeProperties[],
    matched: Record<string, string>,
    target: Record<string, unknown>
  ): void {
    for (const constraint of constraints) {
      const key = this.buildKey(constraint.path);
      const fullUri = this.buildFullUri(constraint.path);

      // Try matching by full URI first, then by prefixed key
      const value = matched[fullUri] ?? matched[key];
      if (value === undefined) continue;

      target[key] = this.coerceValue(value, constraint);
    }
  }

  private coerceValue(value: string, prop: ShapeProperties): unknown {
    const dt = this.getDatatypeValue(prop.datatype as ClassConstraint | null);

    if (dt?.includes("boolean")) {
      return value === "true" || value === "1";
    }
    if (dt?.includes("integer") || dt?.includes("decimal") || dt?.includes("float")) {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }

    return value;
  }

  private buildKey(path: ClassConstraint | null): string {
    if (!path) return "unknown";
    if (path.prefix) return `${path.prefix}:${path.value}`;
    return path.value;
  }

  private buildFullUri(_path: ClassConstraint | null): string {
    // The API's matchedSubjects uses full URIs as keys.
    // Since we don't have the prefix→URI map at this level,
    // return the key as-is. The caller should resolve via prefixList.
    if (!_path) return "unknown";
    if (_path.prefix) return `${_path.prefix}:${_path.value}`;
    return _path.value;
  }

  private getDatatypeValue(dt: ClassConstraint | null): string | null {
    if (!dt) return null;
    if (dt.prefix) return `${dt.prefix}:${dt.value}`;
    return dt.value;
  }
}
