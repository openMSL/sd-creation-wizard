import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { FieldType, FieldTypeConfig, FormlyModule } from "@ngx-formly/core";

@Component({
  selector: "formly-repeat-field",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormlyModule, MatButtonModule, MatIconModule],
  template: `
    <div class="repeat-label">{{ props.label }}</div>
    @for (item of field.fieldGroup; track $index; let i = $index) {
      <div class="repeat-row">
        <formly-field [field]="item" />
        <button
          mat-icon-button
          color="warn"
          type="button"
          (click)="remove(i)"
          [disabled]="(field.fieldGroup?.length ?? 0) <= (props['minItems'] ?? 0)"
        >
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    }
    <button
      mat-stroked-button
      type="button"
      (click)="add()"
      [disabled]="props['maxItems'] && (field.fieldGroup?.length ?? 0) >= props['maxItems']"
    >
      <mat-icon>add</mat-icon> Add
    </button>
  `,
  styles: [
    `
      .repeat-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .repeat-row formly-field {
        flex: 1;
      }
      .repeat-label {
        font-weight: 500;
        margin-bottom: 8px;
      }
    `,
  ],
})
export class RepeatFieldType extends FieldType<FieldTypeConfig> {
  add(): void {
    this.field.fieldGroup = this.field.fieldGroup ?? [];
    const fieldArray = this.field.fieldArray;
    if (fieldArray && typeof fieldArray === "object") {
      this.field.fieldGroup.push({ ...fieldArray });
    }
  }

  remove(index: number): void {
    this.field.fieldGroup?.splice(index, 1);
  }
}
