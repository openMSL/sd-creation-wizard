import { useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { DynamicField } from "./DynamicField";
import type { FieldDescriptor } from "@/lib/shape-to-fields";
import { FieldWrapper } from "./FieldWrapper";

interface Props<T extends FieldValues> {
  field: FieldDescriptor;
  control: Control<T>;
  name: Path<T>;
}

export function UnionField<T extends FieldValues>({ field, control, name }: Props<T>) {
  const [selectedBranch, setSelectedBranch] = useState(0);
  const branches = field.branches ?? [];

  if (branches.length === 0) return null;

  return (
    <FieldWrapper label={field.label} required={field.required} description={field.description}>
      <div className="space-y-3">
        {branches.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {branches.map((branch, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedBranch(idx)}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                  idx === selectedBranch
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:bg-muted"
                }`}
              >
                {branch[0]?.label ?? `Option ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {branches[selectedBranch]?.map((child) => (
            <DynamicField key={child.key} field={child} control={control} prefix={name} />
          ))}
        </div>
      </div>
    </FieldWrapper>
  );
}
