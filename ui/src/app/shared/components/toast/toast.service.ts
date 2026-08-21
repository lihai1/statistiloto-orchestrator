import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'info' | 'error' | 'success';
}

/**
 * Lightweight toast + loading overlay service using signals.
 * Ports the legacy "מחשב" loading indicator and error toasts.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  readonly loading = signal(false);

  private nextId = 0;

  showLoading(): void {
    this.loading.set(true);
  }

  hideLoading(): void {
    this.loading.set(false);
  }

  info(message: string, duration = 3000): void {
    this.addToast(message, 'info', duration);
  }

  error(message: string, duration = 5000): void {
    this.addToast(message, 'error', duration);
  }

  success(message: string, duration = 3000): void {
    this.addToast(message, 'success', duration);
  }

  dismiss(id: number): void {
    this.toasts.update((list: Toast[]) => list.filter((t: Toast) => t.id !== id));
  }

  private addToast(message: string, type: Toast['type'], duration: number): void {
    const id = this.nextId++;
    this.toasts.update((list: Toast[]) => [...list, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }
}
