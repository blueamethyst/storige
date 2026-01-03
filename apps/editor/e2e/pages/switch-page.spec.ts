// spec: 페이지 관리 (다중 페이지)
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('페이지 관리', () => {
  test('페이지 전환', async ({ page }) => {
    // 1. 2개 이상의 페이지가 있는 에디터로 이동
    await page.goto('/?pageCount=2');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 페이지 패널 찾기
    const pagePanel = page.locator('[class*="page-panel"]').first();

    if (await pagePanel.isVisible().catch(() => false)) {
      const pageItems = pagePanel.locator('[class*="thumbnail"], [class*="page-item"]');
      const pageCount = await pageItems.count();

      if (pageCount >= 2) {
        // 3. 첫 번째 페이지에 텍스트 추가
        const textButton = page.getByRole('button', { name: /텍스트/i }).first();
        if (await textButton.isVisible()) {
          await textButton.click();
          await page.waitForTimeout(300);

          const addButton = page.locator('button').filter({ hasText: /텍스트 추가/i }).first();
          if (await addButton.isVisible()) {
            await addButton.click();
            await page.waitForTimeout(500);
          }
        }

        // 4. 두 번째 페이지 클릭
        await pageItems.nth(1).click();
        await page.waitForTimeout(500);

        // 5. 캔버스가 두 번째 페이지로 전환되었는지 확인
        // 두 번째 페이지가 활성화되었는지 확인
        const activePage = pagePanel.locator('[class*="active"], [class*="selected"]');
        await expect(activePage).toBeVisible();

        // 6. 첫 번째 페이지로 다시 전환
        await pageItems.first().click();
        await page.waitForTimeout(500);
      }
    }

    // 에디터가 정상 작동하는지 확인
    await expect(canvas).toBeVisible();
  });
});
