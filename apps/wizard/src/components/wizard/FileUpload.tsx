import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  label: string;
  accept?: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ label, accept, onFile, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm text-foreground font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Drag & drop or click to browse
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        data-testid="file-input"
      />
    </div>
  );
}
