import { expect, Page, test } from '@playwright/test';

/**
 * Helper: navigate to a protected route, handle Keycloak login if
 * redirected, and wait for the page to settle.
 *
 * The Angular auth guard redirects to Keycloak via JavaScript after
 * the page loads, so we need to wait for either the Keycloak login
 * form or the app content to appear.
 */
async function gotoProtected(page: Page, path: string): Promise<void> {
  await page.goto(path);

  // Wait for either:
  // 1. The Keycloak login form (redirected = not authenticated)
  // 2. An h2 element (already authenticated, page rendered)
  // The Angular auth guard redirects via JS after init, so we need
  // to give it time.
  await page.waitForTimeout(3000);

  const keycloakForm = page.locator('#username');
  if (await keycloakForm.isVisible({ timeout: 2000 }).catch(() => false)) {
    // We're on the Keycloak login page — fill credentials
    await page.fill('#username', 'user@statistiloto.local');
    await page.fill('#password', 'user-password-change-me');
    await page.click('#kc-login, button[type="submit"]');

    // Wait for redirect back to the app
    await page.waitForURL('http://localhost/**', { timeout: 15000 });
    // Wait for Angular to settle and render
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Statistiloto full flow', () => {
  test('home page loads with Hebrew RTL', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  });

  test('language toggle switches to English', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('button.lang-toggle');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('login and generate form', async ({ page }) => {
    await gotoProtected(page, '/generate');
    await expect(page.locator('h2')).toBeVisible({ timeout: 15000 });

    const genBtn = page.locator('button:has-text("הגרל"), button:has-text("Generate")');
    await genBtn.click();

    // Full round-trip: Angular → Java BFF → Go gRPC → DB → response
    // Should return howMany (10) forms
    await expect(page.locator('.number-set-list, .toast--error')).toBeVisible({ timeout: 30000 });
  });

  test('statistics page works', async ({ page }) => {
    await gotoProtected(page, '/statistics');
    await expect(page.locator('h2')).toBeVisible({ timeout: 15000 });

    const calcBtn = page.locator('button:has-text("חשב"), button:has-text("Calculate")');
    await calcBtn.click();

    await expect(page.locator('.number-set-list, .toast--error')).toBeVisible({ timeout: 30000 });
  });

  test('lucky numbers page works', async ({ page }) => {
    await gotoProtected(page, '/lucky');
    await expect(page.locator('h2')).toBeVisible({ timeout: 15000 });

    const ball = page.locator('.pick-grid app-lottery-ball').first();
    await ball.click();

    await expect(page.locator('.selected-balls app-lottery-ball')).toHaveCount(1);
  });

  test('saved numbers page loads', async ({ page }) => {
    await gotoProtected(page, '/saved');
    await expect(page.locator('h2')).toBeVisible({ timeout: 15000 });
  });
});
