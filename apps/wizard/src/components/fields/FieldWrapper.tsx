import type { ReactNode } from "react";
import type { FieldProvenance } from "@/types";

const METHOD_LABELS: Record<string, { label: string; color: string }> = {
  extraction: { label: "extracted", color: "bg-green-100 text-green-800" },
  calculation: { label: "calculated", color: "bg-blue-100 text-blue-800" },
  "rule-based-inference": { label: "inferred", color: "bg-amber-100 text-amber-800" },
  "llm-inference": { label: "LLM", color: "bg-purple-100 text-purple-800" },
  manual: { label: "manual", color: "bg-gray-100 text-gray-800" },
};

const CONFIDENCE_INDICATORS: Record<string, string> = {
  high: "●●●",
  medium: "●●○",
  low: "●○○",
};

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  provenance?: FieldProvenance;
  children: ReactNode;
}

export function FieldWrapper({
  label,
  required,
  error,
  description,
  provenance,
  children,
}: FieldWrapperProps) {
  const methodInfo = provenance ? METHOD_LABELS[provenance.method] : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        {methodInfo && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${methodInfo.color}`}
            title={`Derived via ${provenance!.method} (confidence: ${provenance!.confidence})`}
            data-testid={`provenance-${label}`}
          >
            {methodInfo.label}
            {provenance?.confidence && (
              <span className="ml-0.5 text-[10px] opacity-75">
                {CONFIDENCE_INDICATORS[provenance.confidence] ?? ""}
              </span>
            )}
          </span>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
