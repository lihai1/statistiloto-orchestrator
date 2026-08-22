import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ArchiveWindowService } from '../../shared/services/archive-window.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ArchiveWindowComponent } from '../../shared/components/archive-window/archive-window.component';
import {
  NumberSetListComponent,
  NumberSetItem,
} from '../../shared/components/number-set-list/number-set-list.component';
import { AnalyzeModalComponent } from '../../shared/components/analyze-modal/analyze-modal.component';
import {
  GenerateFormRequest,
  LotteryResultResponse,
  NumbersCategory,
  SavedNumbersResponse,
} from '../../shared/models/lottery.models';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ArchiveWindowComponent,
    NumberSetListComponent,
    AnalyzeModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>{{ 'generate.title' | translate }}</h2>
      <p>{{ 'generate.subtitle' | translate }}</p>

      <app-archive-window />

      <div class="form-grid">
        <div class="form-row">
          <label for="formType">{{ 'generate.formType' | translate }}</label>
          <select id="formType" [(ngModel)]="formType">
            @for (t of formTypes; track t) {
              <option [ngValue]="t">{{ t === 6 ? ('generate.formType.regular' | translate) : t }}</option>
            }
          </select>
        </div>

        <div class="form-row">
          <label for="howMany">{{ 'generate.howMany' | translate }}</label>
          <input id="howMany" type="number" min="1" max="20" [(ngModel)]="howMany" />
        </div>

        <div class="form-row">
          <label for="strength">{{ 'generate.strength' | translate }}</label>
          <select id="strength" [(ngModel)]="strength">
            <option value="strong">{{ 'generate.strength.strong' | translate }}</option>
            <option value="weak">{{ 'generate.strength.weak' | translate }}</option>
          </select>
        </div>
      </div>

      @if (luckySets().length > 0) {
        <div class="lucky-picker">
          <span class="label">{{ 'generate.includeLucky' | translate }}</span>
          <div class="lucky-cards">
            <button
              type="button"
              class="lucky-card"
              [class.selected]="!includeLucky"
              (click)="selectLucky(null)"
            >
              <span class="card-label">{{ 'generate.noLucky' | translate }}</span>
            </button>
            @for (s of luckySets(); track s.id) {
              <button
                type="button"
                class="lucky-card"
                [class.selected]="includeLucky && selectedLuckyId === s.id"
                (click)="selectLucky(s.id)"
              >
                @for (num of s.numbers; track num) {
                  <span class="mini-ball">{{ num }}</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <button class="primary" (click)="generate()">{{ 'generate.button' | translate }}</button>

      @if (result()?.forms?.length) {
        <div class="results">
          <h3>{{ 'generate.results' | translate }}</h3>
          <app-number-set-list
            [items]="formItems()"
            [showAnalyze]="true"
            [showSave]="true"
            [showDelete]="false"
            (analyze)="onAnalyzeForm($event)"
            (save)="onSaveForm($event)"
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
    .form-grid { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
    .form-row { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
    .form-row label { font-size: 13px; color: var(--text-secondary); }
    input, select { padding: 8px; border: 1px solid var(--border); border-radius: 4px; }
    .results { margin-top: 24px; }
    .lucky-picker { margin: 16px 0; }
    .lucky-picker .label { font-size: 14px; color: var(--text-secondary); display: block; margin-bottom: 8px; }
    .lucky-cards { display: flex; gap: 8px; flex-wrap: wrap; }
    .lucky-card {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border: 2px solid var(--border);
      border-radius: 8px;
      background: var(--card-bg);
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .lucky-card.selected {
      border-color: var(--primary);
      background: rgba(25, 118, 210, 0.08);
    }
    .lucky-card:hover { border-color: var(--primary); }
    .card-label { font-size: 13px; color: var(--text-secondary); }
    .mini-ball {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
  `],
})
export class GenerateComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);
  private archive = inject(ArchiveWindowService);

  formTypes = [6, 7, 8, 9, 10, 11, 12];
  formType = 6;
  howMany = 10;
  strength: 'strong' | 'weak' = 'strong';
  includeLucky = false;
  selectedLuckyId: number | null = null;

  result = signal<LotteryResultResponse | null>(null);
  luckySets = signal<SavedNumbersResponse[]>([]);
  formItems = signal<NumberSetItem[]>([]);

  modalOpen = signal(false);
  modalForm = signal<number[]>([]);

  constructor() {
    this.loadLuckySets();
  }

  private loadLuckySets() {
    this.api.getSavedNumbers().subscribe({
      next: (res) => {
        const lucky = res.filter((s) => s.category === NumbersCategory.LUCKY);
        this.luckySets.set(lucky);
        if (lucky.length > 0) {
          this.selectedLuckyId = lucky[0].id;
        }
      },
      error: () => {}, // silently ignore — user may not have saved lucky numbers yet
    });
  }

  generate(): void {
    this.toast.showLoading();
    const willBe = this.includeLucky
      ? this.luckySets().find((s) => s.id === this.selectedLuckyId)?.numbers ?? []
      : [];

    const req: GenerateFormRequest = {
      howMany: this.howMany,
      formType: this.formType,
      willBe,
      from: this.archive.from(),
      to: this.archive.to(),
      strength: this.strength,
    };

    this.api.generateForm(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.formItems.set(
          (res.forms ?? []).map((numbers) => {
            // The backend appends the strong number as the last element.
            // Split it out so NumberSetComponent renders it in the strong variant.
            if (numbers.length > this.formType) {
              const strong = numbers[numbers.length - 1];
              return { numbers: numbers.slice(0, -1), strong: [strong] };
            }
            return { numbers };
          }),
        );
        this.toast.hideLoading();
      },
      error: (err) => {
        this.toast.hideLoading();
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }

  onSaveForm(item: NumberSetItem): void {
    this.api
      .saveNumbers({
        category: NumbersCategory.USER_GENERATED,
        numbers: item.numbers,
        dateFrom: this.archive.from(),
        dateTo: this.archive.to(),
      })
      .subscribe({
        next: () => this.toast.success(this.lang.t('lucky.saved')),
        error: (err) => this.toast.error(err.message ?? this.lang.t('common.error')),
      });
  }

  onAnalyzeForm(item: NumberSetItem): void {
    this.modalForm.set(item.numbers);
    this.modalOpen.set(true);
  }

  /** Select a lucky set (or null for no lucky numbers). */
  selectLucky(id: number | null): void {
    if (id === null) {
      this.includeLucky = false;
      this.selectedLuckyId = null;
    } else {
      this.includeLucky = true;
      this.selectedLuckyId = id;
    }
  }
}
