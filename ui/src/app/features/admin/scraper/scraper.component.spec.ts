import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { ScraperComponent } from './scraper.component';
import { AgentService, AgentChatResponse } from '../../../core/api/agent.service';

describe('ScraperComponent', () => {
  let fixture: ComponentFixture<ScraperComponent>;
  let component: ScraperComponent;
  let mockAgentService: jasmine.SpyObj<AgentService>;

  beforeEach(async () => {
    mockAgentService = jasmine.createSpyObj<AgentService>('AgentService', [
      'chat',
      'approve',
      'generateSessionId',
    ]);
    mockAgentService.generateSessionId.and.returnValue('session-scraper-1');
    mockAgentService.chat.and.returnValue(of({ response: 'Scraper done', paused: false } as AgentChatResponse));
    mockAgentService.approve.and.returnValue(of({ response: 'Approved', paused: false } as AgentChatResponse));

    await TestBed.configureTestingModule({
      imports: [ScraperComponent],
      providers: [{ provide: AgentService, useValue: mockAgentService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ScraperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start idle with no pending approval', () => {
    expect(component.triggering()).toBe(false);
    expect(component.triggered()).toBe(false);
    expect(component.pendingApproval()).toBe(false);
    expect(component.resultMessage()).toBeNull();
  });

  it('trigger() should call AgentService.chat()', () => {
    component.trigger();

    expect(mockAgentService.chat).toHaveBeenCalledTimes(1);
    const arg = mockAgentService.chat.calls.mostRecent().args[0];
    expect(arg.intent).toBe('admin_ops');
    expect(arg.sessionId).toBeTruthy();
  });

  it('trigger() should set a success result message when not paused', () => {
    component.trigger();

    expect(component.triggering()).toBe(false);
    expect(component.triggered()).toBe(true);
    expect(component.pendingApproval()).toBe(false);
    expect(component.resultSuccess()).toBe(true);
    expect(component.resultMessage()).toBe('Scraper done');
  });

  it('should show an approval card when the response is paused', () => {
    mockAgentService.chat.and.returnValue(of({ response: 'proposed', paused: true, thread_id: 't-1' } as AgentChatResponse));

    component.trigger();

    expect(component.pendingApproval()).toBe(true);
    expect(component.triggered()).toBe(true);

    fixture.detectChanges();
    const approvalCard = fixture.nativeElement.querySelector('.approval-card');
    expect(approvalCard).toBeTruthy();
  });

  it('approveScraper() should call AgentService.approve()', () => {
    mockAgentService.chat.and.returnValue(of({ response: 'proposed', paused: true } as AgentChatResponse));
    component.trigger();

    component.approveScraper(true);

    expect(mockAgentService.approve).toHaveBeenCalledTimes(1);
    const arg = mockAgentService.approve.calls.mostRecent().args[0];
    expect(arg.approved).toBe(true);
  });

  it('approveScraper(false) should reject and clear pending approval', () => {
    mockAgentService.chat.and.returnValue(of({ response: 'proposed', paused: true } as AgentChatResponse));
    component.trigger();

    component.approveScraper(false);

    expect(component.pendingApproval()).toBe(false);
    expect(component.triggering()).toBe(false);
    expect(component.resultSuccess()).toBe(false);
  });
});
