import { Injectable, computed, inject, signal } from '@angular/core';
import Keycloak from 'keycloak-js';
import { AUTH_CONFIG } from './auth-config';

/**
 * Keycloak authentication service.
 *
 * Uses keycloak-js with PKCE (configured in the Keycloak realm). Exposes
 * reactive signals for the authenticated state and the username so that
 * templates can use Angular's native control flow (`@if`).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG);
  private readonly keycloak: Keycloak;

  private readonly _authenticated = signal(false);
  private readonly _username = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this._authenticated());
  readonly username = computed(() => this._username());

  constructor() {
    this.keycloak = new Keycloak({
      url: this.config.url,
      realm: this.config.realm,
      clientId: this.config.clientId,
    });
  }

  async init(): Promise<void> {
    try {
      const authenticated = await this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256',
      });
      this._authenticated.set(authenticated);
      if (authenticated) {
        this._username.set(this.keycloak.tokenParsed?.['preferred_username'] ?? null);
      }
    } catch (err) {
      console.error('Keycloak init failed', err);
      this._authenticated.set(false);
    }
  }

  login(): void {
    this.keycloak.login({ redirectUri: window.location.href });
  }

  logout(): void {
    this._authenticated.set(false);
    this._username.set(null);
    this.keycloak.logout({ redirectUri: window.location.origin });
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }

  async updateToken(): Promise<void> {
    await this.keycloak.updateToken(30);
  }
}
