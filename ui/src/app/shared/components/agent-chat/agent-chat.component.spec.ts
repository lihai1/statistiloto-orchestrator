import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { AgentChatComponent } from './agent-chat.component';
import { AgentService, AgentChatResponse, AgentMessage } from '../../../core/api/agent.service';

describe('AgentChatComponent', () => {
  let fixture: ComponentFixture<AgentChatComponent>;
  let component: AgentChatComponent;
  let mockAgentService: jasmine.SpyObj<AgentService>;

  beforeEach(async () => {
    mockAgentService = jasmine.createSpyObj<AgentService>('AgentService', [
      'chat',
      'approve',
      'generateSessionId',
    ]);
    mockAgentService.generateSessionId.and.returnValue('session-test-123');
    // Default: chat never emits, so send() only adds the user message and
    // stays in the loading state. Individual tests override this with of().
    mockAgentService.chat.and.returnValue(NEVER);
    mockAgentService.approve.and.returnValue(of({ response: 'Approved', paused: false } as AgentChatResponse));

    await TestBed.configureTestingModule({
      imports: [AgentChatComponent],
      providers: [{ provide: AgentService, useValue: mockAgentService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('send() should add a user message to the list', () => {
    expect(component.messages().length).toBe(0);

    component.inputText = 'What are my lucky numbers?';
    component.send();

    // chat() returns NEVER, so only the user message is present and loading.
    expect(component.messages().length).toBe(1);
    expect(component.messages()[0].role).toBe('user');
    expect(component.messages()[0].content).toBe('What are my lucky numbers?');
    expect(component.loading()).toBe(true);
  });

  it('send() should call AgentService.chat()', () => {
    component.inputText = 'Hello agent';
    component.send();

    expect(mockAgentService.chat).toHaveBeenCalledTimes(1);
    const arg = mockAgentService.chat.calls.mostRecent().args[0];
    expect(arg.message).toBe('Hello agent');
    expect(arg.sessionId).toBe(component.sessionId);
  });

  it('send() should not send an empty message', () => {
    component.inputText = '   ';
    component.send();

    expect(mockAgentService.chat).not.toHaveBeenCalled();
    expect(component.messages().length).toBe(0);
  });

  it('should add an assistant message after a successful (non-paused) chat response', () => {
    mockAgentService.chat.and.returnValue(of({ response: 'Hello', paused: false } as AgentChatResponse));

    component.inputText = 'Hi';
    component.send();

    // user message + assistant message
    expect(component.messages().length).toBe(2);
    const assistant = component.messages()[1];
    expect(assistant.role).toBe('assistant');
    expect(assistant.content).toBe('Hello');
    expect(assistant.paused).toBeFalsy();
  });

  it('should show a HITL card when the response has paused=true', () => {
    mockAgentService.chat.and.returnValue(of({ response: 'proposed', paused: true, thread_id: 't-1' } as AgentChatResponse));

    component.inputText = 'Run scraper';
    component.send();

    const pausedMsg = component.messages().find((m) => m.paused);
    expect(pausedMsg).toBeTruthy();
    expect(pausedMsg?.paused).toBe(true);
    expect(pausedMsg?.threadId).toBe('t-1');

    // The HITL card should be rendered in the DOM
    fixture.detectChanges();
    const hitlCard = fixture.nativeElement.querySelector('.hitl-card');
    expect(hitlCard).toBeTruthy();
  });

  it('approveAction() should call AgentService.approve()', () => {
    mockAgentService.chat.and.returnValue(of({ response: 'proposed', paused: true, thread_id: 't-1' } as AgentChatResponse));

    component.inputText = 'Run scraper';
    component.send();

    const pausedMsg = component.messages().find((m) => m.paused) as AgentMessage;
    expect(pausedMsg).toBeTruthy();

    component.approveAction(pausedMsg, true);

    expect(mockAgentService.approve).toHaveBeenCalledTimes(1);
    const arg = mockAgentService.approve.calls.mostRecent().args[0];
    expect(arg.approved).toBe(true);
    expect(arg.sessionId).toBe(component.sessionId);
  });

  it('approveAction() should clear the paused flag on the message after approval', () => {
    mockAgentService.chat.and.returnValue(of({ response: 'proposed', paused: true, thread_id: 't-1' } as AgentChatResponse));
    mockAgentService.approve.and.returnValue(of({ response: 'Approved', paused: false } as AgentChatResponse));

    component.inputText = 'Run scraper';
    component.send();

    expect(component.messages().some((m) => m.paused)).toBe(true);

    const pausedMsg = component.messages().find((m) => m.paused) as AgentMessage;
    component.approveAction(pausedMsg, true);

    // After approval, no message should remain paused.
    expect(component.messages().some((m) => m.paused)).toBe(false);
  });

  it('should set loading=true while a chat request is in flight', () => {
    // chat() returns NEVER by default, so loading stays true.
    component.inputText = 'Hi';
    component.send();

    expect(component.loading()).toBe(true);
  });

  it('should clear loading on chat error', () => {
    mockAgentService.chat.and.returnValue(throwError(() => new Error('network down')));

    component.inputText = 'Hi';
    component.send();

    expect(component.loading()).toBe(false);
    // user message should still be present
    expect(component.messages().length).toBe(1);
  });
});
