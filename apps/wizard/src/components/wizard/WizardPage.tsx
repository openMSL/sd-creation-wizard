import { useState, useCallback } from "react";
import type { ShaclModel } from "@/types";
import { shapeToSteps, type WizardStep } from "@/lib/shape-to-fields";
import { serializeToJsonLd } from "@/lib/jsonld-serializer";
import { buildPrefillValues } from "@/lib/jsonld-prefill";
import { useConvert } from "@/hooks/useConvert";
import { useConvertAndPrefill } from "@/hooks/useConvertAndPrefill";
import { FileUpload } from "./FileUpload";
import { WizardStepper } from "./WizardStepper";
import { ReviewStep } from "./ReviewStep";
import { StepForm } from "./StepForm";
import { Button } from "@/components/ui/Button";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";

export function WizardPage() {
  const [model, setModel] = useState<ShaclModel | null>(null);
  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [defaultValues, setDefaultValues] = useState<Record<string, Record<string, unknown>>>({});
  const [shaclFile, setShaclFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convert = useConvert();
  const convertAndPrefill = useConvertAndPrefill();

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
    [convert],
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
            const prefilled = buildPrefillValues(result.matchedSubjects, wizardSteps, result.shaclModel);
            setDefaultValues(prefilled);
          },
          onError: (err) => {
            setError(err.message || "Failed to process prefill");
          },
        },
      );
    },
    [shaclFile, convertAndPrefill],
  );

  const handleExport = useCallback(
    (formValues: Record<string, Record<string, unknown>>) => {
      if (!model) return;
      const jsonLd = serializeToJsonLd(formValues, model);
      const blob = new Blob([jsonLd], { type: "application/ld+json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "metadata.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    [model],
  );

  const isLoading = convert.isPending || convertAndPrefill.isPending;

  if (!model) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold" data-testid="wizard-heading">SD Creation Wizard</h2>
          <p className="text-muted-foreground">Upload a SHACL shapes file to generate a metadata form</p>
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
            <p className="text-sm text-destructive" data-testid="error-message">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
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
      />
    </div>
  );
}

interface WizardContentProps {
  steps: WizardStep[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
  defaultValues: Record<string, Record<string, unknown>>;
  model: ShaclModel;
  onExport: (values: Record<string, Record<string, unknown>>) => void;
}

function WizardContent({
  steps,
  currentStep,
  setCurrentStep,
  defaultValues,
  model,
  onExport,
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
        <ReviewStep jsonLd={jsonLd} />
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
