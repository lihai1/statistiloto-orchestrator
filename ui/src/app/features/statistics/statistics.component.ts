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
  LotteryResultResponse,
  StatisticsRequest,
} from '../../shared/models/lottery.models';

@Component({
  selector: 'app-statistics',
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
      <h2>{{ 'stats.title' | translate }}</h2>
      <p>{{ 'stats.subtitle' | translate }}</p>

      <app-archive-window />

      <div class="form-grid">
        <div class="form-row">
          <label for="groupSize">{{ 'stats.groupSize' | translate }}</label>
          <select id="groupSize" [(ngModel)]="groupSize">
            @for (g of groupSizes; track g) {
              <option [ngValue]="g">{{ g }}</option>
            }
          </select>
        </div>

        <div class="form-row">
          <label for="howMany">{{ 'stats.howMany' | translate }}</label>
          <input id="howMany" type="number" min="1" max="50" [(ngModel)]="howMany" />
        </div>

        <div class="form-row">
          <label for="strength">{{ 'stats.strength' | translate }}</label>
          <select id="strength" [(ngModel)]="strength">
            <option value="strong">{{ 'generate.strength.strong' | translate }}</option>
            <option value="weak">{{ 'generate.strength.weak' | translate }}</option>
          </select>
        </div>
      </div>

      <button class="primary" (click)="load()">{{ 'stats.button' | translate }}</button>

      @if (result()?.pairs?.length) {
        <div class="results">
          <h3>{{ 'stats.results' | translate }}</h3>
          <app-number-set-list
            [items]="pairItems()"
            [showAnalyze]="true"
            [showSave]="false"
            [showDelete]="false"
            (analyze)="onAnalyze($event)"
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
  `],
})
export class StatisticsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);
  private archive = inject(ArchiveWindowService);

  groupSizes = [1, 2, 3, 4, 5, 6];
  groupSize = 2;
  howMany = 10;
  strength: 'strong' | 'weak' = 'strong';

  result = signal<LotteryResultResponse | null>(null);
  pairItems = signal<NumberSetItem[]>([]);

  modalOpen = signal(false);
  modalForm = signal<number[]>([]);

  load(): void {
    this.toast.showLoading();
    const req: StatisticsRequest = {
      howMany: this.howMany,
      formType: this.groupSize,
      from: this.archive.from(),
      to: this.archive.to(),
      strength: this.strength,
    };

    this.api.getStatistics(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.pairItems.set(
          (res.pairs ?? []).map((p) => ({
            numbers: p.numbers,
            count: p.count,
          })),
        );
        this.toast.hideLoading();
      },
      error: (err) => {
        this.toast.hideLoading();
        this.toast.error(err.message ?? this.lang.t('common.connectionError'));
      },
    });
  }

  onAnalyze(item: NumberSetItem): void {
    this.modalForm.set(item.numbers);
    this.modalOpen.set(true);
  }
}
