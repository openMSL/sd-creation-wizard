import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FieldType, FieldTypeConfig, FormlyModule } from "@ngx-formly/core";

@Component({
  selector: "formly-number-range-field",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatInputModule, MatFormFieldModule, FormlyModule],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ props.label }}</mat-label>
      <input
        matInput
        type="number"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [attr.min]="props['min'] ?? null"
        [attr.max]="props['max'] ?? null"
        [attr.step]="props['step'] ?? 1"
      />
      @if (hasRange) {
        <mat-hint>Range: {{ props["min"] ?? "−∞" }} – {{ props["max"] ?? "∞" }}</mat-hint>
      } @else if (props.description) {
        <mat-hint>{{ props.description }}</mat-hint>
      }
      @if (showError) {
        <mat-error>
          @if (formControl.errors?.["min"]) {
            Minimum value is {{ props["min"] }}
          } @else if (formControl.errors?.["max"]) {
            Maximum value is {{ props["max"] }}
          } @else {
            {{ props.label }} is required
          }
        </mat-error>
      }
    </mat-form-field>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class NumberRangeFieldType extends FieldType<FieldTypeConfig> {
  get hasRange(): boolean {
    return this.props["min"] != null || this.props["max"] != null;
  }
}
