import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { FieldType, FieldTypeConfig, FormlyModule } from "@ngx-formly/core";

@Component({
  selector: "formly-iri-field",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    FormlyModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ props.label }}</mat-label>
      <input
        matInput
        type="url"
        [formControl]="formControl"
        [formlyAttributes]="field"
        placeholder="https://example.org/resource"
      />
      <mat-icon matPrefix>link</mat-icon>
      @if (props.description) {
        <mat-hint>{{ props.description }}</mat-hint>
      }
      @if (showError) {
        <mat-error>
          @if (formControl.errors?.["pattern"]) {
            Must be a valid IRI (e.g. https://example.org/resource)
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
      mat-icon[matPrefix] {
        margin-right: 8px;
        color: rgba(0, 0, 0, 0.54);
      }
    `,
  ],
})
export class IriFieldType extends FieldType<FieldTypeConfig> {}
