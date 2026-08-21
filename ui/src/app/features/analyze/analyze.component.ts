import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ArchiveWindowService } from '../../shared/services/archive-window.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ArchiveWindowComponent } from '../../shared/components/archive-window/archive-window.component';
import { NumberSetComponent } from '../../shared/components/number-set/number-set.component';
import {
  AnalyzeRequest,
  LotteryResultResponse,
} from '../../shared/models/lottery.models';
import { AnalyzedGroup, groupBySize } from '../../shared/utils/arrays-filter';

@Component({
  selector: 'app-analyze',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ArchiveWindowComponent,
    NumberSetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>{{ 'analyze.title' | translate }}</h2>
      <p>{{ 'analyze.subtitle' | translate }}</p>

      <app-archive-window />

      <div class="form-row">
        <label for="form">{{ 'analyze.input' | translate }}</label>
        <input
          id="form"
          type="text"
          [(ngModel)]="formInput"
          [placeholder]="'analyze.placeholder' | translate"
        />
      </div>

      <button class="primary" (click)="analyze()">{{ 'analyze.button' | translate }}</button>

      @if (result()?.frequency) {
        <div class="results">
          <h3>{{ 'analyze.frequency' | translate }}</h3>

          <div class="tabs">
            @for (g of groups(); track g.size) {
              <button
                class="tab"
                [class.active]="currentTab() === g.size"
                (click)="currentTab.set(g.size)"
              >
                {{ g.size }}
              </button>
            }
          </div>

          @for (g of groups(); track g.size) {
            @if (currentTab() === g.size) {
              <div class="tab-content">
                <div class="group-title">{{ g.title }}</div>
                @if (g.entries.length > 0) {
                  <div class="freq-list">
                    @for (entry of g.entries; track entry.number) {
                      <div class="freq-row">
                        <app-number-set [numbers]="[entry.number]" size="sm" />
                        <span class="freq-count">×{{ entry.count }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="empty-tab">—</p>
                }
              </div>
            }
          }
        </div>
      }

      @if (result()?.matches?.length) {
        <div class="results">
          <h3>{{ 'analyze.matches' | translate }}</h3>
          @for (match of result()!.matches; track match.drawId) {
            <div class="match-row">
              <span class="match-date">{{ match.drawDate }}</span>
              <app-number-set [numbers]="match.matchedNumbers" size="sm" />
              <span class="match-count">{{ 'analyze.matchCount' | translate: { count: match.matchCount } }}</span>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .form-row { margin: 12px 0; display: flex; flex-direction: column; gap: 4px; max-width: 320px; }
    .form-row label { font-size: 13px; color: var(--text-secondary); }
    input { padding: 8px; border: 1px solid var(--border); border-radius: 4px; }
    .results { margin-top: 24px; }
    .tabs { display: flex; gap: 4px; margin: 12px 0; }
    .tab {
      padding: 6px 16px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 4px;
    }
    .tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .group-title { font-weight: 600; margin-bottom: 8px; }
    .freq-list { display: flex; flex-direction: column; gap: 4px; }
    .freq-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; border-bottom: 1px solid var(--border); }
    .freq-count { color: var(--text-secondary); font-weight: 600; }
    .match-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }
    .match-date { font-size: 13px; color: var(--text-secondary); min-width: 100px; }
    .match-count { font-size: 13px; color: var(--primary); font-weight: 600; }
    .empty-tab { color: var(--text-secondary); }
  `],
})
export class AnalyzeComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);
  private archive = inject(ArchiveWindowService);

  formInput = '';
  result = signal<LotteryResultResponse | null>(null);
  groups = signal<AnalyzedGroup[]>([]);
  currentTab = signal(1);

  /** Bound from the ?form= query param (via withComponentInputBinding). */
  @Input() set form(value: string | undefined) {
    if (value) {
      this.formInput = value;
      this.analyze();
    }
  }

  analyze(): void {
    const form = this.formInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (form.length === 0) {
      this.toast.info(this.lang.t('analyze.empty'));
      return;
    }

    this.toast.showLoading();
    const req: AnalyzeRequest = {
      form,
      from: this.archive.from(),
      to: this.archive.to(),
    };

    this.api.analyze(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.groups.set(groupBySize(res.frequency ?? {}, 6));
        this.currentTab.set(1);
        this.toast.hideLoading();
      },
      error: (err) => {
        this.toast.hideLoading();
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }
}
