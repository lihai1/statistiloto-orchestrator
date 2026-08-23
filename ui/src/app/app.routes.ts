import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'Statistiloto',
  },
  {
    path: 'generate',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/generate/generate.component').then(
        (m) => m.GenerateComponent,
      ),
    title: 'Generate Forms',
  },
  {
    path: 'lucky',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lucky/lucky.component').then((m) => m.LuckyComponent),
    title: 'Lucky Numbers',
  },
  {
    path: 'statistics',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/statistics/statistics.component').then(
        (m) => m.StatisticsComponent,
      ),
    title: 'Statistics',
  },
  {
    path: 'analyze',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/analyze/analyze.component').then(
        (m) => m.AnalyzeComponent,
      ),
    title: 'Analyze',
  },
  {
    path: 'saved',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/saved-numbers/saved-numbers.component').then(
        (m) => m.SavedNumbersComponent,
      ),
    title: 'Saved Numbers',
  },
  {
    path: 'assistant',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/assistant/assistant.component').then(
        (m) => m.AssistantComponent,
      ),
    title: 'AI Assistant',
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then(
        (m) => m.AdminComponent,
      ),
    title: 'Admin',
    children: [
      {
        path: 'llm-config',
        loadComponent: () =>
          import('./features/admin/llm-config/llm-config.component').then(
            (m) => m.LlmConfigComponent,
          ),
        title: 'LLM Configuration',
      },
      {
        path: 'token-usage',
        loadComponent: () =>
          import('./features/admin/token-usage/token-usage.component').then(
            (m) => m.TokenUsageComponent,
          ),
        title: 'Token Usage',
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./features/admin/audit-log/audit-log.component').then(
            (m) => m.AuditLogComponent,
          ),
        title: 'Audit Log',
      },
      {
        path: 'scraper',
        loadComponent: () =>
          import('./features/admin/scraper/scraper.component').then(
            (m) => m.ScraperComponent,
          ),
        title: 'Scraper Control',
      },
      {
        path: '',
        redirectTo: 'llm-config',
        pathMatch: 'full',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
