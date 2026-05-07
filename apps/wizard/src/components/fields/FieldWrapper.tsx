import type { ReactNode } from "react";

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, required, error, description, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
