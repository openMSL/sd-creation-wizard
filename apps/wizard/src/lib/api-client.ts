import type { ShaclModel, ResponseShaclJsonPair } from "@/types";

const API_BASE = "/api";

export async function convertFile(file: File): Promise<ShaclModel> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/convertFile`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function convertAndPrefillFile(
  shaclFile: File,
  jsonLdFile: File
): Promise<ResponseShaclJsonPair> {
  const form = new FormData();
  form.append("file", shaclFile);
  form.append("jsonFile", jsonLdFile);

  const res = await fetch(`${API_BASE}/convertAndPrefillFile`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SessionState {
  active: boolean;
  shaclContent?: string;
  jsonLdContent?: string;
  provenanceContent?: string;
  assetName?: string;
}

export async function getSession(): Promise<SessionState> {
  const res = await fetch(`${API_BASE}/session`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function exportToSession(jsonLd: string): Promise<{ path: string }> {
  const res = await fetch(`${API_BASE}/session/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: jsonLd }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
