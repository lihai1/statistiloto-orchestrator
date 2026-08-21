import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <nav class="container">
        <a routerLink="/" class="brand">Statistiloto</a>
        <ul class="nav-links">
          <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a></li>
          <li><a routerLink="/generate" routerLinkActive="active">Generate</a></li>
          <li><a routerLink="/statistics" routerLinkActive="active">Statistics</a></li>
          <li><a routerLink="/analyze" routerLinkActive="active">Analyze</a></li>
          <li><a routerLink="/saved" routerLinkActive="active">Saved</a></li>
        </ul>
        <div class="auth-actions">
          @if (auth.isAuthenticated()) {
            <span class="user-name">{{ auth.username() }}</span>
            <button class="secondary" (click)="auth.logout()">Logout</button>
          } @else {
            <button class="primary" (click)="auth.login()">Login</button>
          }
        </div>
      </nav>
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `,
  styles: [`
    .app-header {
      background: var(--card-bg);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    nav.container {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 12px 20px;
    }
    .brand {
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
    }
    .nav-links {
      display: flex;
      gap: 16px;
      list-style: none;
      margin: 0;
      padding: 0;
      flex: 1;
    }
    .nav-links a { color: var(--text); padding: 6px 4px; }
    .nav-links a.active { color: var(--primary); font-weight: 600; }
    .auth-actions { display: flex; align-items: center; gap: 12px; }
    .user-name { font-size: 14px; color: var(--text-secondary); }
  `],
})
export class AppComponent {
  protected auth = inject(AuthService);
}
