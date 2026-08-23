import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { AgentService } from '../../../core/api/agent.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface TokenUsageRow {
  userSub: string;
  tier: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  timestamp: string;
}

@Component({
  selector: 'app-token-usage',
  standalone: true,
  imports: [ButtonModule, CardModule, TableModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card header="{{ 'admin.tokenUsage' | translate }}" styleClass="admin-card">
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-label">{{ 'admin.tokenUsage.totalTokens' | translate }}</span>
          <span class="summary-value">{{ totalTokens() }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">{{ 'admin.tokenUsage.totalCost' | translate }}</span>
          <span class="summary-value">\${{ totalCost().toFixed(4) }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">{{ 'admin.tokenUsage.entries' | translate }}</span>
          <span class="summary-value">{{ usageData().length }}</span>
        </div>
      </div>

      <div class="refresh-bar">
        <p-button
          [label]="'admin.tokenUsage.refresh' | translate"
          icon="pi pi-refresh"
          (onClick)="load()"
          [loading]="loading()"
          size="small"
        ></p-button>
      </div>

      <p-table [value]="usageData()" [loading]="loading()" styleClass="p-datatable-sm">
        <ng-template #header>
          <tr>
            <th>{{ 'admin.tokenUsage.user' | translate }}</th>
            <th>{{ 'admin.tokenUsage.tier' | translate }}</th>
            <th>{{ 'admin.tokenUsage.model' | translate }}</th>
            <th>{{ 'admin.tokenUsage.prompt' | translate }}</th>
            <th>{{ 'admin.tokenUsage.completion' | translate }}</th>
            <th>{{ 'admin.tokenUsage.cost' | translate }}</th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td>{{ row.userSub }}</td>
            <td><span class="tier-badge tier-{{ row.tier }}">{{ row.tier }}</span></td>
            <td>{{ row.model }}</td>
            <td>{{ row.promptTokens }}</td>
            <td>{{ row.completionTokens }}</td>
            <td>\${{ row.cost.toFixed(4) }}</td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="6" class="empty-table">{{ 'admin.tokenUsage.empty' | translate }}</td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
  styles: [`
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: var(--bg);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .summary-label {
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
    }
    .refresh-bar { margin-bottom: 16px; }
    .tier-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .tier-free { background: #e0e0e0; color: #616161; }
    .tier-paid { background: #fff3e0; color: #e65100; }
    .tier-admin { background: #e3f2fd; color: #1565c0; }
    .empty-table { text-align: center; color: var(--text-secondary); padding: 24px; }
  `],
})
export class TokenUsageComponent implements OnInit {
  private agentService = inject(AgentService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);

  usageData = signal<TokenUsageRow[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  totalTokens = computed(() =>
    this.usageData().reduce((sum, r) => sum + r.promptTokens + r.completionTokens, 0)
  );
  totalCost = computed(() =>
    this.usageData().reduce((sum, r) => sum + r.cost, 0)
  );

  load(): void {
    this.loading.set(true);
    this.agentService.getTokenUsage().subscribe({
      next: (res) => {
        this.loading.set(false);
        const rows = res.rows ?? [];
        this.usageData.set(rows.map((r) => ({
          userSub: r.user_sub ?? '',
          tier: r.tier ?? 'free',
          provider: r.provider ?? '',
          model: r.model ?? '',
          promptTokens: r.prompt_tokens ?? 0,
          completionTokens: r.completion_tokens ?? 0,
          cost: r.cost_usd ?? 0,
          timestamp: '',
        })));
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }
}
