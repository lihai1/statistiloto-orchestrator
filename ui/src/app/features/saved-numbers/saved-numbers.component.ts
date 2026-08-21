import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api/api.service';
import { SavedNumbersResponse } from '../../shared/models/lottery.models';

@Component({
  selector: 'app-saved-numbers',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>Saved Numbers</h2>
      <p>Your saved lottery number sets.</p>

      @if (loading()) { <p>Loading...</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (numbers().length === 0 && !loading()) {
        <p class="empty">No saved numbers yet. Generate a form and save it!</p>
      }

      @for (item of numbers(); track item.id) {
        <div class="saved-item">
          <div class="info">
            <span class="category">{{ item.category }}</span>
            <span class="nums">{{ item.numbers.join(', ') }}</span>
            @if (item.willBe?.length) {
              <span class="will-be">+ {{ item.willBe!.join(', ') }}</span>
            }
          </div>
          <button class="secondary" (click)="delete(item.id)">Delete</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .saved-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; border-bottom: 1px solid var(--border);
    }
    .info { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .category {
      background: #e3f2fd; padding: 2px 8px; border-radius: 4px;
      font-size: 12px; font-weight: 600;
    }
    .nums { font-weight: 600; }
    .will-be { color: var(--text-secondary); }
    .empty { color: var(--text-secondary); }
  `],
})
export class SavedNumbersComponent {
  private api = inject(ApiService);

  loading = signal(false);
  error = signal<string | null>(null);
  numbers = signal<SavedNumbersResponse[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getSavedNumbers().subscribe({
      next: (res) => {
        this.numbers.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to load saved numbers');
        this.loading.set(false);
      },
    });
  }

  delete(id: number): void {
    this.api.deleteNumbers(id).subscribe({
      next: () => this.numbers.update((list) => list.filter((n) => n.id !== id)),
      error: (err) => this.error.set(err.message ?? 'Failed to delete'),
    });
  }
}
