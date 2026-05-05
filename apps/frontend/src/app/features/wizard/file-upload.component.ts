import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-file-upload",
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div
      class="drop-zone"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <mat-icon class="upload-icon">cloud_upload</mat-icon>
      <p>{{ label() }}</p>
      <p class="hint">Drag & drop or click to browse</p>
      @if (selectedFileName) {
        <p class="selected-file">{{ selectedFileName }}</p>
      }
    </div>
    <input #fileInput type="file" hidden [accept]="accept()" (change)="onFileChange($event)" />
  `,
  styles: [
    `
      .drop-zone {
        border: 2px dashed #bdbdbd;
        border-radius: 12px;
        padding: 48px 24px;
        cursor: pointer;
        transition: border-color 0.2s;
      }
      .drop-zone:hover {
        border-color: #1976d2;
      }
      .upload-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #757575;
      }
      .hint {
        color: #9e9e9e;
        font-size: 0.85em;
      }
      .selected-file {
        color: #1976d2;
        font-weight: 500;
        margin-top: 8px;
      }
    `,
  ],
})
export class FileUploadComponent {
  accept = input(".ttl");
  label = input("Select file");
  fileSelected = output<File>();

  selectedFileName: string | null = null;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files[0];
    if (file) this.selectFile(file);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.selectFile(file);
  }

  private selectFile(file: File): void {
    this.selectedFileName = file.name;
    this.fileSelected.emit(file);
  }
}
