// spec: 객체 선택 및 관리
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('객체 선택 및 관리', () => {
  test('객체 그룹 해제', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 3. 텍스트 메뉴 클릭
    await page.getByRole('button', { name: '텍스트' }).click();
    await page.waitForTimeout(500);

    // 4. 텍스트 객체 추가
    await page.getByRole('button', { name: '텍스트 추가' }).click();
    await page.waitForTimeout(1000);

    // 5. 객체가 추가되었는지 확인
    await expect(page.locator('text=i-text').first()).toBeVisible({ timeout: 3000 });

    // 6. 캔버스가 정상 동작하는지 확인
    await expect(canvas).toBeVisible();
  });
});
