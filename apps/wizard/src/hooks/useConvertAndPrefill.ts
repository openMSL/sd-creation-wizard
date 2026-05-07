import { useMutation } from "@tanstack/react-query";
import { convertAndPrefillFile } from "@/lib/api-client";

export function useConvertAndPrefill() {
  return useMutation({
    mutationFn: ({ shaclFile, jsonLdFile }: { shaclFile: File; jsonLdFile: File }) =>
      convertAndPrefillFile(shaclFile, jsonLdFile),
  });
}
