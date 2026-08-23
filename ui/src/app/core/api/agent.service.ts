import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgentChatRequest {
  sessionId: string;
  message: string;
  intent?: string;
}

export interface AgentApproveRequest {
  sessionId: string;
  approved: boolean;
  edited?: string;
}

export interface AgentChatResponse {
  response?: string;
  thread_id?: string;
  paused?: boolean;
}

export interface LlmConfig {
  provider: string;
  model: string;
  base_url?: string;
  api_key?: string;
  request_timeout_seconds?: number;
}

export interface LlmConfigUpdate {
  provider: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  requestTimeoutSeconds?: number;
}

export interface LlmConfigUpdateResponse {
  provider: string;
  model: string;
  status: string;
  note: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  paused?: boolean;
  threadId?: string;
  timestamp: number;
}

export interface TokenUsageRow {
  user_sub: string;
  tier: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  calls: number;
}

export interface AuditLogRow {
  user_sub: string;
  tier: string;
  action: string;
  details: any;
  ts: number;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl + '/agent';

  chat(req: AgentChatRequest): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(`${this.base}/chat`, req);
  }

  approve(req: AgentApproveRequest): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(`${this.base}/approve`, req);
  }

  getLlmConfig(): Observable<LlmConfig> {
    return this.http.get<LlmConfig>(`${this.base}/llm-config`);
  }

  updateLlmConfig(req: LlmConfigUpdate): Observable<LlmConfigUpdateResponse> {
    return this.http.put<LlmConfigUpdateResponse>(`${this.base}/llm-config`, req);
  }

  getHealth(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.base}/health`);
  }

  getTokenUsage(): Observable<{ rows: TokenUsageRow[] }> {
    return this.http.get<{ rows: TokenUsageRow[] }>(`${this.base}/token-usage`);
  }

  getAuditLog(limit: number = 50): Observable<{ rows: AuditLogRow[] }> {
    return this.http.get<{ rows: AuditLogRow[] }>(`${this.base}/audit-log?limit=${limit}`);
  }

  /** Generate a random session ID for a new conversation. */
  generateSessionId(): string {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }
}
