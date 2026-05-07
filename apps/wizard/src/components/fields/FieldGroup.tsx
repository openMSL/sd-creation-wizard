import type { Control, FieldValues } from "react-hook-form";
import { DynamicField } from "./DynamicField";
import type { FieldDescriptor } from "@/lib/shape-to-fields";

interface Props<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  prefix: string;
}

export function FieldGroup<T extends FieldValues>({ field, control, prefix }: Props<T>) {
  if (!field.children || field.children.length === 0) {
    return null;
  }

  return (
    <fieldset className="border border-border rounded-md p-4 space-y-3" data-testid={`field-${field.key}`}>
      <legend className="px-2 text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </legend>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {field.children.map((child) => (
        <DynamicField key={child.key} field={child} control={control} prefix={prefix} />
      ))}
    </fieldset>
  );
}
