import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { GenerateFormRequest, LotteryResultResponse } from '../../shared/models/lottery.models';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>Generate Lottery Forms</h2>
      <p>Generate number combinations based on historical patterns.</p>

      <div class="form-row">
        <label for="howMany">How many numbers</label>
        <input id="howMany" type="number" min="1" max="20" [(ngModel)]="howMany" />
      </div>

      <div class="form-row">
        <label for="formType">Form type</label>
        <select id="formType" [(ngModel)]="formType">
          <option [ngValue]="1">Lotto</option>
          <option [ngValue]="2">Lotto 6</option>
        </select>
      </div>

      <button class="primary" (click)="generate()">Generate</button>

      @if (loading()) {
        <p>Generating...</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (result()?.forms?.length) {
        <div class="results">
          <h3>Generated Forms</h3>
          @for (form of result()!.forms; track form) {
            <div class="form-result">{{ form.join(', ') }}</div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .form-row { margin: 12px 0; display: flex; flex-direction: column; gap: 4px; max-width: 320px; }
    input, select { padding: 8px; border: 1px solid var(--border); border-radius: 4px; }
    .results { margin-top: 24px; }
    .form-result {
      display: inline-block; margin: 4px; padding: 8px 12px;
      background: #e3f2fd; border-radius: 4px; font-weight: 600;
    }
  `],
})
export class GenerateComponent {
  private api = inject(ApiService);

  howMany = 6;
  formType = 1;
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<LotteryResultResponse | null>(null);

  generate(): void {
    this.loading.set(true);
    this.error.set(null);
    const req: GenerateFormRequest = { howMany: this.howMany, formType: this.formType };
    this.api.generateForm(req).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Generation failed');
        this.loading.set(false);
      },
    });
  }
}
