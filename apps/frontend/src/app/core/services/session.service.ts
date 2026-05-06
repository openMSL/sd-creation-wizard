import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface SessionState {
  active: boolean;
  shaclContent?: string;
  jsonLdContent?: string | null;
  exported?: boolean;
}

export interface SessionExportResult {
  status: string;
  path: string;
}

@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api";

  /**
   * Check if the API has an active session (created by wizard_caller).
   */
  getSession(): Observable<SessionState> {
    return this.http.get<SessionState>(`${this.baseUrl}/session`);
  }

  /**
   * Export final JSON-LD back to the API, which writes it to the output path.
   */
  exportToSession(jsonLd: unknown): Observable<SessionExportResult> {
    return this.http.post<SessionExportResult>(`${this.baseUrl}/session/export`, { jsonLd });
  }
}
