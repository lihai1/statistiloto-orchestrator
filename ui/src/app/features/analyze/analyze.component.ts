import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { AnalyzeRequest, LotteryResultResponse } from '../../shared/models/lottery.models';

@Component({
  selector: 'app-analyze',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>Analyze Your Numbers</h2>
      <p>Enter your selected numbers (comma-separated) to analyze against historical draws.</p>

      <div class="form-row">
        <label for="form">Your numbers</label>
        <input id="form" type="text" [(ngModel)]="formInput" placeholder="1, 2, 3, 4, 5, 6" />
      </div>

      <button class="primary" (click)="analyze()">Analyze</button>

      @if (loading()) { <p>Analyzing...</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (result()?.frequency) {
        <div class="results">
          <h3>Frequency</h3>
          @for (entry of frequencyEntries(); track entry[0]) {
            <div class="freq-row">
              <span>{{ entry[0] }}</span>
              <span>×{{ entry[1] }}</span>
            </div>
          }
        </div>
      }
      @if (result()?.matches?.length) {
        <div class="results">
          <h3>Matching Draws</h3>
          @for (match of result()!.matches; track match.drawId) {
            <div class="match">
              <span>{{ match.drawDate }}</span>
              <span>{{ match.matchedNumbers.join(', ') }}</span>
              <span class="count">{{ match.matchCount }} matches</span>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .form-row { margin: 12px 0; display: flex; flex-direction: column; gap: 4px; max-width: 320px; }
    input { padding: 8px; border: 1px solid var(--border); border-radius: 4px; }
    .freq-row, .match {
      display: flex; justify-content: space-between; padding: 8px 12px;
      border-bottom: 1px solid var(--border);
    }
    .count { color: var(--text-secondary); }
  `],
})
export class AnalyzeComponent {
  private api = inject(ApiService);

  formInput = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<LotteryResultResponse | null>(null);

  frequencyEntries(): [number, number][] {
    const freq = this.result()?.frequency;
    if (!freq) return [];
    return Object.entries(freq).map(([k, v]) => [Number(k), Number(v)]);
  }

  analyze(): void {
    const form = this.formInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (form.length === 0) {
      this.error.set('Please enter at least one number');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const req: AnalyzeRequest = { form };
    this.api.analyze(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Analysis failed');
        this.loading.set(false);
      },
    });
  }
}
