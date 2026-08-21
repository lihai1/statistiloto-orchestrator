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
  { path: '**', redirectTo: '' },
];
