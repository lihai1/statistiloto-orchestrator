import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnalyzeRequest,
  GenerateFormRequest,
  LotteryResultResponse,
  SaveNumbersRequest,
  SavedNumbersResponse,
  StatisticsRequest,
  UserProfileResponse,
} from '../../shared/models/lottery.models';

/**
 * API service — the single point of contact with the Java BFF.
 * The UI never calls the Go gRPC service directly.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // ── Lottery computation (proxied to Go via Java BFF) ──────────
  generateForm(req: GenerateFormRequest): Observable<LotteryResultResponse> {
    return this.http.post<LotteryResultResponse>(`${this.base}/generate/form`, req);
  }

  getStatistics(req: StatisticsRequest): Observable<LotteryResultResponse> {
    return this.http.post<LotteryResultResponse>(`${this.base}/generate/statistics`, req);
  }

  analyze(req: AnalyzeRequest): Observable<LotteryResultResponse> {
    return this.http.post<LotteryResultResponse>(`${this.base}/generate/analyze`, req);
  }

  // ── Saved numbers (owned by Java BFF) ─────────────────────────
  getSavedNumbers(): Observable<SavedNumbersResponse[]> {
    return this.http.get<SavedNumbersResponse[]>(`${this.base}/user/numbers`);
  }

  saveNumbers(req: SaveNumbersRequest): Observable<SavedNumbersResponse> {
    return this.http.post<SavedNumbersResponse>(`${this.base}/user/numbers`, req);
  }

  deleteNumbers(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/user/numbers/${id}`);
  }

  // ── User profile ─────────────────────────────────────────────
  getProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.base}/me`);
  }
}
