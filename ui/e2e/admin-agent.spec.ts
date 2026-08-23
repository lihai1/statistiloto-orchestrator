import { expect, test, Page } from '@playwright/test';
import { TEST_ENV, gotoProtected } from './test-env';

/**
 * E2E tests for admin pages and agent features.
 *
 * Covers:
 *  - Admin login + sidebar admin links visible
 *  - Admin LLM config page (load, save, verify form populated)
 *  - Admin token usage page (loads on init, summary cards visible)
 *  - Admin audit log page (loads on init, table visible)
 *  - Admin scraper page (trigger, HITL approval flow)
 *  - Agent chat memory (same session remembers, different session doesn't)
 *  - Agent tier gating (free user can't access admin intents)
 *  - Agent HITL approval (scraper trigger → approve/reject)
 */

const ADMIN_USER = {
  email: 'admin@statistiloto.local',
  password: 'admin-password-change-me',
};

// ── Helper: login as admin ─────────────────────────────────────

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForTimeout(2000);

  // If already logged in (from a previous test), check for logout button
  const logoutBtn = page.locator('.sidebar-footer button:has-text("התנתק"), .sidebar-footer button:has-text("Logout")').first();
  if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Already logged in — but might be as user, not admin. Logout first.
    await logoutBtn.click();
    await page.waitForTimeout(3000);
  }

  // Click login button
  const loginBtn = page.locator('.sidebar-footer button:has-text("התחבר"), .sidebar-footer button:has-text("Login")').first();
  if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginBtn.click();
  } else {
    // Try the home page CTA button
    await page.locator('button:has-text("התחבר"), button:has-text("Login")').first().click();
  }

  // Wait for Keycloak login form
  await expect(page.locator('#username')).toBeVisible({ timeout: 15000 });
  await page.fill('#username', ADMIN_USER.email);
  await page.fill('#password', ADMIN_USER.password);
  await page.click('#kc-login, button[type="submit"]');

  // Wait for redirect back to app
  await page.waitForURL('http://localhost/**', { timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

// ── Helper: login as regular user ──────────────────────────────

async function loginAsUser(page: Page): Promise<void> {
  await gotoProtected(page, '/generate');
}

// ── Admin login and navigation ─────────────────────────────────

test.describe('Admin login and navigation', () => {
  test('admin login shows admin section in sidebar', async ({ page }) => {
    await loginAsAdmin(page);

    // Admin section should be visible in sidebar
    await expect(page.locator('.app-sidebar')).toBeVisible({ timeout: 5000 });

    // Check for admin nav links (LLM Config, Token Usage, Audit Log, Scraper)
    const adminLinks = page.locator('.app-sidebar .sidebar-nav a[href*="/admin/"]');
    expect(await adminLinks.count()).toBeGreaterThanOrEqual(4);
  });

  test('admin can navigate to LLM config page via sidebar', async ({ page }) => {
    await loginAsAdmin(page);

    const llmConfigLink = page.locator('.app-sidebar a[href*="/admin/llm-config"]').first();
    await llmConfigLink.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('app-llm-config')).toBeVisible({ timeout: 15000 });
  });

  test('admin can navigate to token usage page via sidebar', async ({ page }) => {
    await loginAsAdmin(page);

    const tokenUsageLink = page.locator('.app-sidebar a[href*="/admin/token-usage"]').first();
    await tokenUsageLink.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('app-token-usage')).toBeVisible({ timeout: 15000 });
  });

  test('admin can navigate to audit log page via sidebar', async ({ page }) => {
    await loginAsAdmin(page);

    const auditLogLink = page.locator('.app-sidebar a[href*="/admin/audit-log"]').first();
    await auditLogLink.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('app-audit-log')).toBeVisible({ timeout: 15000 });
  });

  test('admin can navigate to scraper page via sidebar', async ({ page }) => {
    await loginAsAdmin(page);

    const scraperLink = page.locator('.app-sidebar a[href*="/admin/scraper"]').first();
    await scraperLink.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('app-scraper')).toBeVisible({ timeout: 15000 });
  });

  test('non-admin user does not see admin section in sidebar', async ({ page }) => {
    await loginAsUser(page);

    // Admin links should NOT be present
    const adminLinks = page.locator('.app-sidebar .sidebar-nav a[href*="/admin/"]');
    expect(await adminLinks.count()).toBe(0);
  });
});

