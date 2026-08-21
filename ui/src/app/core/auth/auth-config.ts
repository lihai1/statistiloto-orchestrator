import { InjectionToken } from '@angular/core';

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export const AUTH_CONFIG = new InjectionToken<KeycloakConfig>('AUTH_CONFIG');
