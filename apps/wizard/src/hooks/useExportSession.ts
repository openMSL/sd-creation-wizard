import { useMutation } from "@tanstack/react-query";
import { exportToSession } from "@/lib/api-client";

export function useExportSession() {
  return useMutation({
    mutationFn: (jsonLd: string) => exportToSession(jsonLd),
  });
}
