import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AgentService, AgentChatResponse } from '../../../core/api/agent.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-scraper',
  standalone: true,
  imports: [ButtonModule, CardModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card header="{{ 'admin.scraper' | translate }}" styleClass="admin-card">
      <div class="scraper-status">
        <div class="status-row">
          <span class="status-label">{{ 'admin.scraper.status' | translate }}</span>
          <span class="status-value" [class.active]="triggered()">
            @if (triggered()) {
              <i class="pi pi-spin pi-spinner"></i> {{ 'admin.scraper.running' | translate }}
            } @else {
              <i class="pi pi-check-circle"></i> {{ 'admin.scraper.idle' | translate }}
            }
          </span>
        </div>
      </div>

      <div class="scraper-actions">
        <p-button
          [label]="'admin.scraper.trigger' | translate"
          icon="pi pi-sync"
          severity="warn"
          (onClick)="trigger()"
          [loading]="triggering()"
          [disabled]="triggered()"
        ></p-button>
      </div>

      @if (pendingApproval()) {
        <div class="approval-card">
          <div class="approval-icon"><i class="pi pi-exclamation-triangle"></i></div>
          <div class="approval-content">
            <div class="approval-title">{{ 'agent.approvalRequired' | translate }}</div>
            <div class="approval-desc">{{ 'admin.scraper.approvalDesc' | translate }}</div>
            <div class="approval-actions">
              <p-button [label]="'agent.approve' | translate" severity="success" size="small" (onClick)="approveScraper(true)"></p-button>
              <p-button [label]="'agent.reject' | translate" severity="danger" size="small" (onClick)="approveScraper(false)"></p-button>
            </div>
          </div>
        </div>
      }

      @if (resultMessage()) {
        <div class="result-message" [class.success]="resultSuccess()" [class.error]="!resultSuccess()">
          <i class="pi" [class.pi-check-circle]="resultSuccess()" [class.pi-times-circle]="!resultSuccess()"></i>
          {{ resultMessage() }}
        </div>
      }
    </p-card>
  `,
  styles: [`
    .scraper-status {
      margin-bottom: 20px;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg);
      border-radius: 8px;
    }
    .status-label {
      font-size: 14px;
      color: var(--text-secondary);
    }
    .status-value {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: var(--success);
    }
    .status-value.active { color: var(--primary); }
    .scraper-actions { margin-bottom: 16px; }
    .approval-card {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid #ffc107;
      border-radius: 8px;
      margin: 16px 0;
    }
    .approval-icon { color: #ffc107; font-size: 20px; }
    .approval-content { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .approval-title { font-weight: 600; font-size: 14px; }
    .approval-desc { font-size: 13px; color: var(--text-secondary); }
    .approval-actions { display: flex; gap: 8px; margin-top: 4px; }
    .result-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-top: 12px;
    }
    .result-message.success { background: rgba(56, 142, 60, 0.1); color: var(--success); }
    .result-message.error { background: rgba(211, 47, 47, 0.1); color: var(--danger); }
  `],
})
export class ScraperComponent {
  private agentService = inject(AgentService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);

  triggering = signal(false);
  triggered = signal(false);
  pendingApproval = signal(false);
  resultMessage = signal<string | null>(null);
  resultSuccess = signal(false);

  private sessionId = this.agentService.generateSessionId();

  trigger(): void {
    this.triggering.set(true);
    this.resultMessage.set(null);
    this.pendingApproval.set(false);

    this.agentService.chat({
      sessionId: this.sessionId,
      message: 'Trigger the lottery scraper to fetch new draw data',
      intent: 'admin_ops',
    }).subscribe({
      next: (res) => {
        this.triggering.set(false);
        if (res.paused) {
          this.pendingApproval.set(true);
          this.triggered.set(true);
        } else {
          this.resultSuccess.set(true);
          this.resultMessage.set(res.response ?? this.lang.t('admin.scraper.triggered'));
          this.triggered.set(true);
        }
      },
      error: (err) => {
        this.triggering.set(false);
        this.resultSuccess.set(false);
        this.resultMessage.set(err.message ?? this.lang.t('common.error'));
      },
    });
  }

  approveScraper(approved: boolean): void {
    this.triggering.set(true);
    this.pendingApproval.set(false);

    this.agentService.approve({
      sessionId: this.sessionId,
      approved,
    }).subscribe({
      next: (res) => {
        this.triggering.set(false);
        this.triggered.set(false);
        this.resultSuccess.set(approved);
        this.resultMessage.set(
          approved
            ? this.lang.t('admin.scraper.approved') + (res.response ? ': ' + res.response : '')
            : this.lang.t('admin.scraper.rejected')
        );
      },
      error: (err) => {
        this.triggering.set(false);
        this.triggered.set(false);
        this.resultSuccess.set(false);
        this.resultMessage.set(err.message ?? this.lang.t('common.error'));
      },
    });
  }
}
