import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AgentWidgetComponent } from './agent-widget.component';
import { AgentContextService } from '../../../core/api/agent-context.service';
import { AgentService } from '../../../core/api/agent.service';
import { of } from 'rxjs';

describe('AgentWidgetComponent', () => {
  let fixture: ComponentFixture<AgentWidgetComponent>;
  let component: AgentWidgetComponent;
  let mockAgentService: jasmine.SpyObj<AgentService>;

  beforeEach(async () => {
    mockAgentService = jasmine.createSpyObj<AgentService>('AgentService', [
      'chat',
      'approve',
      'generateSessionId',
    ]);
    mockAgentService.generateSessionId.and.returnValue('session-widget-1');
    mockAgentService.chat.and.returnValue(of({ response: 'ok', paused: false }));
    mockAgentService.approve.and.returnValue(of({ response: 'ok', paused: false }));

    await TestBed.configureTestingModule({
      imports: [AgentWidgetComponent],
      providers: [{ provide: AgentService, useValue: mockAgentService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the FAB button when closed', () => {
    component.open.set(false);
    fixture.detectChanges();

    const fab = fixture.nativeElement.querySelector('.agent-widget-fab');
    expect(fab).toBeTruthy();
  });

  it('should not show the panel when closed', () => {
    component.open.set(false);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.agent-widget-panel');
    expect(panel).toBeFalsy();
  });

  it('should show the panel when open', () => {
    component.open.set(true);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.agent-widget-panel');
    expect(panel).toBeTruthy();
  });

  it('should not show the FAB when open', () => {
    component.open.set(true);
    fixture.detectChanges();

    const fab = fixture.nativeElement.querySelector('.agent-widget-fab');
    expect(fab).toBeFalsy();
  });

  it('should open the widget when the FAB is clicked', () => {
    component.open.set(false);
    fixture.detectChanges();

    const fab = fixture.nativeElement.querySelector('.agent-widget-fab') as HTMLElement;
    expect(fab).toBeTruthy();
    fab.click();
    fixture.detectChanges();

    expect(component.open()).toBe(true);
    const panel = fixture.nativeElement.querySelector('.agent-widget-panel');
    expect(panel).toBeTruthy();
  });

  it('should open the widget when AgentContextService.ask() is called', () => {
    const ctx = TestBed.inject(AgentContextService);
    expect(component.open()).toBe(false);

    ctx.ask('Analyze my numbers');
    // The effect runs during change detection
    fixture.detectChanges();

    expect(component.open()).toBe(true);
  });
});
