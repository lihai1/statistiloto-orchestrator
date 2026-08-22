import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ArchiveWindowService } from '../../services/archive-window.service';
import { ToastService } from '../toast/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { NumberSetComponent } from '../number-set/number-set.component';
import {
  NumberSetListComponent,
  NumberSetItem,
} from '../number-set-list/number-set-list.component';
import {
  AnalyzeRequest,
  LotteryResultResponse,
  NumbersCategory,
} from '../../models/lottery.models';
import { AnalyzedGroup, groupBySize } from '../../utils/arrays-filter';

/**
 * Analyze modal — modern adaptation of the legacy `analyzed-form` page.
 *
 * This is the "recursion component": it displays the form being analyzed
 * at the top, then frequency tabs (1–6), and for each tab a nested
 * `app-number-set-list` of the frequency results. The nested list itself
 * supports expand/analyze/save/delete actions, allowing recursive
 * analysis of sub-groups.
 */
@Component({
  selector: 'app-analyze-modal',
  standalone: true,
  imports: [
    TranslatePipe,
    NumberSetComponent,
    NumberSetListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-scrim" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ 'analyze.modalTitle' | translate }}</h2>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </div>

        <div class="modal-body">
          @if (form().length) {
            <div class="form-display">
              <app-number-set [numbers]="form()" size="lg" />
            </div>
          }

          @if (loading()) {
            <p class="loading">{{ 'analyze.loading' | translate }}</p>
          }

          @if (result()?.frequencyGroups) {
            <div class="results">
              <h3>{{ 'analyze.frequency' | translate }}</h3>

              <div class="tabs">
                @for (g of groups(); track g.size) {
                  <button
                    class="tab"
                    [class.active]="currentTab() === g.size"
                    (click)="selectTab(g.size)"
                  >
                    {{ g.size }}
                  </button>
                }
              </div>

              @for (g of groups(); track g.size) {
                @if (currentTab() === g.size) {
                  <div class="tab-content">
                    <div class="group-title" (click)="toggleExpand(g.size)">
                      <span class="expand-icon">{{ expandedTabs().has(g.size) ? '▾' : '▸' }}</span>
                      {{ g.title }}
                    </div>
                    @if (expandedTabs().has(g.size)) {
                      @if (groupItems()[g.size - 1]?.length) {
                        <app-number-set-list
                          [items]="groupItems()[g.size - 1]"
                          [showAnalyze]="true"
                          [showSave]="true"
                          [showDelete]="false"
                          (analyze)="onAnalyzeSubGroup($event)"
                          (save)="onSaveSubGroup($event)"
                        />
                      } @else {
                        <p class="empty-tab">{{ 'analyze.noResults' | translate }}</p>
                      }
                    }
                  </div>
                }
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-scrim {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 300;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 20px;
      overflow-y: auto;
    }
    .modal-card {
      background: var(--card-bg);
      border-radius: 10px;
      max-width: 700px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { margin: 0; font-size: 18px; }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 18px;
      color: var(--text-secondary);
      padding: 4px 8px;
    }
    .modal-body { padding: 20px; }
    .form-display {
      padding: 12px;
      background: var(--bg);
      border-radius: 6px;
      margin-bottom: 16px;
      text-align: center;
    }
    .loading { color: var(--text-secondary); text-align: center; padding: 20px; }
    .results { margin-top: 20px; }
    .results h3 { font-size: 15px; margin: 0 0 10px; }
    .tabs { display: flex; gap: 4px; margin: 12px 0; }
    .tab {
      padding: 6px 16px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 4px;
      font-size: 13px;
    }
    .tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .group-title {
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .expand-icon { font-size: 12px; color: var(--text-secondary); }
    .empty-tab { color: var(--text-secondary); }
  `],
})
export class AnalyzeModalComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);
  private archive = inject(ArchiveWindowService);

  private _form = signal<number[]>([]);
  form = this._form.asReadonly();

  loading = signal(false);
  result = signal<LotteryResultResponse | null>(null);
  groups = signal<AnalyzedGroup[]>([]);
  currentTab = signal(1);
  expandedTabs = signal<Set<number>>(new Set([1]));

  groupItems = computed<NumberSetItem[][]>(() => {
    return this.groups().map((g) =>
      g.entries.map((e) => ({ numbers: e.numbers, count: e.count })),
    );
  });

  @Input() set formNumbers(value: number[] | undefined) {
    if (value && value.length > 0) {
      this._form.set(value);
      this.runAnalysis();
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() saveSubGroup = new EventEmitter<NumberSetItem>();

  toggleExpand(size: number): void {
    this.expandedTabs.update((s) => {
      const next = new Set(s);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  }

  /** Switch to a tab and auto-expand it so content shows immediately. */
  selectTab(size: number): void {
    this.currentTab.set(size);
    this.expandedTabs.update((s) => {
      if (s.has(size)) return s;
      const next = new Set(s);
      next.add(size);
      return next;
    });
  }

  private runAnalysis(): void {
    this.loading.set(true);
    const req: AnalyzeRequest = {
      form: this._form(),
      from: this.archive.from(),
      to: this.archive.to(),
    };

    this.api.analyze(req).subscribe({
      next: (res) => {
        this.result.set(res);
        const grouped = groupBySize(res.frequencyGroups, 6, this.lang.lang());
        this.groups.set(grouped);
        this.currentTab.set(1);
        this.expandedTabs.set(new Set([1]));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }

  /** Save a frequency subgroup to saved numbers as a group-calculated item. */
  protected onSaveSubGroup(item: NumberSetItem): void {
    this.api.saveNumbers({
      category: NumbersCategory.GROUP_CALCULATED,
      numbers: item.numbers,
    }).subscribe({
      next: () => this.toast.success(this.lang.t('saved.save')),
      error: (err) => this.toast.error(err.message ?? this.lang.t('common.connectionError')),
    });
    this.saveSubGroup.emit(item);
  }

  /** Re-run analysis in the same modal with the selected subgroup (recursion). */
  protected onAnalyzeSubGroup(item: NumberSetItem): void {
    this._form.set(item.numbers);
    this.runAnalysis();
  }
}
