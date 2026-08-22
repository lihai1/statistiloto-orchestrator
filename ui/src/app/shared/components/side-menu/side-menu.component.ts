import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ArchiveWindowService } from '../../services/archive-window.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ArchiveWindowComponent } from '../archive-window/archive-window.component';

/**
 * Slide-out side drawer menu — modern adaptation of the legacy Ionic
 * `menu.component`.
 *
 * Contains:
 *  - Navigation links (home, generate, lucky, statistics, analyze, saved)
 *  - Archive date-range controls (shared via ArchiveWindowService)
 *  - Auth actions (login / logout / register)
 *  - Language toggle
 *
 * The drawer is toggled via the `open` input and emits `navigate` when a
 * link is clicked so the parent can close it.
 */
@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    ArchiveWindowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="scrim" (click)="close.emit()"></div>
    }
    <aside class="drawer" [class.open]="open" [class.rtl]="lang.isRtl()">
      <div class="drawer-header">
        <span class="drawer-title">{{ 'app.title' | translate }}</span>
        <button class="close-btn" (click)="close.emit()" aria-label="close">✕</button>
      </div>

      <nav class="drawer-nav" (click)="navigate.emit()">
        <span class="section-label">{{ 'menu.navigation' | translate }}</span>
        <a routerLink="/" routerLinkActive="active-link" [routerLinkActiveOptions]="{ exact: true }">
          {{ 'nav.home' | translate }}
        </a>
        <a routerLink="/generate" routerLinkActive="active-link">{{ 'nav.generate' | translate }}</a>
        <a routerLink="/lucky" routerLinkActive="active-link">{{ 'nav.lucky' | translate }}</a>
        <a routerLink="/statistics" routerLinkActive="active-link">{{ 'nav.statistics' | translate }}</a>
        <a routerLink="/analyze" routerLinkActive="active-link">{{ 'nav.analyze' | translate }}</a>
        <a routerLink="/saved" routerLinkActive="active-link">{{ 'nav.saved' | translate }}</a>
      </nav>

      <div class="drawer-section">
        <span class="section-label">{{ 'menu.archive' | translate }}</span>
        <app-archive-window />
      </div>

      <div class="drawer-footer">
        <button class="lang-toggle" (click)="lang.toggle()">
          {{ 'lang.toggle' | translate }}
        </button>
        @if (auth.isAuthenticated()) {
          <span class="user-name">{{ auth.username() }}</span>
          <button class="secondary" (click)="auth.logout()">
            {{ 'auth.logout' | translate }}
          </button>
        } @else {
          <button class="primary" (click)="auth.login()">{{ 'auth.login' | translate }}</button>
          <button class="secondary" (click)="auth.register()">{{ 'auth.register' | translate }}</button>
        }
      </div>
    </aside>
  `,
  styles: [`
    .scrim {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 200;
    }
    .drawer {
      position: fixed;
      top: 0;
      bottom: 0;
      width: 300px;
      background: var(--card-bg);
      box-shadow: 2px 0 12px rgba(0,0,0,0.15);
      z-index: 201;
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      overflow-y: auto;
    }
    .drawer.rtl {
      right: 0;
      left: auto;
      transform: translateX(100%);
      box-shadow: -2px 0 12px rgba(0,0,0,0.15);
    }
    .drawer.open { transform: translateX(0); }
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .drawer-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary);
    }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 18px;
      color: var(--text-secondary);
      padding: 4px 8px;
    }
    .drawer-nav {
      display: flex;
      flex-direction: column;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .drawer-nav a {
      padding: 10px 20px;
      color: var(--text);
      font-size: 15px;
    }
    .drawer-nav a:hover { background: var(--bg); }
    .drawer-nav a.active-link {
      color: var(--primary);
      font-weight: 600;
      background: rgba(25, 118, 210, 0.08);
    }
    .drawer-section {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .section-label {
      display: block;
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .drawer-footer {
      margin-top: auto;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      border-top: 1px solid var(--border);
    }
    .user-name { font-size: 14px; color: var(--text-secondary); }
    .lang-toggle {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      font-weight: 700;
      padding: 4px 10px;
      font-size: 13px;
    }
  `],
})
export class SideMenuComponent {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);
  protected archive = inject(ArchiveWindowService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<void>();
}
