import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatStepperModule } from "@angular/material/stepper";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { FormlyModule } from "@ngx-formly/core";

import { ShapeApiService } from "../../core/services/shape-api.service";
import { ShapeToFormlyService } from "../../core/services/shape-to-formly.service";
import { JsonLdSerializerService } from "../../core/services/jsonld-serializer.service";
import { JsonLdPrefillService } from "../../core/services/jsonld-prefill.service";
import { SessionService } from "../../core/services/session.service";
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
        @if (shaclFile()) {
          <div class="prefill-section">
            <p>Optionally upload existing JSON-LD to prefill the form:</p>
            <app-file-upload
              accept=".json,.jsonld"
              label="Select JSON-LD file (optional)"
              (fileSelected)="onPrefillFileSelected($event)"
            />
          </div>
        }
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
      .prefill-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
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
export class ShapeWizardComponent implements OnInit {
  private readonly api = inject(ShapeApiService);
  private readonly mapper = inject(ShapeToFormlyService);
  private readonly serializer = inject(JsonLdSerializerService);
  private readonly prefiller = inject(JsonLdPrefillService);
  private readonly session = inject(SessionService);
  private readonly snackBar = inject(MatSnackBar);

  model = signal<ShaclModel | null>(null);
  steps = signal<FormlyStep[]>([]);
  stepModels = signal<Record<string, unknown>[]>([]);
  loading = signal(false);
  shaclFile = signal<File | null>(null);
  sessionMode = signal(false);

  generatedJsonLd = signal<object | null>(null);

  ngOnInit(): void {
    this.checkForSession();
  }

  /**
   * On startup, check if the API has an active session (pipeline handoff).
   * If so, auto-load SHACL + prefill without user uploading files.
   */
  private checkForSession(): void {
    this.session.getSession().subscribe({
      next: (state) => {
        if (!state.active || !state.shaclContent) return;

        this.sessionMode.set(true);
        this.loading.set(true);

        // Build a synthetic File from session content for the API call
        const shaclBlob = new File([state.shaclContent], "shapes.ttl", { type: "text/turtle" });

        if (state.jsonLdContent) {
          const jsonLdBlob = new File([state.jsonLdContent], "prefill.json", {
            type: "application/json",
          });
          this.api.convertAndPrefill(shaclBlob, jsonLdBlob).subscribe({
            next: (result) => {
              this.model.set(result.shaclModel);
              const formSteps = this.mapper.toSteps(result.shaclModel);
              this.steps.set(formSteps);
              const prefilled = this.prefiller.prefill(
                result.matchedSubjects,
                formSteps,
                result.shaclModel
              );
              this.stepModels.set(prefilled);
              this.loading.set(false);
              this.snackBar.open("Form loaded from pipeline — edit and export when ready", "OK", {
                duration: 5000,
              });
            },
            error: () => {
              this.loading.set(false);
              this.sessionMode.set(false);
            },
          });
        } else {
          this.api.convert(shaclBlob).subscribe({
            next: (result) => {
              this.model.set(result);
              const formSteps = this.mapper.toSteps(result);
              this.steps.set(formSteps);
              this.stepModels.set(formSteps.map(() => ({})));
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
              this.sessionMode.set(false);
            },
          });
        }
      },
      error: () => {
        // No session available — normal manual mode
      },
    });
  }

  onFileSelected(file: File): void {
    this.shaclFile.set(file);
    this.loadModel(file);
  }

  onPrefillFileSelected(jsonLdFile: File): void {
    const shacl = this.shaclFile();
    if (!shacl) return;

    this.loading.set(true);
    this.api.convertAndPrefill(shacl, jsonLdFile).subscribe({
      next: (result) => {
        this.model.set(result.shaclModel);
        const formSteps = this.mapper.toSteps(result.shaclModel);
        this.steps.set(formSteps);

        const prefilled = this.prefiller.prefill(
          result.matchedSubjects,
          formSteps,
          result.shaclModel
        );
        this.stepModels.set(prefilled);
        this.loading.set(false);
        this.snackBar.open("Form prefilled from JSON-LD", "Close", {
          duration: 3000,
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(`Prefill error: ${err.message || "Failed to process"}`, "Close", {
          duration: 5000,
        });
      },
    });
  }

  private loadModel(file: File): void {
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
      formValues[steps[i].label] = steps[i].form.value as Record<string, unknown>;
    }

    const jsonLd = this.serializer.serialize(formValues, model);
    this.generatedJsonLd.set(jsonLd);

    if (this.sessionMode()) {
      // In session mode, export to the pipeline output path via API
      this.session.exportToSession(jsonLd).subscribe({
        next: (result) => {
          this.snackBar.open(
            `Exported to pipeline: ${result.path} — you can close this tab`,
            "Close",
            { duration: 10000 }
          );
        },
        error: () => {
          this.snackBar.open("Export failed — downloading as fallback", "Close", {
            duration: 5000,
          });
          this.downloadJsonLd(jsonLd);
        },
      });
    } else {
      this.downloadJsonLd(jsonLd);
    }
  }

  private downloadJsonLd(jsonLd: object): void {
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
