import { EnvironmentProviders, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../../environments/environment';

export namespace ServiceWorker {
  export function registerProvider(): EnvironmentProviders {
    return provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    });
  }
}
