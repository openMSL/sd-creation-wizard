import { useFieldArray, type Control, type FieldValues, type Path } from "react-hook-form";
import { DynamicField } from "./DynamicField";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";

interface Props<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  name: Path<T>;
}

/**
 * Build a seeded default structure for a new repeat item.
 * Instead of appending empty `{}`, we create an object with keys
 * matching each child field's key set to appropriate defaults.
 */
function buildItemSeed(children: FieldDescriptor[]): Record<string, unknown> {
  const seed: Record<string, unknown> = {};
  for (const child of children) {
    switch (child.type) {
      case "boolean":
        seed[child.key] = false;
        break;
      case "number":
        seed[child.key] = undefined;
        break;
      case "repeat":
        seed[child.key] = [];
        break;
      case "group":
        seed[child.key] = child.children ? buildItemSeed(child.children) : {};
        break;
      default:
        seed[child.key] = "";
        break;
    }
  }
  return seed;
}

export function RepeatField<T extends FieldValues>({ field, control, name }: Props<T>) {
  const { fields, append, remove } = useFieldArray({
    control,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: name as any,
  });

  const canAdd = field.maxItems == null || fields.length < field.maxItems;
  const canRemove = fields.length > (field.minItems ?? 0);
  const children = field.children ?? [];

  return (
    <div className="space-y-3" data-testid={`field-${field.key}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append(buildItemSeed(children) as never)}
          disabled={!canAdd}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      {fields.map((item, index) => (
        <div key={item.id} className="relative border border-border rounded-md p-4 space-y-3">
          {canRemove && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {children.map((child) => (
            <DynamicField
              key={child.key}
              field={child}
              control={control}
              prefix={`${name}.${index}`}
            />
          ))}
        </div>
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No items yet. Click &quot;Add&quot; to start.
        </p>
      )}
    </div>
  );
}
