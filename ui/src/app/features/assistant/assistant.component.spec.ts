import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { AssistantComponent } from './assistant.component';
import { AgentService } from '../../core/api/agent.service';

describe('AssistantComponent', () => {
  let fixture: ComponentFixture<AssistantComponent>;
  let component: AssistantComponent;
  let mockAgentService: jasmine.SpyObj<AgentService>;

  beforeEach(async () => {
    mockAgentService = jasmine.createSpyObj<AgentService>('AgentService', [
      'chat',
      'approve',
      'generateSessionId',
    ]);
    mockAgentService.generateSessionId.and.returnValue('session-assistant-1');
    mockAgentService.chat.and.returnValue(of({ response: 'ok', paused: false }));
    mockAgentService.approve.and.returnValue(of({ response: 'ok', paused: false }));

    await TestBed.configureTestingModule({
      imports: [AssistantComponent],
      providers: [{ provide: AgentService, useValue: mockAgentService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with a session ID from AgentService', () => {
    expect(component.sessionId()).toBeTruthy();
    expect(mockAgentService.generateSessionId).toHaveBeenCalled();
  });

  it('newChat() should generate a new session ID', () => {
    const firstId = component.sessionId();
    mockAgentService.generateSessionId.and.returnValue('session-assistant-2');

    component.newChat();

    expect(component.sessionId()).toBe('session-assistant-2');
    expect(component.sessionId()).not.toBe(firstId);
    // generateSessionId is also called by the child AgentChatComponent,
    // so we only assert that newChat() triggered at least one more call.
    expect(mockAgentService.generateSessionId.calls.count()).toBeGreaterThan(1);
  });
});
