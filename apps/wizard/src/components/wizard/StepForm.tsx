import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { DynamicField } from "@/components/fields/DynamicField";
import type { WizardStep } from "@/lib/shape-to-fields";

interface StepFormProps {
  step: WizardStep;
  defaultValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function StepForm({ step, defaultValues, onSubmit }: StepFormProps) {
  const { control, handleSubmit, reset } = useForm({
    defaultValues,
  });

  // Reset form when step changes or when prefilled values arrive
  useEffect(() => {
    reset(defaultValues);
  }, [step.id, defaultValues, reset]);

  return (
    <form
      id={`step-form-${step.id}`}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid={`step-form-${step.label}`}
    >
      <h3 className="text-lg font-semibold">{step.label}</h3>
      {step.fields.map((field) => (
        <DynamicField key={field.key} field={field} control={control} />
      ))}
    </form>
  );
}
