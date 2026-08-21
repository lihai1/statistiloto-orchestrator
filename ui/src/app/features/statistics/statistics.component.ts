import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { LotteryResultResponse, StatisticsRequest } from '../../shared/models/lottery.models';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>Statistics</h2>
      <p>Calculate frequent pairs and groups from historical draws.</p>

      <div class="form-row">
        <label for="howMany">How many pairs</label>
        <input id="howMany" type="number" min="1" max="50" [(ngModel)]="howMany" />
      </div>

      <div class="form-row">
        <label for="strength">Strength</label>
        <select id="strength" [(ngModel)]="strength">
          <option value="strong">Strong</option>
          <option value="weak">Weak</option>
        </select>
      </div>

      <button class="primary" (click)="load()">Calculate</button>

      @if (loading()) { <p>Calculating...</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (result()?.pairs?.length) {
        <div class="results">
          <h3>Frequent Pairs</h3>
          @for (pair of result()!.pairs; track pair) {
            <div class="pair">
              <span class="numbers">{{ pair.numbers.join(', ') }}</span>
              <span class="count">×{{ pair.count }}</span>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .form-row { margin: 12px 0; display: flex; flex-direction: column; gap: 4px; max-width: 320px; }
    input, select { padding: 8px; border: 1px solid var(--border); border-radius: 4px; }
    .pair {
      display: flex; justify-content: space-between; padding: 8px 12px;
      border-bottom: 1px solid var(--border);
    }
    .numbers { font-weight: 600; }
    .count { color: var(--text-secondary); }
  `],
})
export class StatisticsComponent {
  private api = inject(ApiService);

  howMany = 10;
  strength: 'strong' | 'weak' = 'strong';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<LotteryResultResponse | null>(null);

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const req: StatisticsRequest = { howMany: this.howMany, strength: this.strength };
    this.api.getStatistics(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Statistics failed');
        this.loading.set(false);
      },
    });
  }
}
