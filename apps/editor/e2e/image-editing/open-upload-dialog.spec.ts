// spec: 이미지 추가 및 편집 - 이미지 업로드 다이얼로그 열기
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('이미지 추가 및 편집', () => {
  test('이미지 업로드 다이얼로그 열기', async ({ page }) => {
    // 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // 이미지 메뉴 열기
    const imageButton = page.locator('.toolbar button').filter({ hasText: '이미지' });
    await imageButton.click();

    // 업로드 버튼 클릭
    const uploadButton = page.locator('button').filter({ hasText: '업로드' });
    await expect(uploadButton).toBeVisible();

    // 파일 선택 다이얼로그가 열리는지 확인
    const fileChooserPromise = page.waitForEvent('filechooser');
    await uploadButton.click();
    const fileChooser = await fileChooserPromise;

    // 파일 선택 다이얼로그가 활성화됨
    expect(fileChooser).toBeTruthy();
  });
});
