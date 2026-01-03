// spec: 에러 처리 및 엣지 케이스
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('에러 처리 및 엣지 케이스', () => {
  test('잘못된 쿼리 파라미터 처리', async ({ page }) => {
    // 1. /?productId=invalid&contentId=999999 URL로 이동
    await page.goto('/?productId=invalid&contentId=999999');

    // 2. 페이지가 크래시 없이 로드되는지 확인
    await page.waitForLoadState('networkidle');

    // URL이 유지되는지 확인
    await expect(page).toHaveURL(/productId=invalid/);
    await expect(page).toHaveURL(/contentId=999999/);

    // 3. 에러 메시지가 표시되거나 기본 에디터가 열리는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // 캔버스가 초기화되었는지 확인 (기본 에디터가 열림)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });
});
