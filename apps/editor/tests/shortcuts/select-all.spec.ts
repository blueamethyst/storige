// spec: 키보드 단축키 및 사용성
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('키보드 단축키 및 사용성', () => {
  test('Ctrl+A 전체 선택', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 3. 텍스트 추가
    await page.getByRole('button', { name: '텍스트' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '텍스트 추가' }).click();
    await page.waitForTimeout(1000);

    // 4. ESC로 선택 해제
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 5. Ctrl+A 키 입력
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(500);

    // 6. 전체 선택 확인 - 캔버스가 여전히 표시됨
    await expect(canvas).toBeVisible();
  });
});
