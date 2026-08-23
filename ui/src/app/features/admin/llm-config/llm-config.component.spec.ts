import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { LlmConfigComponent } from './llm-config.component';
import { AgentService, LlmConfig, LlmConfigUpdateResponse } from '../../../core/api/agent.service';

describe('LlmConfigComponent', () => {
  let fixture: ComponentFixture<LlmConfigComponent>;
  let component: LlmConfigComponent;
  let mockAgentService: jasmine.SpyObj<AgentService>;

  beforeEach(async () => {
    mockAgentService = jasmine.createSpyObj<AgentService>('AgentService', [
      'getLlmConfig',
      'updateLlmConfig',
      'generateSessionId',
    ]);
    mockAgentService.getLlmConfig.and.returnValue(of({ provider: 'ollama', model: 'llama3.1:8b' } as LlmConfig));
    mockAgentService.updateLlmConfig.and.returnValue(
      of({ provider: 'ollama', model: 'llama3.1:8b', status: 'ok', note: 'Saved' } as LlmConfigUpdateResponse),
    );
    mockAgentService.generateSessionId.and.returnValue('session-llm-1');

    await TestBed.configureTestingModule({
      imports: [LlmConfigComponent],
      providers: [{ provide: AgentService, useValue: mockAgentService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LlmConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit -> getLlmConfig
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the LLM config on init', () => {
    expect(mockAgentService.getLlmConfig).toHaveBeenCalledTimes(1);
    expect(component.config.provider).toBe('ollama');
    expect(component.config.model).toBe('llama3.1:8b');
  });

  it('save() should call AgentService.updateLlmConfig()', () => {
    component.save();

    expect(mockAgentService.updateLlmConfig).toHaveBeenCalledTimes(1);
    const arg = mockAgentService.updateLlmConfig.calls.mostRecent().args[0];
    expect(arg.provider).toBe(component.config.provider);
    expect(arg.model).toBe(component.config.model);
  });

  it('save() should set saving to true then false after success', () => {
    component.save();
    // Synchronous of() completes immediately
    expect(component.saving()).toBe(false);
  });

  it('save() should set the status note from the response', () => {
    component.save();
    expect(component.statusNote()).toBe('Saved');
  });
});
