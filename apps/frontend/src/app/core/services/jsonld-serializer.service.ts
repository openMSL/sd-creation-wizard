import { Injectable } from "@angular/core";
import { ClassConstraint, ShaclModel, ShapeProperties, VicShape } from "../models/shacl.model";

@Injectable({ providedIn: "root" })
export class JsonLdSerializerService {
  /**
   * Serialize form values into JSON-LD using the ShaclModel metadata.
   */
  serialize(formValues: Record<string, Record<string, unknown>>, model: ShaclModel): object {
    const context = this.buildContext(model.prefixList);
    const graphs: object[] = [];

    for (const shape of model.shapes) {
      const stepKey = shape.targetClassName;
      const values = formValues[stepKey] ?? {};
      const node = this.serializeShape(values, shape);
      if (node) graphs.push(node);
    }

    if (graphs.length === 1) {
      return { "@context": context, ...graphs[0] };
    }

    return { "@context": context, "@graph": graphs };
  }

  private serializeShape(
    values: Record<string, unknown>,
    shape: VicShape
  ): Record<string, unknown> | null {
    const type = shape.targetClassPrefix
      ? `${shape.targetClassPrefix}:${shape.targetClassName}`
      : shape.targetClassName;

    const node: Record<string, unknown> = { "@type": type };

    for (const constraint of shape.constraints) {
      const key = this.buildKey(constraint.path);
      const raw = values[key];
      if (raw === undefined || raw === null || raw === "") continue;
      node[key] = this.serializeValue(raw, constraint);
    }

    return Object.keys(node).length > 1 ? node : null;
  }

  private serializeValue(value: unknown, prop: ShapeProperties): unknown {
    // Array values
    if (Array.isArray(value)) {
      return value.map((v) => this.serializeSingle(v, prop));
    }
    return this.serializeSingle(value, prop);
  }

  private serializeSingle(value: unknown, prop: ShapeProperties): unknown {
    const dt = this.getDatatype(prop.datatype as ClassConstraint | null);

    // IRI reference
    if (prop.clazz || dt === "@id") {
      return { "@id": String(value) };
    }

    // Boolean
    if (dt?.includes("boolean")) {
      return { "@value": Boolean(value), "@type": "xsd:boolean" };
    }

    // Numeric
    if (dt?.includes("integer") || dt?.includes("decimal") || dt?.includes("float")) {
      return { "@value": Number(value), "@type": dt };
    }

    // Date
    if (dt?.includes("date")) {
      return { "@value": String(value), "@type": dt };
    }

    // Default string
    if (dt && dt !== "xsd:string") {
      return { "@value": String(value), "@type": dt };
    }

    return { "@value": String(value) };
  }

  private buildContext(prefixList: Array<{ alias: string; url: string }>): Record<string, string> {
    const ctx: Record<string, string> = {};
    for (const p of prefixList) {
      ctx[p.alias] = p.url;
    }
    return ctx;
  }

  private buildKey(path: ClassConstraint | null): string {
    if (!path) return "unknown";
    if (path.prefix) return `${path.prefix}:${path.value}`;
    return path.value;
  }

  private getDatatype(dt: ClassConstraint | null): string | null {
    if (!dt) return null;
    if (dt.prefix) return `${dt.prefix}:${dt.value}`;
    return dt.value;
  }
}
