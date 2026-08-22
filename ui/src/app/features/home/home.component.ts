import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero card">
      <h1>{{ 'home.title' | translate }}</h1>
      <p>{{ 'home.subtitle' | translate }}</p>
      @if (!auth.isAuthenticated()) {
        <div class="auth-cta">
          <button class="primary" (click)="auth.login()">{{ 'home.cta' | translate }}</button>
          <button class="secondary" (click)="auth.register()">{{ 'auth.register' | translate }}</button>
        </div>
      } @else {
        <div class="actions">
          <a routerLink="/generate" class="action-link">{{ 'home.action.generate' | translate }}</a>
          <a routerLink="/lucky" class="action-link">{{ 'home.action.lucky' | translate }}</a>
          <a routerLink="/statistics" class="action-link">{{ 'home.action.statistics' | translate }}</a>
          <a routerLink="/analyze" class="action-link">{{ 'home.action.analyze' | translate }}</a>
          <a routerLink="/saved" class="action-link">{{ 'home.action.saved' | translate }}</a>
        </div>
      }
    </section>
  `,
  styles: [`
    .hero { text-align: center; padding: 48px 24px; }
    h1 { font-size: 32px; margin: 0 0 12px; color: var(--primary); }
    p { color: var(--text-secondary); margin: 0 0 24px; }
    .actions { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
    .auth-cta { display: flex; gap: 12px; justify-content: center; }
    .action-link {
      padding: 10px 20px;
      border: 1px solid var(--primary);
      border-radius: 6px;
      color: var(--primary);
    }
    .action-link:hover { background: var(--primary); color: white; text-decoration: none; }
  `],
})
export class HomeComponent {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);
}
