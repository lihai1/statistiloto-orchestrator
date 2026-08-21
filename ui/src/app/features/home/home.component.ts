import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero card">
      <h1>Statistiloto</h1>
      <p>Israeli lottery analysis and number generation based on historical patterns.</p>
      @if (!auth.isAuthenticated()) {
        <button class="primary" (click)="auth.login()">Get Started</button>
      } @else {
        <div class="actions">
          <a routerLink="/generate" class="action-link">Generate Forms</a>
          <a routerLink="/statistics" class="action-link">View Statistics</a>
          <a routerLink="/analyze" class="action-link">Analyze Numbers</a>
          <a routerLink="/saved" class="action-link">My Saved Numbers</a>
        </div>
      }
    </section>
  `,
  styles: [`
    .hero { text-align: center; padding: 48px 24px; }
    h1 { font-size: 32px; margin: 0 0 12px; color: var(--primary); }
    p { color: var(--text-secondary); margin: 0 0 24px; }
    .actions { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
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
}
