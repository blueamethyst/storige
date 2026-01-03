// spec: 에러 처리 및 엣지 케이스
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('에러 처리 및 엣지 케이스', () => {
  test('객체 없이 삭제 시도', async ({ page }) => {
    // 1. 에디터로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 2. 캔버스 영역 클릭으로 포커스 (mouse.click 사용)
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
    }
    await page.waitForTimeout(300);

    // 3. Delete 키 입력
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // 4. 에러가 발생하지 않는지 확인
    await expect(canvas).toBeVisible();

    // 페이지가 크래시하지 않았는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
