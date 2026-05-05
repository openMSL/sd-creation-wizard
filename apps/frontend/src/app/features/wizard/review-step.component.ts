import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";

@Component({
  selector: "app-review-step",
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Review Generated JSON-LD</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (jsonLd()) {
          <pre class="json-preview">{{ jsonLd() | json }}</pre>
        } @else {
          <p class="placeholder">
            Complete all previous steps to see the generated JSON-LD preview.
          </p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .json-preview {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 16px;
        overflow-x: auto;
        font-size: 0.85em;
        max-height: 500px;
        overflow-y: auto;
      }
      .placeholder {
        color: #9e9e9e;
        font-style: italic;
      }
      mat-card {
        margin-top: 16px;
      }
    `,
  ],
})
export class ReviewStepComponent {
  jsonLd = input<object | null>(null);
}
