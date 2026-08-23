import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { AgentService } from '../../../core/api/agent.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface AuditLogRow {
  userSub: string;
  tier: string;
  action: string;
  details: string;
  timestamp: string;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, ButtonModule, CardModule, TableModule, InputTextModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card header="{{ 'admin.auditLog' | translate }}" styleClass="admin-card">
      <div class="toolbar">
        <input pInputText type="text" [(ngModel)]="searchText" (ngModelChange)="filter()" [placeholder]="'admin.auditLog.search' | translate" />
        <p-button
          [label]="'admin.auditLog.refresh' | translate"
          icon="pi pi-refresh"
          (onClick)="load()"
          [loading]="loading()"
          size="small"
        ></p-button>
      </div>

      <p-table [value]="filteredData()" [loading]="loading()" styleClass="p-datatable-sm" [paginator]="true" [rows]="20">
        <ng-template #header>
          <tr>
            <th>{{ 'admin.auditLog.user' | translate }}</th>
            <th>{{ 'admin.auditLog.tier' | translate }}</th>
            <th>{{ 'admin.auditLog.action' | translate }}</th>
            <th>{{ 'admin.auditLog.details' | translate }}</th>
            <th>{{ 'admin.auditLog.timestamp' | translate }}</th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td>{{ row.userSub }}</td>
            <td><span class="tier-badge tier-{{ row.tier }}">{{ row.tier }}</span></td>
            <td>{{ row.action }}</td>
            <td class="details-cell">{{ row.details }}</td>
            <td>{{ row.timestamp }}</td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="5" class="empty-table">{{ 'admin.auditLog.empty' | translate }}</td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
  styles: [`
    .toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      align-items: center;
    }
    .toolbar input { flex: 1; max-width: 300px; }
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
    .details-cell {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .empty-table { text-align: center; color: var(--text-secondary); padding: 24px; }
  `],
})
export class AuditLogComponent implements OnInit {
  private agentService = inject(AgentService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);

  allData = signal<AuditLogRow[]>([]);
  filteredData = signal<AuditLogRow[]>([]);
  loading = signal(false);
  searchText = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.agentService.getAuditLog(50).subscribe({
      next: (res) => {
        this.loading.set(false);
        const rows = res.rows ?? [];
        this.allData.set(rows.map((r) => ({
          userSub: r.user_sub ?? '',
          tier: r.tier ?? 'free',
          action: r.action ?? '',
          details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details ?? {}),
          timestamp: r.ts ? new Date(r.ts * 1000).toLocaleString() : '',
        })));
        this.filter();
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }

  filter(): void {
    const search = this.searchText.toLowerCase().trim();
    if (!search) {
      this.filteredData.set(this.allData());
      return;
    }
    this.filteredData.set(
      this.allData().filter(r =>
        r.userSub.toLowerCase().includes(search) ||
        r.action.toLowerCase().includes(search) ||
        r.details.toLowerCase().includes(search)
      )
    );
  }
}
