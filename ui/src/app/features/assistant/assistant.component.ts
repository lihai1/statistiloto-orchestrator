import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AgentChatComponent } from '../../shared/components/agent-chat/agent-chat.component';
import { AgentService } from '../../core/api/agent.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [AgentChatComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="assistant-page">
      <div class="assistant-header">
        <h2>{{ 'assistant.title' | translate }}</h2>
        <button class="new-chat-btn" (click)="newChat()">
          <i class="pi pi-plus"></i> {{ 'assistant.newChat' | translate }}
        </button>
      </div>
      <div class="assistant-chat-container">
        <app-agent-chat [sessionId]="sessionId()" />
      </div>
    </section>
  `,
  styles: [`
    .assistant-page {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 140px);
    }
    .assistant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .assistant-header h2 {
      margin: 0;
      font-size: 22px;
      color: var(--primary);
    }
    .new-chat-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }
    .new-chat-btn:hover { border-color: var(--primary); color: var(--primary); }
    .assistant-chat-container {
      flex: 1;
      background: var(--card-bg);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }
  `],
})
export class AssistantComponent {
  private agentService = inject(AgentService);
  sessionId = signal(this.agentService.generateSessionId());

  newChat(): void {
    this.sessionId.set(this.agentService.generateSessionId());
  }
}
