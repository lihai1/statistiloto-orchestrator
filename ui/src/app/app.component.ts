import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { LanguageService } from './core/i18n/language.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';
import { ToastOverlayComponent } from './shared/components/toast/toast-overlay.component';
import { SideMenuComponent } from './shared/components/side-menu/side-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    ToastOverlayComponent,
    SideMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <nav class="container">
        <button class="menu-btn" (click)="menuOpen.set(true)" aria-label="menu">
          <span class="hamburger"></span>
          <span class="hamburger"></span>
          <span class="hamburger"></span>
        </button>
        <a routerLink="/" class="brand">{{ 'app.title' | translate }}</a>
        <ul class="nav-links">
          <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ 'nav.home' | translate }}</a></li>
          <li><a routerLink="/generate" routerLinkActive="active">{{ 'nav.generate' | translate }}</a></li>
          <li><a routerLink="/lucky" routerLinkActive="active">{{ 'nav.lucky' | translate }}</a></li>
          <li><a routerLink="/statistics" routerLinkActive="active">{{ 'nav.statistics' | translate }}</a></li>
          <li><a routerLink="/analyze" routerLinkActive="active">{{ 'nav.analyze' | translate }}</a></li>
          <li><a routerLink="/saved" routerLinkActive="active">{{ 'nav.saved' | translate }}</a></li>
        </ul>
        <div class="auth-actions">
          <button class="lang-toggle" (click)="lang.toggle()">{{ 'lang.toggle' | translate }}</button>
          @if (auth.isAuthenticated()) {
            <span class="user-name">{{ auth.username() }}</span>
            <button class="secondary" (click)="auth.logout()">{{ 'auth.logout' | translate }}</button>
          } @else {
            <button class="primary" (click)="auth.login()">{{ 'auth.login' | translate }}</button>
            <button class="secondary" (click)="auth.register()">{{ 'auth.register' | translate }}</button>
          }
        </div>
      </nav>
    </header>
    <main class="container">
      <router-outlet />
    </main>
    <app-toast-overlay />
    <app-side-menu
      [open]="menuOpen()"
      (close)="menuOpen.set(false)"
      (navigate)="menuOpen.set(false)"
    />
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
    .menu-btn {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: transparent;
      border: none;
      padding: 6px 4px;
      cursor: pointer;
    }
    .hamburger {
      display: block;
      width: 22px;
      height: 2px;
      background: var(--text);
      border-radius: 1px;
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
    .lang-toggle {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      font-weight: 700;
      padding: 4px 10px;
      font-size: 13px;
    }
    @media (max-width: 768px) {
      .nav-links { display: none; }
    }
  `],
})
export class AppComponent {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);
  menuOpen = signal(false);
}
