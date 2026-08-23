import { ChangeDetectionStrategy, Component, ElementRef, Input, Output, EventEmitter, inject, signal, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AgentService, AgentMessage } from '../../../core/api/agent.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../toast/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-agent-chat',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agent-chat">
      <!-- Message list -->
      <div class="chat-messages" #scrollContainer>
        @for (msg of messages(); track msg.timestamp) {
          <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
            <div class="message-bubble">
              {{ msg.content }}
            </div>
          </div>
          @if (msg.paused) {
            <div class="hitl-card">
              <div class="hitl-icon"><i class="pi pi-exclamation-triangle"></i></div>
              <div class="hitl-content">
                <div class="hitl-title">{{ 'agent.approvalRequired' | translate }}</div>
                <div class="hitl-desc">{{ 'agent.approvalDesc' | translate }}</div>
                <div class="hitl-actions">
                  <p-button [label]="'agent.approve' | translate" severity="success" size="small" (onClick)="approveAction(msg, true)"></p-button>
                  <p-button [label]="'agent.reject' | translate" severity="danger" size="small" (onClick)="approveAction(msg, false)"></p-button>
                </div>
              </div>
            </div>
          }
        }
        @if (loading()) {
          <div class="message assistant">
            <div class="message-bubble loading-bubble">
              <p-progressSpinner strokeWidth="3" styleClass="small-spinner"></p-progressSpinner>
              <span>{{ 'agent.thinking' | translate }}</span>
            </div>
          </div>
        }
        @if (messages().length === 0 && !loading()) {
          <div class="empty-chat">
            <i class="pi pi-comments empty-icon"></i>
            <p>{{ 'agent.welcome' | translate }}</p>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="chat-input">
        <input
          pInputText
          type="text"
          [(ngModel)]="inputText"
          (keydown.enter)="send()"
          [placeholder]="'agent.placeholder' | translate"
          [disabled]="loading()"
          autocomplete="off"
        />
        <p-button
          icon="pi pi-send"
          (onClick)="send()"
          [disabled]="loading() || !inputText.trim()"
          [loading]="loading()"
        ></p-button>
      </div>
    </div>
  `,
  styles: [`
    .agent-chat {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 300px;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .message {
      display: flex;
      max-width: 85%;
    }
    .message.user {
      align-self: flex-end;
    }
    .message.assistant {
      align-self: flex-start;
    }
    [dir="rtl"] .message.user { align-self: flex-start; }
    [dir="rtl"] .message.assistant { align-self: flex-end; }
    .message-bubble {
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .message.user .message-bubble {
      background: var(--primary);
      color: white;
      border-bottom-right-radius: 4px;
    }
    [dir="rtl"] .message.user .message-bubble {
      border-bottom-right-radius: 12px;
      border-bottom-left-radius: 4px;
    }
    .message.assistant .message-bubble {
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }
    [dir="rtl"] .message.assistant .message-bubble {
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 4px;
    }
    .loading-bubble {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    :host ::ng-deep .small-spinner {
      width: 20px !important;
      height: 20px !important;
    }
    .empty-chat {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      gap: 12px;
    }
    .empty-icon { font-size: 48px; opacity: 0.3; }
    .hitl-card {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid #ffc107;
      border-radius: 8px;
      margin: 4px 0;
    }
    .hitl-icon {
      color: #ffc107;
      font-size: 20px;
      padding-top: 2px;
    }
    .hitl-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .hitl-title {
      font-weight: 600;
      font-size: 14px;
    }
    .hitl-desc {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .hitl-actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    .chat-input {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid var(--border);
      background: var(--card-bg);
    }
    .chat-input input {
      flex: 1;
    }
  `],
})
export class AgentChatComponent implements AfterViewChecked {
  private agentService = inject(AgentService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);

  private _sessionId = this.agentService.generateSessionId();
  @Input() set sessionId(value: string) {
    if (value && value !== this._sessionId) {
      this._sessionId = value;
      // Clear messages when session changes (New Chat).
      this.messages.set([]);
      this.loading.set(false);
      this.currentThreadId = null;
    }
  }
  get sessionId(): string {
    return this._sessionId;
  }
  @Input() intent: string | null = null;
  @Output() messageSent = new EventEmitter<string>();

  @ViewChild('scrollContainer') scrollContainer?: ElementRef;

  messages = signal<AgentMessage[]>([]);
  loading = signal(false);
  inputText = '';
  private currentThreadId: string | null = null;
  private shouldScroll = false;

  private scroll() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scroll();
      this.shouldScroll = false;
    }
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    this.messages.update(msgs => [...msgs, {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScroll = true;

    this.agentService.chat({
      sessionId: this.sessionId,
      message: text,
      intent: this.intent ?? undefined,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.thread_id) this.currentThreadId = res.thread_id;

        if (res.paused) {
          this.messages.update(msgs => [...msgs, {
            role: 'assistant',
            content: this.lang.t('agent.proposedAction'),
            paused: true,
            threadId: res.thread_id,
            timestamp: Date.now(),
          }]);
        } else {
          this.messages.update(msgs => [...msgs, {
            role: 'assistant',
            content: res.response ?? this.lang.t('agent.noResponse'),
            timestamp: Date.now(),
          }]);
        }
        this.shouldScroll = true;
        this.messageSent.emit(text);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }

  approveAction(msg: AgentMessage, approved: boolean): void {
    this.loading.set(true);
    this.agentService.approve({
      sessionId: this.sessionId,
      approved,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        // Remove the HITL card by replacing the paused message
        this.messages.update(msgs => msgs.map(m =>
          m === msg ? {
            ...m,
            paused: false,
            content: approved
              ? this.lang.t('agent.approved') + (res.response ? ': ' + res.response : '')
              : this.lang.t('agent.rejected'),
          } : m
        ));
        if (res.response && approved) {
          this.messages.update(msgs => [...msgs, {
            role: 'assistant',
            content: res.response ?? this.lang.t('agent.noResponse'),
            timestamp: Date.now(),
          }]);
        }
        this.shouldScroll = true;
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }

  /** Pre-fill the input with a contextual message and optionally auto-send. */
  prefill(message: string, autoSend = false): void {
    this.inputText = message;
    if (autoSend) this.send();
  }
}
