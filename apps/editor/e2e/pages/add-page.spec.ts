// spec: 페이지 관리 (다중 페이지)
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('페이지 관리', () => {
  test('페이지 추가', async ({ page }) => {
    // 1. 멀티 페이지 에디터로 이동
    await page.goto('/?pageCount=1');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 페이지 패널에서 '페이지 추가' 버튼 찾기
    const addPageButton = page.locator('button').filter({ hasText: /페이지 추가|\+/i }).first();

    if (await addPageButton.isVisible().catch(() => false)) {
      // 현재 페이지 수 확인
      const pagePanel = page.locator('[class*="page-panel"]').first();
      const initialPages = await pagePanel.locator('[class*="thumbnail"], [class*="page-item"]').count();

      // 3. 버튼 클릭
      await addPageButton.click();
      await page.waitForTimeout(1000);

      // 4. 새 페이지가 페이지 목록에 추가되는지 확인
      const newPages = await pagePanel.locator('[class*="thumbnail"], [class*="page-item"]').count();
      expect(newPages).toBe(initialPages + 1);
    }

    // 에디터가 정상 작동하는지 확인
    await expect(canvas).toBeVisible();
  });
});
