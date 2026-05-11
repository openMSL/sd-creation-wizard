import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import type { FieldProvenance } from "@/types";
import { FieldWrapper } from "./FieldWrapper";

interface BooleanFieldProps<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  name: Path<T>;
  provenance?: FieldProvenance;
}

export function BooleanField<T extends FieldValues>({
  field,
  control,
  name,
  provenance,
}: BooleanFieldProps<T>) {
  const { field: formField } = useController({
    name,
    control,
    defaultValue: false as never,
  });

  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      provenance={provenance}
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!formField.value}
          onChange={(e) => formField.onChange(e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm text-foreground">{formField.value ? "Yes" : "No"}</span>
      </label>
    </FieldWrapper>
  );
}
