// spec: 이미지 추가 및 편집 - 이미지 메뉴 열기
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('이미지 추가 및 편집', () => {
  test('이미지 메뉴 열기', async ({ page }) => {
    // 에디터 페이지로 이동하여 초기화 대기
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // 좌측 도구 모음에서 '이미지' 메뉴 클릭
    const imageButton = page.locator('.toolbar button').filter({ hasText: '이미지' });
    await expect(imageButton).toBeVisible();
    await imageButton.click();

    // 사이드 패널이 열리는지 확인
    const sidePanel = page.locator('.tool-header').filter({ hasText: '이미지' });
    await expect(sidePanel).toBeVisible();

    // '업로드' 버튼이 표시되는지 확인
    const uploadButton = page.locator('button').filter({ hasText: '업로드' });
    await expect(uploadButton).toBeVisible();
  });
});
