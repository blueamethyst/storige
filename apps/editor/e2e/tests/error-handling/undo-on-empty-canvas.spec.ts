// spec: 에러 처리 및 엣지 케이스
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('에러 처리 및 엣지 케이스', () => {
  test('빈 캔버스에서 Undo 시도', async ({ page }) => {
    // 1. 새 에디터 페이지로 이동 (아무 작업 안 함)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 로딩 완료 대기
    await page.waitForTimeout(1000);

    // 2. Ctrl+Z 입력
    await page.keyboard.press('Control+z');

    // 3. 에러가 발생하지 않는지 확인
    await expect(canvas).toBeVisible();

    // 페이지가 크래시하지 않았는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
