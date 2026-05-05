import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatRadioModule } from "@angular/material/radio";
import { FieldType, FieldTypeConfig, FormlyModule } from "@ngx-formly/core";

interface UnionBranch {
  label: string;
  fields: unknown[];
}

@Component({
  selector: "formly-union-field",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatRadioModule, FormlyModule],
  template: `
    <div class="union-label">{{ props.label }}</div>
    @if (props.description) {
      <p class="union-description">{{ props.description }}</p>
    }
    <mat-radio-group (change)="onBranchChange($event.value)">
      @for (branch of branches; track branch.label; let i = $index) {
        <mat-radio-button [value]="i">{{ branch.label }}</mat-radio-button>
      }
    </mat-radio-group>
    @if (selectedIndex() !== null) {
      <div class="union-branch-form">
        <formly-form
          [form]="branchForm"
          [fields]="$any(branches[selectedIndex()!].fields)"
          [model]="branchModel"
        />
      </div>
    }
  `,
  styles: [
    `
      .union-label {
        font-weight: 500;
        margin-bottom: 4px;
      }
      .union-description {
        color: rgba(0, 0, 0, 0.6);
        font-size: 0.85em;
        margin-bottom: 8px;
      }
      mat-radio-button {
        margin-right: 16px;
      }
      .union-branch-form {
        margin-top: 12px;
        padding-left: 16px;
        border-left: 3px solid #e0e0e0;
      }
    `,
  ],
})
export class UnionFieldType extends FieldType<FieldTypeConfig> {
  selectedIndex = signal<number | null>(null);
  branchForm = new FormGroup({});
  branchModel: Record<string, unknown> = {};

  get branches(): UnionBranch[] {
    return (this.props["branches"] as UnionBranch[]) ?? [];
  }

  onBranchChange(index: number): void {
    this.selectedIndex.set(index);
    this.branchForm = new FormGroup({});
    this.branchModel = {};
  }
}
