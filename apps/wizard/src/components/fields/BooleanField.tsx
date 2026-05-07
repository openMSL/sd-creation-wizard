import { useController, type Control } from "react-hook-form";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import { FieldWrapper } from "./FieldWrapper";

interface BooleanFieldProps {
  field: FieldDescriptor;
  control: Control;
}

export function BooleanField({ field, control }: BooleanFieldProps) {
  const { field: formField } = useController({
    name: field.key,
    control,
    defaultValue: false,
  });

  return (
    <FieldWrapper label={field.label} required={field.required} description={field.description}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!formField.value}
          onChange={(e) => formField.onChange(e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm text-foreground">{field.label}</span>
      </label>
    </FieldWrapper>
  );
}
