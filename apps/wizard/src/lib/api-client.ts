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

export interface QueueInfo {
  total: number;
  current: number;
  completed: number;
}

export interface SessionState {
  active: boolean;
  shaclContent?: string;
  jsonLdContent?: string;
  provenanceContent?: string;
  assetName?: string;
  exported?: boolean;
  queue?: QueueInfo;
}

export interface ExportResult {
  status: string;
  path: string;
  queue?: QueueInfo & { allExported: boolean; advanced: boolean };
}

export async function getSession(): Promise<SessionState> {
  const res = await fetch(`${API_BASE}/session`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function exportToSession(jsonLd: string): Promise<ExportResult> {
  const res = await fetch(`${API_BASE}/session/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonLd }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function advanceQueue(direction: "next" | "prev"): Promise<{ status: string; current: number; assetName?: string }> {
  const res = await fetch(`${API_BASE}/session/queue/${direction}`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
