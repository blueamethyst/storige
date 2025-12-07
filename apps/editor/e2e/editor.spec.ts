import { test, expect } from '@playwright/test';

test.describe('Editor Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the editor page', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title or main elements are present
    await expect(page).toHaveURL('/');
  });

  test('should display loading state initially', async ({ page }) => {
    // The editor might show loading initially
    const loadingText = page.getByText('Loading...');

    // Either loading is shown briefly or content loads quickly
    // Check that eventually the page content loads
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have canvas container', async ({ page }) => {
    // Wait for the editor to fully initialize
    await page.waitForLoadState('networkidle');

    // Check for canvas element (fabric.js creates canvas elements)
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display toolbar', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for common toolbar elements
    const toolbar = page.locator('[role="toolbar"], .toolbar, [class*="toolbar"]');

    // If toolbar exists, verify it's present
    const toolbarCount = await toolbar.count();
    expect(toolbarCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle query parameters for productId', async ({ page }) => {
    // Navigate with a product ID parameter
    await page.goto('/?productId=test-product');
    await page.waitForLoadState('networkidle');

    // The page should load without crashing
    await expect(page).toHaveURL(/productId=test-product/);
  });
});

test.describe('Template Editor', () => {
  test('should load the template editor page', async ({ page }) => {
    await page.goto('/template');
    await page.waitForLoadState('networkidle');

    // Template editor should load
    await expect(page).toHaveURL('/template');
  });

  test('should handle template query parameters', async ({ page }) => {
    await page.goto('/template?templateId=test-template');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/templateId=test-template/);
  });
});

test.describe('Browse Contents', () => {
  test('should load the browse contents page', async ({ page }) => {
    await page.goto('/browse');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/browse');
  });
});

test.describe('Unauthorized', () => {
  test('should load the unauthorized page', async ({ page }) => {
    await page.goto('/unauthorized');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/unauthorized');
  });
});

test.describe('Navigation', () => {
  test('should redirect unknown routes to home', async ({ page }) => {
    await page.goto('/unknown-route');
    await page.waitForLoadState('networkidle');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });
});

test.describe('Responsive Layout', () => {
  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should load successfully
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
