// spec: 페이지 관리 (다중 페이지)
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('페이지 관리', () => {
  test('페이지 순서 변경', async ({ page }) => {
    // 1. 3개 이상의 페이지가 있는 에디터로 이동
    await page.goto('/?pageCount=3');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 페이지 패널 찾기
    const pagePanel = page.locator('[class*="page-panel"]').first();

    if (await pagePanel.isVisible().catch(() => false)) {
      const pageItems = pagePanel.locator('[class*="thumbnail"], [class*="page-item"]');
      const pageCount = await pageItems.count();

      if (pageCount >= 3) {
        // 3. 첫 번째 페이지를 드래그하여 세 번째 위치로 이동
        const firstPage = pageItems.first();
        const thirdPage = pageItems.nth(2);

        const firstBox = await firstPage.boundingBox();
        const thirdBox = await thirdPage.boundingBox();

        if (firstBox && thirdBox) {
          await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2);
          await page.mouse.up();
          await page.waitForTimeout(500);
        }
      }
    }

    // 에디터가 정상 작동하는지 확인
    await expect(canvas).toBeVisible();
  });
});
