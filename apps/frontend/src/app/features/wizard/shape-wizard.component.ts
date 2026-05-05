import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatStepperModule } from "@angular/material/stepper";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { FormlyModule } from "@ngx-formly/core";
import { FormlyMaterialModule } from "@ngx-formly/material";

import { ShapeApiService } from "../../core/services/shape-api.service";
import { ShapeToFormlyService } from "../../core/services/shape-to-formly.service";
import { JsonLdSerializerService } from "../../core/services/jsonld-serializer.service";
import { FormlyStep, ShaclModel } from "../../core/models/shacl.model";
import { FileUploadComponent } from "./file-upload.component";
import { ReviewStepComponent } from "./review-step.component";

@Component({
  selector: "app-shape-wizard",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    FormlyModule,
    FormlyMaterialModule,
    FileUploadComponent,
    ReviewStepComponent,
  ],
  template: `
    @if (!model()) {
      <div class="upload-container">
        <h2>SD Creation Wizard</h2>
        <p>Upload a SHACL shapes file (.ttl) to generate the metadata form.</p>
        <app-file-upload
          accept=".ttl"
          label="Select SHACL file"
          (fileSelected)="onFileSelected($event)"
        />
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }
      </div>
    } @else {
      <mat-stepper [linear]="true" #stepper>
        @for (step of steps(); track step.label; let i = $index) {
          <mat-step [stepControl]="step.form" [label]="step.label">
            <form [formGroup]="step.form">
              <formly-form [form]="step.form" [fields]="step.fields" [model]="stepModels()[i]" />
            </form>
            <div class="step-actions">
              @if (i > 0) {
                <button mat-button matStepperPrevious>Back</button>
              }
              <button mat-raised-button color="primary" matStepperNext>Next</button>
            </div>
          </mat-step>
        }
        <mat-step label="Review & Export">
          <app-review-step [jsonLd]="generatedJsonLd()" />
          <div class="step-actions">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-raised-button color="primary" (click)="onExport()">
              <mat-icon>download</mat-icon> Export JSON-LD
            </button>
          </div>
        </mat-step>
      </mat-stepper>
    }
  `,
  styles: [
    `
      .upload-container {
        max-width: 600px;
        margin: 64px auto;
        text-align: center;
        padding: 32px;
      }
      .step-actions {
        margin-top: 24px;
        display: flex;
        gap: 12px;
      }
      mat-stepper {
        padding: 24px;
      }
    `,
  ],
})
export class ShapeWizardComponent {
  private readonly api = inject(ShapeApiService);
  private readonly mapper = inject(ShapeToFormlyService);
  private readonly serializer = inject(JsonLdSerializerService);
  private readonly snackBar = inject(MatSnackBar);

  model = signal<ShaclModel | null>(null);
  steps = signal<FormlyStep[]>([]);
  stepModels = signal<Record<string, unknown>[]>([]);
  loading = signal(false);

  generatedJsonLd = signal<object | null>(null);

  onFileSelected(file: File): void {
    this.loading.set(true);
    this.api.convert(file).subscribe({
      next: (result) => {
        this.model.set(result);
        const formSteps = this.mapper.toSteps(result);
        this.steps.set(formSteps);
        this.stepModels.set(formSteps.map(() => ({})));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(`Error: ${err.message || "Failed to parse SHACL file"}`, "Close", {
          duration: 5000,
        });
      },
    });
  }

  onExport(): void {
    const model = this.model();
    if (!model) return;

    const formValues: Record<string, Record<string, unknown>> = {};
    const steps = this.steps();
    for (let i = 0; i < steps.length; i++) {
      formValues[model.shapes[i].targetClassName] = steps[i].form.value as Record<string, unknown>;
    }

    const jsonLd = this.serializer.serialize(formValues, model);
    this.generatedJsonLd.set(jsonLd);

    const blob = new Blob([JSON.stringify(jsonLd, null, 2)], {
      type: "application/ld+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "metadata.json";
    a.click();
    URL.revokeObjectURL(url);

    this.snackBar.open("JSON-LD exported successfully!", "Close", {
      duration: 3000,
    });
  }
}
