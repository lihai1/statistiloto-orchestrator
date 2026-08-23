import { TestBed } from '@angular/core/testing';
import { AgentContextService } from './agent-context.service';

describe('AgentContextService', () => {
  let service: AgentContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgentContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('ask() should set pendingMessage and open the widget', () => {
    expect(service.pendingMessage()).toBeNull();
    expect(service.openWidget()).toBe(false);

    service.ask('Why did number 7 appear so often?');

    expect(service.pendingMessage()).toBe('Why did number 7 appear so often?');
    expect(service.openWidget()).toBe(true);
  });

  it('consume() should clear pendingMessage', () => {
    service.ask('Analyze my numbers');
    expect(service.pendingMessage()).not.toBeNull();

    service.consume();

    expect(service.pendingMessage()).toBeNull();
  });
});
