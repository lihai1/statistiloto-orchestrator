import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArchiveWindowService } from '../../services/archive-window.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Shared archive date-range control. Bound to the ArchiveWindowService
 * so all features share one window.
 */
@Component({
  selector: 'app-archive-window',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="archive-window">
      <div class="form-row">
        <label for="archive-from">{{ 'archive.from' | translate }}</label>
        <input id="archive-from" type="date" [ngModel]="archive.from()" (ngModelChange)="archive.setFrom($event)" />
      </div>
      <div class="form-row">
        <label for="archive-to">{{ 'archive.to' | translate }}</label>
        <input id="archive-to" type="date" [ngModel]="archive.to()" (ngModelChange)="archive.setTo($event)" />
      </div>
    </div>
  `,
  styles: [`
    .archive-window {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .form-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-row label {
      font-size: 13px;
      color: var(--text-secondary);
    }
    input[type="date"] {
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
    }
  `],
})
export class ArchiveWindowComponent {
  protected archive = inject(ArchiveWindowService);
}
