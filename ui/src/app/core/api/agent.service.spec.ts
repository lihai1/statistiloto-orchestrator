import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AgentService, AgentChatRequest, AgentApproveRequest, LlmConfigUpdate } from './agent.service';
import { environment } from '../../../environments/environment';

describe('AgentService', () => {
  let service: AgentService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl + '/agent';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AgentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('chat() should POST to /api/agent/chat with the correct body', () => {
    const req: AgentChatRequest = { sessionId: 'session-1', message: 'hello', intent: 'general' };
    const mockResponse = { response: 'hi there', thread_id: 't1', paused: false };

    service.chat(req).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const testReq = httpMock.expectOne(`${base}/chat`);
    expect(testReq.request.method).toBe('POST');
    expect(testReq.request.body).toEqual(req);
    testReq.flush(mockResponse);
  });

  it('approve() should POST to /api/agent/approve with the correct body', () => {
    const req: AgentApproveRequest = { sessionId: 'session-1', approved: true, edited: 'foo' };
    const mockResponse = { response: 'done', paused: false };

    service.approve(req).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const testReq = httpMock.expectOne(`${base}/approve`);
    expect(testReq.request.method).toBe('POST');
    expect(testReq.request.body).toEqual(req);
    testReq.flush(mockResponse);
  });

  it('getLlmConfig() should GET /api/agent/llm-config', () => {
    const mockConfig = { provider: 'ollama', model: 'llama3.1:8b' };

    service.getLlmConfig().subscribe((res) => {
      expect(res).toEqual(mockConfig);
    });

    const testReq = httpMock.expectOne(`${base}/llm-config`);
    expect(testReq.request.method).toBe('GET');
    testReq.flush(mockConfig);
  });

  it('updateLlmConfig() should PUT /api/agent/llm-config with the correct body', () => {
    const req: LlmConfigUpdate = { provider: 'gemini', model: 'gemini-pro', apiKey: 'k' };
    const mockResponse = { provider: 'gemini', model: 'gemini-pro', status: 'ok', note: 'saved' };

    service.updateLlmConfig(req).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const testReq = httpMock.expectOne(`${base}/llm-config`);
    expect(testReq.request.method).toBe('PUT');
    expect(testReq.request.body).toEqual(req);
    testReq.flush(mockResponse);
  });

  it('getHealth() should GET /api/agent/health', () => {
    service.getHealth().subscribe((res) => {
      expect(res.status).toBe('ok');
    });

    const testReq = httpMock.expectOne(`${base}/health`);
    expect(testReq.request.method).toBe('GET');
    testReq.flush({ status: 'ok' });
  });

  it('generateSessionId() should return a string starting with "session-"', () => {
    const id = service.generateSessionId();
    expect(typeof id).toBe('string');
    expect(id.startsWith('session-')).toBe(true);
    // Should be unique across calls
    expect(id).not.toBe(service.generateSessionId());
  });
});
