interface ReviewStepProps {
  jsonLd: string;
}

export function ReviewStep({ jsonLd }: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review & Export</h3>
      <p className="text-sm text-muted-foreground">
        Review the generated JSON-LD below. Click "Export" to download.
      </p>
      <pre className="bg-muted border border-border rounded-md p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
        {jsonLd || "No data yet — fill in the form fields above."}
      </pre>
    </div>
  );
}
