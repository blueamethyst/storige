// spec: 도형 및 요소 추가
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('도형 및 요소 추가', () => {
  test('요소 메뉴 열기', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스 로드 대기
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // 2. 좌측 도구 모음에서 '요소' 메뉴 클릭
    const shapeButton = page.locator('button.menu-item').filter({ hasText: '요소' });
    await shapeButton.click();

    // 3. 사이드 패널이 열리는지 확인
    const sidePanel = page.locator('.tool-header').filter({ hasText: '요소' });
    await expect(sidePanel).toBeVisible();

    // 4. '업로드' 버튼이 표시되는지 확인
    const uploadButton = page.locator('button').filter({ hasText: '업로드' });
    await expect(uploadButton).toBeVisible();
  });
});
