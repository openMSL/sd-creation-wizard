import { useMutation } from "@tanstack/react-query";
import { convertFile } from "@/lib/api-client";

export function useConvert() {
  return useMutation({
    mutationFn: (file: File) => convertFile(file),
  });
}
