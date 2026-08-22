import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api/api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LotteryBallComponent } from '../../shared/components/lottery-ball/lottery-ball.component';
import {
  NumberSetListComponent,
  NumberSetItem,
} from '../../shared/components/number-set-list/number-set-list.component';
import { AnalyzeModalComponent } from '../../shared/components/analyze-modal/analyze-modal.component';
import {
  NumbersCategory,
  SavedNumbersResponse,
} from '../../shared/models/lottery.models';

@Component({
  selector: 'app-lucky',
  standalone: true,
  imports: [
    TranslatePipe,
    LotteryBallComponent,
    NumberSetListComponent,
    AnalyzeModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>{{ 'lucky.title' | translate }}</h2>
      <p>{{ 'lucky.subtitle' | translate }}</p>

      @if (selected().length > 0) {
        <div class="selected-section">
          <span class="label">{{ 'lucky.selected' | translate }}</span>
          <div class="selected-balls">
            @for (num of selected(); track num; let i = $index) {
              <app-lottery-ball [number]="num" variant="strong" size="md" (click)="removeNumber(i)" />
            }
          </div>
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

      <button class="primary" (click)="save()" [disabled]="selected().length === 0">
        {{ 'lucky.save' | translate }}
      </button>

      @if (savedItems().length > 0) {
        <div class="results">
          <h3>{{ 'lucky.title' | translate }}</h3>
          <app-number-set-list
            [items]="savedItems()"
            [showAnalyze]="true"
            [showSave]="false"
            [showDelete]="true"
            (analyze)="onAnalyze($event)"
            (delete)="onDelete($event)"
          />
        </div>
      }
    </section>

    @if (modalOpen()) {
      <app-analyze-modal
        [formNumbers]="modalForm()"
        (close)="modalOpen.set(false)"
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
    .pick-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
      max-width: 500px;
    }
    .pick-grid app-lottery-ball { cursor: pointer; }
    .results { margin-top: 24px; }
  `],
})
export class LuckyComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);

  private readonly _selected = signal<number[]>([]);
  readonly selected = computed(() => this._selected());

  private readonly _savedItems = signal<NumberSetItem[]>([]);
  readonly savedItems = computed(() => this._savedItems());

  modalOpen = signal(false);
  modalForm = signal<number[]>([]);

  readonly choices = computed(() => {
    const selected = new Set(this._selected());
    const all: number[] = [];
    for (let i = 1; i <= 37; i++) {
      if (!selected.has(i)) all.push(i);
    }
    return all;
  });

  private readonly limit = 8;

  constructor() {
    this.loadSaved();
  }

  addNumber(n: number): void {
    if (this._selected().length >= this.limit) {
      this.toast.info(this.lang.t('lucky.limit'));
      return;
    }
    this._selected.update((arr) => [...arr, n].sort((a, b) => a - b));
  }

  removeNumber(i: number): void {
    this._selected.update((arr) => arr.filter((_, idx) => idx !== i));
  }

  save(): void {
    const numbers = this._selected();
    if (numbers.length === 0) return;

    this.api
      .saveNumbers({ category: NumbersCategory.LUCKY, numbers })
      .subscribe({
        next: () => {
          this.toast.success(this.lang.t('lucky.saved'));
          this._selected.set([]);
          this.loadSaved();
        },
        error: (err) => this.toast.error(err.message ?? this.lang.t('common.error')),
      });
  }

  private loadSaved(): void {
    this.api.getSavedNumbers().subscribe({
      next: (res) => {
        const lucky = res
          .filter((s) => s.category === NumbersCategory.LUCKY)
          .map((s) => this.toItem(s));
        this._savedItems.set(lucky);
      },
      error: () => {},
    });
  }

  protected onDelete(item: NumberSetItem): void {
    if (item.id == null) return;
    this.api.deleteNumbers(item.id).subscribe({
      next: () => {
        this._savedItems.update((list) => list.filter((s) => s.id !== item.id));
      },
      error: (err) => this.toast.error(err.message ?? this.lang.t('common.error')),
    });
  }

  protected onAnalyze(item: NumberSetItem): void {
    this.modalForm.set(item.numbers);
    this.modalOpen.set(true);
  }

  private toItem(s: SavedNumbersResponse): NumberSetItem {
    return {
      id: s.id,
      numbers: s.numbers,
      category: s.category,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      createdAt: s.createdAt,
    };
  }
}
