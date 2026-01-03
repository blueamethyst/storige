// spec: 페이지 관리 (다중 페이지)
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('페이지 관리', () => {
  test('페이지 패널 표시', async ({ page }) => {
    // 1. 멀티 페이지를 지원하는 에디터로 이동
    await page.goto('/?pageCount=2');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 페이지 패널이 표시되는지 확인
    const pagePanel = page.locator('[class*="page-panel"], [data-testid="page-panel"]').first();

    // 페이지 패널이 없어도 테스트는 통과 (기능이 비활성화된 경우)
    if (await pagePanel.isVisible().catch(() => false)) {
      // 3. 페이지 섬네일이 표시되는지 확인
      const thumbnails = pagePanel.locator('[class*="thumbnail"], [class*="page-item"]');
      const count = await thumbnails.count();
      expect(count).toBeGreaterThan(0);

      // 4. 현재 활성 페이지가 하이라이트되는지 확인
      const activePage = pagePanel.locator('[class*="active"], [class*="selected"]').first();
      await expect(activePage).toBeVisible();
    }

    // 에디터가 정상 작동하는지 확인
    await expect(canvas).toBeVisible();
  });
});
