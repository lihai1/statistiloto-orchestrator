import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

/**
 * Translate pipe: `{{ 'key' | translate }}` or `{{ 'key' | translate: { count: 5 } }}`.
 * Reads the current language from LanguageService reactively.
 *
 * Marked `pure: false` so it re-evaluates whenever change detection runs.
 * This is required because the pipe input (the key string) does not change
 * when the user toggles language — only the LanguageService signal does.
 * Without `pure: false`, already-rendered translations would stay in the
 * previous language after a toggle (only dir/lang attributes would update).
 */
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private lang = inject(LanguageService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.lang.t(key, params);
  }
}
