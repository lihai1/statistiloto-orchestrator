import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api/api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
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
  selector: 'app-saved-numbers',
  standalone: true,
  imports: [TranslatePipe, NumberSetListComponent, AnalyzeModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>{{ 'saved.title' | translate }}</h2>
      <p>{{ 'saved.subtitle' | translate }}</p>

      @if (loading()) {
        <p>{{ 'saved.loading' | translate }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (allEmpty() && !loading()) {
        <p class="empty">{{ 'saved.empty' | translate }}</p>
      }

      @if (forms().length > 0) {
        <div class="group">
          <h3 class="group-header">
            {{ 'saved.forms' | translate }} <span class="count">{{ forms().length }}</span>
          </h3>
          <app-number-set-list
            [items]="forms()"
            [showAnalyze]="true"
            [showSave]="false"
            [showDelete]="true"
            (analyze)="onAnalyze($event)"
            (delete)="onDelete($event)"
          />
        </div>
      }

      @if (groups().length > 0) {
        <div class="group">
          <h3 class="group-header">
            {{ 'saved.groups' | translate }} <span class="count">{{ groups().length }}</span>
          </h3>
          <app-number-set-list
            [items]="groups()"
            [showAnalyze]="true"
            [showSave]="false"
            [showDelete]="true"
            (analyze)="onAnalyze($event)"
            (delete)="onDelete($event)"
          />
        </div>
      }

      @if (lucky().length > 0) {
        <div class="group">
          <h3 class="group-header">
            {{ 'saved.lucky' | translate }} <span class="count">{{ lucky().length }}</span>
          </h3>
          <app-number-set-list
            [items]="lucky()"
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
    .group { margin-top: 20px; }
    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      margin: 0 0 12px;
    }
    .count {
      background: var(--primary);
      color: #fff;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 13px;
    }
    .empty { color: var(--text-secondary); }
  `],
})
export class SavedNumbersComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);

  loading = signal(false);
  error = signal<string | null>(null);
  forms = signal<NumberSetItem[]>([]);
  groups = signal<NumberSetItem[]>([]);
  lucky = signal<NumberSetItem[]>([]);

  modalOpen = signal(false);
  modalForm = signal<number[]>([]);

  allEmpty() {
    return this.forms().length === 0 && this.groups().length === 0 && this.lucky().length === 0;
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getSavedNumbers().subscribe({
      next: (res) => {
        const forms = res
          .filter((s) => s.category === NumbersCategory.USER_GENERATED)
          .map((s) => this.toItem(s));
        const groups = res
          .filter((s) => s.category === NumbersCategory.GROUP_CALCULATED)
          .map((s) => this.toItem(s));
        const lucky = res
          .filter((s) => s.category === NumbersCategory.LUCKY)
          .map((s) => this.toItem(s));
        this.forms.set(forms);
        this.groups.set(groups);
        this.lucky.set(lucky);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? this.lang.t('common.error'));
        this.loading.set(false);
      },
    });
  }

  onAnalyze(item: NumberSetItem): void {
    // Open the analyze modal inline (recursion component) instead of navigating.
    this.modalForm.set(item.numbers);
    this.modalOpen.set(true);
  }

  onDelete(item: NumberSetItem): void {
    if (item.id == null) return;
    this.api.deleteNumbers(item.id).subscribe({
      next: () => {
        this.forms.update((l) => l.filter((s) => s.id !== item.id));
        this.groups.update((l) => l.filter((s) => s.id !== item.id));
        this.lucky.update((l) => l.filter((s) => s.id !== item.id));
      },
      error: (err) => this.toast.error(err.message ?? this.lang.t('common.error')),
    });
  }

  private toItem(s: SavedNumbersResponse): NumberSetItem {
    return {
      id: s.id,
      numbers: s.numbers,
      strong: s.willBe,
      category: s.category,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      createdAt: s.createdAt,
    };
  }
}
