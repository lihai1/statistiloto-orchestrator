import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api/api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ArchiveWindowService } from '../../shared/services/archive-window.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ArchiveWindowComponent } from '../../shared/components/archive-window/archive-window.component';
import { LotteryBallComponent } from '../../shared/components/lottery-ball/lottery-ball.component';
import { AnalyzeModalComponent } from '../../shared/components/analyze-modal/analyze-modal.component';
import {
  NumberSetListComponent,
  NumberSetItem,
} from '../../shared/components/number-set-list/number-set-list.component';
import {
  AnalyzeRequest,
  LotteryResultResponse,
  NumbersCategory,
} from '../../shared/models/lottery.models';
import { AnalyzedGroup, groupBySize } from '../../shared/utils/arrays-filter';

@Component({
  selector: 'app-analyze',
  standalone: true,
  imports: [
    TranslatePipe,
    ArchiveWindowComponent,
    LotteryBallComponent,
    AnalyzeModalComponent,
    NumberSetListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>{{ 'analyze.title' | translate }}</h2>
      <p>{{ 'analyze.subtitle' | translate }}</p>

      <app-archive-window />

      @if (selected().length > 0) {
        <div class="selected-section">
          <span class="label">{{ 'analyze.selected' | translate }}</span>
          <div class="selected-balls">
            @for (num of selected(); track num; let i = $index) {
              <app-lottery-ball
                [number]="num"
                variant="strong"
                size="md"
                (click)="removeNumber(i)"
              />
            }
          </div>
          <button class="secondary clear-btn" (click)="clearSelection()">
            {{ 'analyze.clear' | translate }}
          </button>
        </div>
      }

      <div class="pick-grid">
        @for (num of choices(); track num) {
          <app-lottery-ball
            [number]="num"
            variant="muted"
            size="md"
            (click)="addNumber(num)"
          />
        }
      </div>

      <button class="primary" (click)="analyze()" [disabled]="selected().length === 0">
        {{ 'analyze.button' | translate }}
      </button>

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
                      (analyze)="onAnalyzeEntry($event)"
                      (save)="onSaveEntry($event)"
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
    </section>

    @if (modalOpen()) {
      <app-analyze-modal
        [formNumbers]="modalForm()"
        (close)="modalOpen.set(false)"
        (saveSubGroup)="onSaveEntry($event)"
      />
    }
  `,
  styles: [`
    .selected-section {
      margin: 16px 0;
      padding: 12px;
      background: var(--bg);
      border-radius: 6px;
    }
    .label { font-size: 14px; color: var(--text-secondary); display: block; margin-bottom: 8px; }
    .selected-balls { display: flex; gap: 6px; flex-wrap: wrap; }
    .selected-balls app-lottery-ball { cursor: pointer; }
    .clear-btn { margin-top: 10px; font-size: 12px; padding: 4px 12px; }
    .pick-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
      max-width: 500px;
    }
    .pick-grid app-lottery-ball { cursor: pointer; }
    .results { margin-top: 24px; }
    .results h3 { font-size: 15px; }
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
export class AnalyzeComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);
  private archive = inject(ArchiveWindowService);

  private readonly _selected = signal<number[]>([]);
  readonly selected = computed(() => this._selected());

  readonly choices = computed(() => {
    const selected = new Set(this._selected());
    const all: number[] = [];
    for (let i = 1; i <= 37; i++) {
      if (!selected.has(i)) all.push(i);
    }
    return all;
  });

  result = signal<LotteryResultResponse | null>(null);
  groups = signal<AnalyzedGroup[]>([]);
  currentTab = signal(1);
  expandedTabs = signal<Set<number>>(new Set([1]));

  groupItems = computed<NumberSetItem[][]>(() => {
    return this.groups().map((g) =>
      g.entries.map((e) => ({ numbers: e.numbers, count: e.count })),
    );
  });

  modalOpen = signal(false);
  modalForm = signal<number[]>([]);

  /** Bound from the ?form= query param (via withComponentInputBinding). */
  @Input() set form(value: string | undefined) {
    if (value) {
      const nums = value
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      this._selected.set(nums);
      this.analyze();
    }
  }

  addNumber(n: number): void {
    this._selected.update((arr) => [...arr, n].sort((a, b) => a - b));
  }

  removeNumber(i: number): void {
    this._selected.update((arr) => arr.filter((_, idx) => idx !== i));
  }

  clearSelection(): void {
    this._selected.set([]);
    this.result.set(null);
  }

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

  analyze(): void {
    const formNums = this._selected();
    if (formNums.length === 0) {
      this.toast.info(this.lang.t('analyze.empty'));
      return;
    }

    this.toast.showLoading();
    const req: AnalyzeRequest = {
      form: formNums,
      from: this.archive.from(),
      to: this.archive.to(),
    };

    this.api.analyze(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.groups.set(groupBySize(res.frequencyGroups, 6, this.lang.lang()));
        this.currentTab.set(1);
        this.expandedTabs.set(new Set([1]));
        this.toast.hideLoading();
      },
      error: (err) => {
        this.toast.hideLoading();
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }

  /** Open the analyze modal with the given form (used by parent components). */
  openModal(form: number[]): void {
    this.modalForm.set(form);
    this.modalOpen.set(true);
  }

  /** Save a frequency entry to saved numbers as a group-calculated item. */
  onSaveEntry(item: NumberSetItem): void {
    this.api.saveNumbers({
      category: NumbersCategory.GROUP_CALCULATED,
      numbers: item.numbers,
    }).subscribe({
      next: () => this.toast.success(this.lang.t('saved.save')),
      error: (err) => this.toast.error(err.message ?? this.lang.t('common.connectionError')),
    });
  }

  /** Open the analyze modal with a frequency entry's numbers (recursion). */
  onAnalyzeEntry(item: NumberSetItem): void {
    this.openModal(item.numbers);
  }
}
