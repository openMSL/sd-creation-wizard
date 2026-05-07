import { createFileRoute } from "@tanstack/react-router";
import { WizardPage } from "@/components/wizard/WizardPage";

export const Route = createFileRoute("/")({
  component: WizardPage,
});