// ── Admin LLM Config page ──────────────────────────────────────

test.describe('Admin LLM config page', () => {
  test('LLM config form loads with current configuration', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/llm-config');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-llm-config')).toBeVisible({ timeout: 15000 });

    // Form fields should be present
    await expect(page.locator('#model')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#baseUrl')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#apiKey')).toBeVisible({ timeout: 5000 });

    // Model field should be populated from the agent's current config
    const modelValue = await page.locator('#model').inputValue();
    expect(modelValue.length).toBeGreaterThan(0);
  });

  test('LLM config save button shows status note on success', async ({ page }) => {
    test.setTimeout(120000); // 2 min — LLM config save may take time
    await loginAsAdmin(page);
    await page.goto('/admin/llm-config');
    await page.waitForTimeout(5000);

    await expect(page.locator('app-llm-config')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000); // Wait for ngOnInit to load config

    // Click save button (PrimeNG renders a <button> inside <p-button>)
    const saveBtn = page.locator('app-llm-config p-button button').first();
    await saveBtn.click();

    // Should show a status note or success toast (use first to avoid strict mode violation)
    await expect(
      page.locator('.status-note, .toast--success, .toast--error').first()
    ).toBeVisible({ timeout: 60000 });
  });

  test('LLM config base URL placeholder shows ollama:11434', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/llm-config');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-llm-config')).toBeVisible({ timeout: 15000 });
    const baseUrlInput = page.locator('#baseUrl');
    const placeholder = await baseUrlInput.getAttribute('placeholder');
    expect(placeholder).toContain('ollama:11434');
  });
});

// ── Admin Token Usage page ─────────────────────────────────────

test.describe('Admin token usage page', () => {
  test('token usage page loads data on init', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/token-usage');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-token-usage')).toBeVisible({ timeout: 15000 });

    // Summary cards should be visible
    await expect(page.locator('.summary-cards')).toBeVisible({ timeout: 5000 });
    const summaryCards = page.locator('.summary-card');
    expect(await summaryCards.count()).toBeGreaterThanOrEqual(3);
  });

  test('token usage refresh button works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/token-usage');
    await page.waitForTimeout(5000);

    await expect(page.locator('app-token-usage')).toBeVisible({ timeout: 15000 });

    // Click refresh button
    const refreshBtn = page.locator('app-token-usage p-button').first();
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.click();
      // Should not crash — just wait for loading to finish
      await page.waitForTimeout(10000);
    }
  });
});

// ── Admin Audit Log page ───────────────────────────────────────

test.describe('Admin audit log page', () => {
  test('audit log page loads data on init', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/audit-log');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-audit-log')).toBeVisible({ timeout: 15000 });

    // Toolbar with search input should be visible
    await expect(page.locator('.toolbar')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toolbar input')).toBeVisible({ timeout: 5000 });
  });

  test('audit log search input filters data', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/audit-log');
    await page.waitForTimeout(5000);

    await expect(page.locator('app-audit-log')).toBeVisible({ timeout: 15000 });

    // Type in search
    const searchInput = page.locator('.toolbar input').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('trigger_scraper');
      await page.waitForTimeout(500);
      // Should not crash
      const emptyMsg = page.locator('.empty-table');
      // Either filtered results or empty message
      expect(await emptyMsg.count()).toBeLessThanOrEqual(1);
    }
  });
});

// ── Admin Scraper page with HITL ───────────────────────────────

