import { useState, useCallback, useEffect, createContext, useContext } from "react";
import type { ShaclModel, ProvenanceData } from "@/types";
import { shapeToSteps, type WizardStep } from "@/lib/shape-to-fields";
import { serializeToJsonLd } from "@/lib/jsonld-serializer";
import { buildPrefillValues } from "@/lib/jsonld-prefill";
import { useConvert } from "@/hooks/useConvert";
import { useConvertAndPrefill } from "@/hooks/useConvertAndPrefill";
import { useSession } from "@/hooks/useSession";
import { useExportSession } from "@/hooks/useExportSession";
import { FileUpload } from "./FileUpload";
import { WizardStepper } from "./WizardStepper";
import { ReviewStep } from "./ReviewStep";
import { StepForm } from "./StepForm";
import { Button } from "@/components/ui/Button";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";

export const ProvenanceContext = createContext<ProvenanceData | null>(null);
export const useProvenance = () => useContext(ProvenanceContext);

export function WizardPage() {
  const [model, setModel] = useState<ShaclModel | null>(null);
  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [defaultValues, setDefaultValues] = useState<Record<string, Record<string, unknown>>>({});
  const [shaclFile, setShaclFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceData | null>(null);
  const [assetName, setAssetName] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const convert = useConvert();
  const convertAndPrefill = useConvertAndPrefill();
  const session = useSession();
  const exportSession = useExportSession();

  // Auto-load from pipeline session if available
  useEffect(() => {
    if (sessionLoaded || !session.data?.active || model) return;

    const { shaclContent, jsonLdContent, provenanceContent, assetName: name } = session.data;
    if (!shaclContent) return;

    setSessionLoaded(true);
    if (name) setAssetName(name);

    if (provenanceContent) {
      try {
        setProvenance(JSON.parse(provenanceContent));
      } catch {
        // Ignore malformed provenance
      }
    }

    // Create virtual files for the convert/prefill API
    const shaclBlob = new File([shaclContent], "session.ttl", { type: "text/turtle" });

    if (jsonLdContent) {
      const jsonBlob = new File([jsonLdContent], "session.json", { type: "application/json" });
      convertAndPrefill.mutate(
        { shaclFile: shaclBlob, jsonLdFile: jsonBlob },
        {
          onSuccess: (result) => {
            setModel(result.shaclModel);
            const wizardSteps = shapeToSteps(result.shaclModel);
            setSteps(wizardSteps);
            setCurrentStep(0);
            const prefilled = buildPrefillValues(
              result.matchedSubjects,
              wizardSteps,
              result.shaclModel
            );
            setDefaultValues(prefilled);
          },
          onError: (err) => {
            setError(err.message || "Failed to load session");
          },
        }
      );
    } else {
      convert.mutate(shaclBlob, {
        onSuccess: (shaclModel) => {
          setModel(shaclModel);
          const wizardSteps = shapeToSteps(shaclModel);
          setSteps(wizardSteps);
          setCurrentStep(0);
          setDefaultValues({});
        },
        onError: (err) => {
          setError(err.message || "Failed to load session");
        },
      });
    }
  }, [session.data, sessionLoaded, model, convert, convertAndPrefill]);

  const handleShaclFile = useCallback(
    (file: File) => {
      setShaclFile(file);
      setError(null);
      convert.mutate(file, {
        onSuccess: (shaclModel) => {
          setModel(shaclModel);
          const wizardSteps = shapeToSteps(shaclModel);
          setSteps(wizardSteps);
          setCurrentStep(0);
          setDefaultValues({});
        },
        onError: (err) => {
          setError(err.message || "Failed to parse SHACL file");
        },
      });
    },
    [convert]
  );

  const handlePrefillFile = useCallback(
    (jsonLdFile: File) => {
      if (!shaclFile) return;
      setError(null);
      convertAndPrefill.mutate(
        { shaclFile, jsonLdFile },
        {
          onSuccess: (result) => {
            setModel(result.shaclModel);
            const wizardSteps = shapeToSteps(result.shaclModel);
            setSteps(wizardSteps);
            setCurrentStep(0);
            const prefilled = buildPrefillValues(
              result.matchedSubjects,
              wizardSteps,
              result.shaclModel
            );
            setDefaultValues(prefilled);
          },
          onError: (err) => {
            setError(err.message || "Failed to process prefill");
          },
        }
      );
    },
    [shaclFile, convertAndPrefill]
  );

  const handleExport = useCallback(
    (formValues: Record<string, Record<string, unknown>>) => {
      if (!model) return;
      const jsonLd = serializeToJsonLd(formValues, model);

      // If loaded from a pipeline session, export back to the session API
      if (sessionLoaded) {
        exportSession.mutate(jsonLd, {
          onError: (err) => {
            setError(err.message || "Failed to export to session");
          },
        });
        return;
      }

      const blob = new Blob([jsonLd], { type: "application/ld+json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = assetName ? `${assetName}.json` : "metadata.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    [model, sessionLoaded, assetName, exportSession]
  );

  const isLoading = convert.isPending || convertAndPrefill.isPending;

  if (!model) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold" data-testid="wizard-heading">
            SD Creation Wizard
          </h2>
          <p className="text-muted-foreground">
            Upload a SHACL shapes file to generate a metadata form
          </p>
        </div>

        <FileUpload
          label="Upload SHACL file (.ttl)"
          accept=".ttl,text/turtle"
          onFile={handleShaclFile}
          disabled={isLoading}
        />

        {shaclFile && (
          <FileUpload
            label="Optional: Upload JSON-LD for prefill"
            accept=".json,.jsonld,application/ld+json,application/json"
            onFile={handlePrefillFile}
            disabled={isLoading}
          />
        )}

        {isLoading && (
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-2">Processing...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive" data-testid="error-message">
              {error}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <ProvenanceContext.Provider value={provenance}>
      <div className="max-w-3xl mx-auto">
        {assetName && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-muted px-4 py-2 border border-border">
            <span className="text-sm font-medium text-muted-foreground">Asset:</span>
            <span className="text-sm font-semibold" data-testid="asset-name">
              {assetName}
            </span>
            {provenance?.assetType && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {provenance.assetType}
              </span>
            )}
            {provenance?.tool && (
              <span className="ml-auto text-xs text-muted-foreground">
                enriched by {provenance.tool.name} v{provenance.tool.version}
              </span>
            )}
          </div>
        )}
        <WizardStepper
          steps={[...steps, { label: "Review & Export" }]}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
        <WizardContent
          steps={steps}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          defaultValues={defaultValues}
          model={model}
          onExport={handleExport}
          provenance={provenance}
        />
      </div>
    </ProvenanceContext.Provider>
  );
}

interface WizardContentProps {
  steps: WizardStep[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
  defaultValues: Record<string, Record<string, unknown>>;
  model: ShaclModel;
  onExport: (values: Record<string, Record<string, unknown>>) => void;
  provenance: ProvenanceData | null;
}

function WizardContent({
  steps,
  currentStep,
  setCurrentStep,
  defaultValues,
  model,
  onExport,
  provenance,
}: WizardContentProps) {
  const [formValues, setFormValues] = useState<Record<string, Record<string, unknown>>>({});

  const isReview = currentStep >= steps.length;
  const totalSteps = steps.length + 1;

  const handleStepSubmit = (stepLabel: string, values: Record<string, unknown>) => {
    setFormValues((prev) => ({ ...prev, [stepLabel]: values }));
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const jsonLd = model ? serializeToJsonLd({ ...formValues }, model) : "";

  if (isReview) {
    return (
      <div className="space-y-6">
        <ReviewStep jsonLd={jsonLd} provenance={provenance} />
        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => setCurrentStep(currentStep - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={() => onExport(formValues)}>
            <Download className="w-4 h-4 mr-1" /> Export JSON-LD
          </Button>
        </div>
      </div>
    );
  }

  const step = steps[currentStep]!;

  return (
    <div className="space-y-6">
      <StepForm
        key={step.id}
        step={step}
        defaultValues={defaultValues[step.label] ?? {}}
        onSubmit={(values) => handleStepSubmit(step.label, values)}
      />
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="submit" form={`step-form-${step.id}`}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
