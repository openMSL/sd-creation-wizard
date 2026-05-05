import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./features/wizard/shape-wizard.component").then((m) => m.ShapeWizardComponent),
  },
];
