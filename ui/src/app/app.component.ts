import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { LanguageService } from './core/i18n/language.service';
import { ThemeService } from './core/theme/theme.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';
import { ToastOverlayComponent } from './shared/components/toast/toast-overlay.component';
import { AgentWidgetComponent } from './shared/components/agent-widget/agent-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    ToastOverlayComponent,
    AgentWidgetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-layout">
      <!-- Scrim for mobile sidebar overlay -->
      @if (sidebarOpen() && isMobile()) {
        <div class="sidebar-scrim" (click)="toggleSidebar()"></div>
      }

      <!-- Sidebar (desktop: fixed, mobile: overlay when opened) -->
      <aside class="app-sidebar" [class.open]="sidebarOpen()" [class.collapsed]="!sidebarOpen() && !isMobile()">
        <div class="sidebar-header">
          <a routerLink="/" class="sidebar-brand">{{ 'app.title' | translate }}</a>
        </div>

        <nav class="sidebar-nav">
          <span class="sidebar-section-label">{{ 'menu.navigation' | translate }}</span>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <i class="pi pi-home"></i> {{ 'nav.home' | translate }}
          </a>
          <a routerLink="/generate" routerLinkActive="active">
            <i class="pi pi-bolt"></i> {{ 'nav.generate' | translate }}
          </a>
          <a routerLink="/lucky" routerLinkActive="active">
            <i class="pi pi-star"></i> {{ 'nav.lucky' | translate }}
          </a>
          <a routerLink="/statistics" routerLinkActive="active">
            <i class="pi pi-chart-bar"></i> {{ 'nav.statistics' | translate }}
          </a>
          <a routerLink="/analyze" routerLinkActive="active">
            <i class="pi pi-search"></i> {{ 'nav.analyze' | translate }}
          </a>
          <a routerLink="/saved" routerLinkActive="active">
            <i class="pi pi-bookmark"></i> {{ 'nav.saved' | translate }}
          </a>

          <span class="sidebar-section-label">{{ 'menu.ai' | translate }}</span>
          <a routerLink="/assistant" routerLinkActive="active">
            <i class="pi pi-comments"></i> {{ 'nav.assistant' | translate }}
          </a>

          @if (auth.isAdmin()) {
            <span class="sidebar-section-label">{{ 'menu.admin' | translate }}</span>
            <a routerLink="/admin/llm-config" routerLinkActive="active">
              <i class="pi pi-cog"></i> {{ 'nav.llmConfig' | translate }}
            </a>
            <a routerLink="/admin/token-usage" routerLinkActive="active">
              <i class="pi pi-database"></i> {{ 'nav.tokenUsage' | translate }}
            </a>
            <a routerLink="/admin/audit-log" routerLinkActive="active">
              <i class="pi pi-list"></i> {{ 'nav.auditLog' | translate }}
            </a>
            <a routerLink="/admin/scraper" routerLinkActive="active">
              <i class="pi pi-sync"></i> {{ 'nav.scraper' | translate }}
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          @if (auth.isAuthenticated()) {
            <div class="user-info">
              <i class="pi pi-user"></i>
              <span>{{ auth.username() }}</span>
            </div>
            <div class="footer-actions">
              <button class="secondary" (click)="auth.logout()">{{ 'auth.logout' | translate }}</button>
            </div>
          } @else {
            <div class="footer-actions">
              <button class="primary" (click)="auth.login()">{{ 'auth.login' | translate }}</button>
              <button class="secondary" (click)="auth.register()">{{ 'auth.register' | translate }}</button>
            </div>
          }
        </div>
      </aside>

      <!-- Main content area -->
      <div class="app-main" [class.sidebar-collapsed]="!sidebarOpen() && !isMobile()">
        <header class="app-header">
          <button class="menu-toggle" (click)="toggleSidebar()" aria-label="menu">
            <i class="pi pi-bars"></i>
          </button>
          <span class="header-spacer"></span>
          <div class="header-actions">
            <button class="theme-toggle" (click)="theme.toggle()" aria-label="toggle dark mode">
              <i class="pi" [class.pi-sun]="theme.isDark()" [class.pi-moon]="!theme.isDark()"></i>
            </button>
            <button class="lang-toggle" (click)="lang.toggle()">{{ 'lang.toggle' | translate }}</button>
          </div>
        </header>

        <main class="app-content">
          <router-outlet />
        </main>
      </div>

      <!-- Bottom tab bar (mobile only) -->
      <nav class="bottom-tabs">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <i class="pi pi-home"></i>{{ 'nav.home' | translate }}
        </a>
        <a routerLink="/generate" routerLinkActive="active">
          <i class="pi pi-bolt"></i>{{ 'nav.generate' | translate }}
        </a>
        <a routerLink="/assistant" routerLinkActive="active">
          <i class="pi pi-comments"></i>{{ 'nav.assistant' | translate }}
        </a>
        <a routerLink="/statistics" routerLinkActive="active">
          <i class="pi pi-chart-bar"></i>{{ 'nav.statistics' | translate }}
        </a>
        @if (auth.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="active">
            <i class="pi pi-cog"></i>{{ 'nav.admin' | translate }}
          </a>
        } @else {
          <a routerLink="/saved" routerLinkActive="active">
            <i class="pi pi-bookmark"></i>{{ 'nav.saved' | translate }}
          </a>
        }
      </nav>

      <!-- Floating AI widget -->
      @if (auth.isAuthenticated()) {
        <app-agent-widget />
      }

      <!-- Toast overlay -->
      <app-toast-overlay />
    </div>
  `,
})
export class AppComponent {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);
  protected theme = inject(ThemeService);

  sidebarOpen = signal(typeof window !== 'undefined' && window.innerWidth > 768);

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }
}
