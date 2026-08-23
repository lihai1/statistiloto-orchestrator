import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { AgentChatComponent } from '../agent-chat/agent-chat.component';
import { AgentContextService } from '../../../core/api/agent-context.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-agent-widget',
  standalone: true,
  imports: [AgentChatComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="agent-widget-panel">
        <div class="agent-widget-header">
          <span><i class="pi pi-comments"></i> {{ 'agent.title' | translate }}</span>
          <button class="close-btn" (click)="open.set(false)" aria-label="close">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="agent-widget-body">
          <app-agent-chat [sessionId]="sessionId()" #chat />
        </div>
      </div>
      <div class="agent-widget-scrim" (click)="open.set(false)"></div>
    } @else {
      <button class="agent-widget-fab" (click)="open.set(true)" aria-label="AI assistant">
        <i class="pi pi-comments"></i>
      </button>
    }
  `,
  styles: [`
    .agent-widget-fab {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .agent-widget-fab:hover { transform: scale(1.1); }
    [dir="rtl"] .agent-widget-fab { right: auto; left: 20px; }

    .agent-widget-scrim {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 199;
    }

    .agent-widget-panel {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: var(--card-bg);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 200;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    [dir="rtl"] .agent-widget-panel { right: auto; left: 20px; }

    .agent-widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--primary);
      color: white;
      font-weight: 600;
      font-size: 15px;
    }
    .agent-widget-header i { margin-right: 6px; }
    .close-btn {
      background: transparent;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
    }
    .agent-widget-body {
      flex: 1;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .agent-widget-panel {
        bottom: 0;
        right: 0;
        left: 0;
        width: 100%;
        max-width: 100%;
        height: 70vh;
        border-radius: 12px 12px 0 0;
      }
      [dir="rtl"] .agent-widget-panel {
        right: 0;
        left: 0;
      }
    }
  `],
})
export class AgentWidgetComponent {
  private agentContext = inject(AgentContextService);

  open = signal(false);
  sessionId = signal('session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8));

  @ViewChild('chat') chat?: AgentChatComponent;

  constructor() {
    // Open the widget when a feature component requests it via the shared service.
    effect(() => {
      if (this.agentContext.openWidget()) {
        this.open.set(true);
        const message = this.agentContext.pendingMessage();
        if (message) {
          // The chat ViewChild may not be rendered yet on the same cycle the
          // panel opens, so defer prefilling to the next microtask.
          queueMicrotask(() => {
            this.chat?.prefill(message);
            this.agentContext.consume();
          });
        }
      }
    });
  }

  /** Open the widget with a pre-filled contextual message. */
  openWithContext(message: string): void {
    this.agentContext.ask(message);
  }
}
