import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

/**
 * Translate pipe: `{{ 'key' | translate }}` or `{{ 'key' | translate: { count: 5 } }}`.
 * Reads the current language from LanguageService reactively.
 */
@Pipe({ name: 'translate', standalone: true })
export class TranslatePipe implements PipeTransform {
  private lang = inject(LanguageService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.lang.t(key, params);
  }
}
