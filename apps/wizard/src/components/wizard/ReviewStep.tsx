import type { ProvenanceData } from "@/types";

interface ReviewStepProps {
  jsonLd: string;
  provenance: ProvenanceData | null;
}

const METHOD_COLORS: Record<string, string> = {
  extraction: "text-green-700 bg-green-50",
  calculation: "text-blue-700 bg-blue-50",
  "rule-based-inference": "text-amber-700 bg-amber-50",
  "llm-inference": "text-purple-700 bg-purple-50",
  manual: "text-gray-700 bg-gray-50",
};

export function ReviewStep({ jsonLd, provenance }: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review & Export</h3>

      {provenance && Object.keys(provenance.fields).length > 0 && (
        <div className="rounded-md border border-border bg-muted/50 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Provenance Summary</h4>
          <p className="text-xs text-muted-foreground">
            The following fields were automatically enriched by{" "}
            <span className="font-medium">{provenance.tool.name}</span> v{provenance.tool.version}.
            Review the values above before exporting.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="provenance-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">Field</th>
                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">
                    Method
                  </th>
                  <th className="text-left py-1.5 font-medium text-muted-foreground">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(provenance.fields).map(([field, info]) => (
                  <tr key={field} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-mono">{field}</td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 ${METHOD_COLORS[info.method] ?? ""}`}
                      >
                        {info.method}
                      </span>
                    </td>
                    <td className="py-1.5">{info.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Review the generated JSON-LD below. Click "Export" to download.
      </p>
      <pre className="bg-muted border border-border rounded-md p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
        {jsonLd || "No data yet — fill in the form fields above."}
      </pre>
    </div>
  );
}
