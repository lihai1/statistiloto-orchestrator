import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Global toast + loading overlay. Place once in the app shell.
 */
@Component({
  selector: 'app-toast-overlay',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.loading()) {
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>{{ 'common.calculate' | translate }}</span>
      </div>
    }
    @if (toast.toasts().length > 0) {
      <div class="toast-container">
        @for (t of toast.toasts(); track t.id) {
          <div class="toast toast--{{ t.type }}" (click)="toast.dismiss(t.id)">
            {{ t.message }}
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      padding: 16px 24px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 9999;
    }
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .toast-container {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 90vw;
    }
    .toast {
      padding: 10px 20px;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    .toast--info { background: var(--primary, #1976d2); }
    .toast--error { background: var(--danger, #d32f2f); }
    .toast--success { background: var(--success, #388e3c); }
  `],
})
export class ToastOverlayComponent {
  protected toast = inject(ToastService);
}
