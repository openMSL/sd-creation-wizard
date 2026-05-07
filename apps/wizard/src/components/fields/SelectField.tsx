import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Select } from "@/components/ui/Select";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import { FieldWrapper } from "./FieldWrapper";

interface Props<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  name: Path<T>;
}

export function SelectField<T extends FieldValues>({ field, control, name }: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: field.required ? "Required" : false }}
      render={({ field: f, fieldState }) => (
        <FieldWrapper label={field.label} required={field.required} error={fieldState.error?.message} description={field.description}>
          <Select
            {...f}
            value={(f.value as string) ?? ""}
            data-testid={`field-${field.key}`}
          >
            <option value="">— Select —</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FieldWrapper>
      )}
    />
  );
}