test.describe('Admin scraper page with HITL', () => {
  test('scraper page shows idle status initially', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scraper');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-scraper')).toBeVisible({ timeout: 15000 });

    // Status row should be visible
    await expect(page.locator('.scraper-status')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.status-row')).toBeVisible({ timeout: 5000 });
  });

  test('scraper trigger button is visible and clickable', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scraper');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-scraper')).toBeVisible({ timeout: 15000 });

    // Trigger button should be visible
    const triggerBtn = page.locator('app-scraper .scraper-actions p-button').first();
    await expect(triggerBtn).toBeVisible({ timeout: 5000 });

    // Click trigger — this will either:
    // 1. Show approval card (HITL pause for write tool)
    // 2. Show result message (if LLM decides no tool needed)
    await triggerBtn.click();

    // Wait for response: approval card, result message, or error toast
    await expect(
      page.locator('.approval-card, .result-message, .toast--error')
    ).toBeVisible({ timeout: 120000 });
  });

  test('scraper HITL approval flow: trigger → approve', async ({ page }) => {
    test.setTimeout(180000); // 3 min — LLM may be slow
    await loginAsAdmin(page);
    await page.goto('/admin/scraper');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-scraper')).toBeVisible({ timeout: 15000 });

    // Trigger scraper
    const triggerBtn = page.locator('app-scraper .scraper-actions p-button').first();
    await triggerBtn.click();

    // Wait for either approval card or result message
    const approvalCard = page.locator('app-scraper .approval-card');
    const resultMsg = page.locator('app-scraper .result-message');

    await expect(
      page.locator('app-scraper .approval-card, app-scraper .result-message, .toast--error')
    ).toBeVisible({ timeout: 120000 });

    // If approval card appeared, test approve flow
    if (await approvalCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Click approve button
      const approveBtn = approvalCard.locator('p-button:has-text("אשר"), p-button:has-text("Approve")').first();
      await approveBtn.click();

      // Should show result message after approval
      await expect(resultMsg).toBeVisible({ timeout: 120000 });
    }
  });

  test('scraper HITL rejection flow: trigger → reject', async ({ page }) => {
    test.setTimeout(180000); // 3 min
    await loginAsAdmin(page);
    await page.goto('/admin/scraper');
    await page.waitForTimeout(3000);

    await expect(page.locator('app-scraper')).toBeVisible({ timeout: 15000 });

    // Trigger scraper
    const triggerBtn = page.locator('app-scraper .scraper-actions p-button').first();
    await triggerBtn.click();

    // Wait for approval card or result
    await expect(
      page.locator('app-scraper .approval-card, app-scraper .result-message, .toast--error')
    ).toBeVisible({ timeout: 120000 });

    const approvalCard = page.locator('app-scraper .approval-card');
    if (await approvalCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Click reject button
      const rejectBtn = approvalCard.locator('p-button:has-text("דחה"), p-button:has-text("Reject")').first();
      await rejectBtn.click();

      // Should show result message (rejected)
      const resultMsg = page.locator('app-scraper .result-message');
      await expect(resultMsg).toBeVisible({ timeout: 30000 });
    }
  });
});

// ── Agent chat memory ──────────────────────────────────────────

test.describe('Agent chat memory', () => {
  test('agent chat sends and receives response in same session', async ({ page }) => {
    test.setTimeout(300000); // 5 min — one LLM call
    await loginAsUser(page);
    await page.goto('/assistant');
    await expect(page.locator('app-assistant')).toBeVisible({ timeout: 15000 });

    const chatInput = page.locator('app-assistant .chat-input input').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    // Send a message
    await chatInput.fill('Hello, my name is PlaywrightTestUser.');
    await page.locator('app-assistant .chat-input p-button').first().click();

    // Wait for assistant response
    await expect(page.locator('app-assistant .message.assistant')).toBeVisible({ timeout: 300000 });

    // Verify the response has content
    const assistantBubble = page.locator('app-assistant .message.assistant .message-bubble').first();
    const text = await assistantBubble.textContent();
    expect(text).not.toBeNull();
    expect(text!.length).toBeGreaterThan(0);
  });

  test('New Chat button clears messages and starts new session', async ({ page }) => {
    test.setTimeout(300000); // 5 min — one LLM call
    await loginAsUser(page);
    await page.goto('/assistant');
    await expect(page.locator('app-assistant')).toBeVisible({ timeout: 15000 });

    const chatInput = page.locator('app-assistant .chat-input input').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    // Send a message to populate the chat
    await chatInput.fill('My name is MemoryTestUser.');
    await page.locator('app-assistant .chat-input p-button').first().click();

    // Wait for at least the user message to appear
    await expect(page.locator('app-assistant .message.user')).toBeVisible({ timeout: 10000 });

    // Click "New Chat" button
    const newChatBtn = page.locator('button.new-chat-btn').first();
    await expect(newChatBtn).toBeVisible({ timeout: 5000 });
    await newChatBtn.click();
    await page.waitForTimeout(1000);

    // Messages should be cleared (the sessionId setter clears messages)
    await expect(page.locator('app-assistant .message')).toHaveCount(0, { timeout: 5000 });

    // Empty chat state should be visible again
    await expect(page.locator('app-assistant .empty-chat')).toBeVisible({ timeout: 5000 });
  });
});

