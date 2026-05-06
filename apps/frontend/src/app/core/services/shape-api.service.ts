import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { ResponseShaclJsonPair, ShaclModel } from "../models/shacl.model";

@Injectable({ providedIn: "root" })
export class ShapeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api";

  /**
   * Upload a SHACL TTL file and get the parsed form schema.
   */
  convert(file: File): Observable<ShaclModel> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<ShaclModel>(`${this.baseUrl}/convertFile`, formData);
  }

  /**
   * Upload a SHACL TTL file + existing JSON-LD for prefill.
   */
  convertAndPrefill(shaclFile: File, jsonLdFile: File): Observable<ResponseShaclJsonPair> {
    const formData = new FormData();
    formData.append("file", shaclFile);
    formData.append("jsonFile", jsonLdFile);
    return this.http.post<ResponseShaclJsonPair>(`${this.baseUrl}/convertAndPrefillFile`, formData);
  }
}
