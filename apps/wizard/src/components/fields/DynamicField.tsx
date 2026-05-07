import type { FieldValues, Path, Control } from "react-hook-form";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import { TextField } from "./TextField";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";
import { DateField } from "./DateField";
import { IriField } from "./IriField";
import { BooleanField } from "./BooleanField";
import { RepeatField } from "./RepeatField";
import { FieldGroup } from "./FieldGroup";
import { UnionField } from "./UnionField";

interface DynamicFieldProps<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  prefix?: string;
}

export function DynamicField<T extends FieldValues>({
  field,
  control,
  prefix = "",
}: DynamicFieldProps<T>) {
  const name = (prefix ? `${prefix}.${field.key}` : field.key) as Path<T>;

  switch (field.type) {
    case "text":
      return <TextField field={field} control={control} name={name} />;
    case "number":
      return <NumberField field={field} control={control} name={name} />;
    case "select":
      return <SelectField field={field} control={control} name={name} />;
    case "date":
      return <DateField field={field} control={control} name={name} />;
    case "iri":
      return <IriField field={field} control={control} name={name} />;
    case "boolean":
      return <BooleanField field={field} control={control} name={name} />;
    case "repeat":
      return <RepeatField field={field} control={control} name={name} />;
    case "group":
      return <FieldGroup field={field} control={control} prefix={name} />;
    case "union":
      return <UnionField field={field} control={control} name={name} />;
    default:
      return <TextField field={field} control={control} name={name} />;
  }
}
