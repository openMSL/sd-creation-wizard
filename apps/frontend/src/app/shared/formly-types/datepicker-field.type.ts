import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatNativeDateModule } from "@angular/material/core";
import { FieldType, FieldTypeConfig, FormlyModule } from "@ngx-formly/core";

@Component({
  selector: "formly-datepicker-field",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    FormlyModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ props.label }}</mat-label>
      <input
        matInput
        [matDatepicker]="picker"
        [formControl]="formControl"
        [formlyAttributes]="field"
      />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker />
      @if (props.description) {
        <mat-hint>{{ props.description }}</mat-hint>
      }
      @if (showError) {
        <mat-error>{{ props.label }} is required</mat-error>
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
export class DatepickerFieldType extends FieldType<FieldTypeConfig> {}
