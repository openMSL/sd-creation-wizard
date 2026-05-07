import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import { FieldWrapper } from "./FieldWrapper";

interface Props<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  name: Path<T>;
}

export function NumberField<T extends FieldValues>({ field, control, name }: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: field.required ? "Required" : false,
        min: field.min != null ? { value: field.min, message: `Minimum: ${field.min}` } : undefined,
        max: field.max != null ? { value: field.max, message: `Maximum: ${field.max}` } : undefined,
      }}
      render={({ field: f, fieldState }) => (
        <FieldWrapper label={field.label} required={field.required} error={fieldState.error?.message} description={field.description}>
          <Input
            {...f}
            type="number"
            value={f.value ?? ""}
            onChange={(e) => f.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder={field.placeholder}
            data-testid={`field-${field.key}`}
          />
        </FieldWrapper>
      )}
    />
  );
}
