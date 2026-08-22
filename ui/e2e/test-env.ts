import { expect, Page, request, test } from '@playwright/test';

/**
 * Test environment configuration — loaded from .env (Playwright auto-loads it).
 * Falls back to sensible defaults if env vars are missing.
 */
export const TEST_ENV = {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost',
  user: {
    email: process.env.TEST_USER_EMAIL ?? 'user@statistiloto.local',
    password: process.env.TEST_USER_PASSWORD ?? 'user-password-change-me',
  },
  register: {
    prefix: process.env.TEST_REGISTER_USER_PREFIX ?? 'testplayer',
    domain: process.env.TEST_REGISTER_USER_DOMAIN ?? 'statistiloto.local',
    password: process.env.TEST_REGISTER_USER_PASSWORD ?? 'test-password-123',
  },
  keycloak: {
    adminUser: process.env.KEYCLOAK_ADMIN_USER ?? 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin',
    url: process.env.KEYCLOAK_URL ?? 'http://localhost/auth',
    realm: process.env.KEYCLOAK_REALM ?? 'statistiloto',
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'statistiloto-ui',
  },
  autoCreateUser: process.env.TEST_AUTO_CREATE_USER === 'true',
};

/**
 * Ensure the test user exists in Keycloak. Uses the Keycloak admin REST API
 * to create the user if missing. Called once before the test suite via a
 * global setup (or inline in tests).
 */
export async function ensureTestUser(): Promise<void> {
  if (!TEST_ENV.autoCreateUser) return;

  const adminToken = await getAdminToken();
  if (!adminToken) {
    console.warn('[ensureTestUser] Could not obtain admin token — skipping user creation');
    return;
  }

  // Check if user already exists
  const ctx = await request.newContext({
    baseURL: TEST_ENV.keycloak.url,
    extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
  });

  try {
    const searchResp = await ctx.get(
      `/admin/realms/${TEST_ENV.keycloak.realm}/users?email=${encodeURIComponent(TEST_ENV.user.email)}`,
    );

    if (searchResp.ok()) {
      const users = await searchResp.json();
      if (Array.isArray(users) && users.length > 0) {
        console.log(`[ensureTestUser] User ${TEST_ENV.user.email} already exists`);
        return;
      }
    }

    // Create the user
    console.log(`[ensureTestUser] Creating user ${TEST_ENV.user.email}...`);
    const createResp = await ctx.post(
      `/admin/realms/${TEST_ENV.keycloak.realm}/users`,
      {
        data: {
          username: TEST_ENV.user.email,
          email: TEST_ENV.user.email,
          enabled: true,
          emailVerified: true,
          firstName: 'Test',
          lastName: 'User',
          credentials: [{
            type: 'password',
            value: TEST_ENV.user.password,
            temporary: false,
          }],
        },
      },
    );

    if (createResp.ok() || createResp.status() === 201) {
      console.log(`[ensureTestUser] User ${TEST_ENV.user.email} created successfully`);
    } else {
      const body = await createResp.text();
      console.warn(`[ensureTestUser] Failed to create user: ${createResp.status()} ${body}`);
    }
  } finally {
    await ctx.dispose();
  }
}

async function getAdminToken(): Promise<string | null> {
  const ctx = await request.newContext({ baseURL: TEST_ENV.keycloak.url });
  try {
    const resp = await ctx.post(
      `/realms/${TEST_ENV.keycloak.realm}/protocol/openid-connect/token`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        form: {
          grant_type: 'password',
          client_id: 'admin-cli',
          username: TEST_ENV.keycloak.adminUser,
          password: TEST_ENV.keycloak.adminPassword,
        },
      },
    );
    if (!resp.ok()) {
      console.warn(`[getAdminToken] Failed: ${resp.status()}`);
      return null;
    }
    const body = await resp.json();
    return body.access_token;
  } catch (e) {
    console.warn(`[getAdminToken] Error: ${e}`);
    return null;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Navigate to a protected route, handle Keycloak login if redirected,
 * and wait for the page to settle.
 */
export async function gotoProtected(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForTimeout(3000);

  // Wait longer for Keycloak form — Keycloak may be slow after restart
  const keycloakForm = page.locator('#username');
  if (await keycloakForm.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.fill('#username', TEST_ENV.user.email);
    await page.fill('#password', TEST_ENV.user.password);
    await page.click('#kc-login, button[type="submit"]');
    await page.waitForURL('http://localhost/**', { timeout: 20000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  }
}

/**
 * Generate a unique registration email for the registration test.
 */
export function uniqueRegisterEmail(): string {
  return `${TEST_ENV.register.prefix}+${Date.now()}@${TEST_ENV.register.domain}`;
}
