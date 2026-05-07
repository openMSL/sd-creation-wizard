import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import { FieldWrapper } from "./FieldWrapper";

interface Props<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  name: Path<T>;
}

export function IriField<T extends FieldValues>({ field, control, name }: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: field.required ? "Required" : false,
        pattern: { value: /^https?:\/\//, message: "Must be a valid URL" },
      }}
      render={({ field: f, fieldState }) => (
        <FieldWrapper label={field.label} required={field.required} error={fieldState.error?.message} description={field.description}>
          <Input
            {...f}
            type="url"
            value={(f.value as string) ?? ""}
            placeholder={field.placeholder ?? "https://..."}
            data-testid={`field-${field.key}`}
          />
        </FieldWrapper>
      )}
    />
  );
}
