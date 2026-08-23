import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

/**
 * Signal-based dark mode toggle.
 * Adds/removes 'app-dark' class on <html> element to trigger PrimeNG dark mode.
 * Persists preference in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(this.loadInitial());

  readonly mode = computed(() => this._mode());
  readonly isDark = computed(() => this._mode() === 'dark');

  toggle(): void {
    this.setMode(this._mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    this.applyMode(mode);
    localStorage.setItem('statistiloto-theme', mode);
  }

  private loadInitial(): ThemeMode {
    const saved = localStorage.getItem('statistiloto-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyMode(mode: ThemeMode): void {
    const html = document.documentElement;
    if (mode === 'dark') {
      html.classList.add('app-dark');
    } else {
      html.classList.remove('app-dark');
    }
  }

  init(): void {
    this.applyMode(this._mode());
  }
}
