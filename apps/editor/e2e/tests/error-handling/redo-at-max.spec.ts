// spec: 에러 처리 및 엣지 케이스
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('에러 처리 및 엣지 케이스', () => {
  test('최대 Redo 시도', async ({ page }) => {
    // 에디터로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);

    // 1. Ctrl+Shift+Z를 여러 번 입력 (Redo 스택이 비었을 때)
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(100);
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(100);
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(100);

    // 2. 에러가 발생하지 않는지 확인
    await expect(canvas).toBeVisible();

    // 페이지가 크래시하지 않았는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