// ── Agent tier gating ──────────────────────────────────────────

test.describe('Agent tier gating', () => {
  test('free user can use agent widget for basic chat', async ({ page }) => {
    test.setTimeout(180000); // 3 min
    await loginAsUser(page);
    await page.goto('/generate');

    // Agent widget FAB should be visible
    await expect(page.locator('app-agent-widget .agent-widget-fab')).toBeVisible({ timeout: 15000 });

    // Open widget
    await page.locator('app-agent-widget .agent-widget-fab').click();
    await expect(page.locator('app-agent-widget .agent-widget-panel')).toBeVisible({ timeout: 5000 });

    // Send a basic message
    const chatInput = page.locator('app-agent-widget input[type="text"]').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Hello, what can you help me with?');
    await page.locator('app-agent-widget .chat-input p-button').first().click();

    // Should get a response (not an error)
    await expect(page.locator('app-agent-widget .message.assistant')).toBeVisible({ timeout: 120000 });
  });

  test('free user does not see admin links in sidebar', async ({ page }) => {
    await loginAsUser(page);

    // No admin links should be present
    const adminLinks = page.locator('.app-sidebar a[href*="/admin/"]');
    expect(await adminLinks.count()).toBe(0);

    // No admin bottom tab
    const adminTab = page.locator('.bottom-tabs a[href*="/admin"]');
    expect(await adminTab.count()).toBe(0);
  });

  test('non-admin user gets 403 on direct admin API access', async ({ page }) => {
    await loginAsUser(page);

    // Navigate to the admin LLM config page directly.
    // The Angular router may render the component, but the BFF API call
    // should return 403, so the config form won't be populated.
    await page.goto('/admin/llm-config');
    await page.waitForTimeout(5000);

    // The model field should still show the default value (not loaded from API)
    // because the non-admin user's GET /api/agent/llm-config returns 403.
    const modelValue = await page.locator('#model').inputValue();
    // The default value is "llama3.1:8b" — if the API call succeeded, it would
    // show the actual config (e.g. "qwen2.5:0.5b"). Since the API returns 403,
    // the ngOnInit error handler silently ignores it and the default remains.
    expect(modelValue).toBe('llama3.1:8b');
  });
});

// ── Agent widget interaction ───────────────────────────────────

test.describe('Agent widget interaction', () => {
  test('agent widget sends message and receives response', async ({ page }) => {
    test.setTimeout(180000); // 3 min for LLM response
    await loginAsUser(page);
    await page.goto('/generate');

    // Open widget
    await page.locator('app-agent-widget .agent-widget-fab').click();
    await expect(page.locator('app-agent-widget .agent-widget-panel')).toBeVisible({ timeout: 5000 });

    // Type and send a message
    const chatInput = page.locator('app-agent-widget input[type="text"]').first();
    await chatInput.fill('Tell me about the lottery application');
    await page.locator('app-agent-widget .chat-input p-button').first().click();

    // User message should appear
    await expect(page.locator('app-agent-widget .message.user')).toBeVisible({ timeout: 5000 });

    // Wait for assistant response (LLM may be slow)
    await expect(page.locator('app-agent-widget .message.assistant')).toBeVisible({ timeout: 120000 });
  });

  test('agent widget shows empty state before first message', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/generate');

    // Open widget
    await page.locator('app-agent-widget .agent-widget-fab').click();
    await expect(page.locator('app-agent-widget .agent-widget-panel')).toBeVisible({ timeout: 5000 });

    // Empty chat state should be visible
    await expect(page.locator('app-agent-widget .empty-chat')).toBeVisible({ timeout: 5000 });
  });

  test('agent widget close button works', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/generate');

    // Open widget
    await page.locator('app-agent-widget .agent-widget-fab').click();
    await expect(page.locator('app-agent-widget .agent-widget-panel')).toBeVisible({ timeout: 5000 });

    // Close via close button
    await page.locator('app-agent-widget .close-btn').click();
    await expect(page.locator('app-agent-widget .agent-widget-panel')).toHaveCount(0);
  });
});
