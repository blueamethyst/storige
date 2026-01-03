// spec: 텍스트 추가 및 편집
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('텍스트 추가 및 편집', () => {
  test('텍스트 객체 추가', async ({ page }) => {
    // 1. 에디터 페이지로 이동하여 초기화 대기
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 좌측 도구 모음에서 '텍스트' 메뉴 클릭
    const textMenuButton = page.locator('.toolbar button', { hasText: '텍스트' });
    await textMenuButton.click();

    // 3. 사이드 패널이 열리는지 확인
    const featureSidebar = page.locator('.feature-sidebar');
    await expect(featureSidebar).toBeVisible({ timeout: 5000 });

    // 4. '텍스트 추가' 버튼 클릭
    const addTextButton = featureSidebar.getByRole('button', { name: /텍스트 추가/ });
    await addTextButton.click();

    // 5. 캔버스에 기본 텍스트가 추가되는지 확인
    await page.waitForTimeout(1000);

    // 기대결과: 텍스트 객체가 캔버스에 추가되고 선택됨
    const controlBar = page.locator('#control-bar');
    await expect(controlBar).toBeVisible({ timeout: 3000 });
  });
});
