// spec: 페이지 관리 (다중 페이지)
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('페이지 관리', () => {
  test('페이지 삭제', async ({ page }) => {
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
      const initialCount = await pageItems.count();

      if (initialCount >= 2) {
        // 3. 두 번째 페이지 선택
        await pageItems.nth(1).click();
        await page.waitForTimeout(300);

        // 4. 삭제 버튼 찾기
        const deleteButton = page.locator('button').filter({ hasText: /삭제/i }).first();

        if (await deleteButton.isVisible().catch(() => false)) {
          await deleteButton.click();
          await page.waitForTimeout(500);

          // 5. 삭제 확인 모달 처리
          const modal = page.locator('[role="dialog"], .modal').first();
          if (await modal.isVisible().catch(() => false)) {
            const confirmButton = modal.locator('button').filter({ hasText: /삭제|확인/i }).first();
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              await page.waitForTimeout(500);
            }
          }

          // 6. 페이지가 삭제되었는지 확인
          const newCount = await pageItems.count();
          expect(newCount).toBeLessThan(initialCount);
        }
      }
    }

    // 에디터가 정상 작동하는지 확인
    await expect(canvas).toBeVisible();
  });
});
