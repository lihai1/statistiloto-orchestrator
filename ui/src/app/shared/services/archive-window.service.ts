import { Injectable, computed, signal } from '@angular/core';

/**
 * Shared archive date-range state. All computation features
 * (generate, statistics, analyze) use the same window so the user
 * doesn't have to re-set it on each page.
 *
 * Defaults mirror the legacy app: from = 2004-02-12, to = today.
 */
@Injectable({ providedIn: 'root' })
export class ArchiveWindowService {
  private readonly _from = signal<string>(this.defaultFrom());
  private readonly _to = signal<string>(this.defaultTo());

  readonly from = computed(() => this._from());
  readonly to = computed(() => this._to());

  setFrom(date: string): void {
    this._from.set(date);
  }

  setTo(date: string): void {
    this._to.set(date);
  }

  private defaultFrom(): string {
    // Legacy default: 12/02/2004
    return '2004-02-12';
  }

  private defaultTo(): string {
    return new Date().toISOString().split('T')[0];
  }
}
