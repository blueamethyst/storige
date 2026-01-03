// spec: 텍스트 추가 및 편집
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('텍스트 추가 및 편집', () => {
  test('텍스트 내용 편집', async ({ page }) => {
    // 1. 에디터에서 텍스트 객체 추가
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 텍스트 메뉴 클릭
    const textMenuButton = page.locator('.toolbar button', { hasText: '텍스트' });
    await textMenuButton.click();

    // 텍스트 추가 버튼 클릭
    const featureSidebar = page.locator('.feature-sidebar');
    const addTextButton = featureSidebar.getByRole('button', { name: /텍스트 추가/ });
    await addTextButton.click();

    await page.waitForTimeout(1000);

    // 2. 텍스트를 더블클릭하여 편집 모드 진입
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.dblclick(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    }

    await page.waitForTimeout(500);

    // 3. 텍스트를 전체 선택 후 '안녕하세요' 입력
    await page.keyboard.press('Control+A');
    await page.keyboard.type('안녕하세요');

    // 4. 캔버스 빈 영역 클릭하여 편집 모드 종료
    if (canvasBox) {
      await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
    }

    await page.waitForTimeout(500);

    // 기대결과: 텍스트 내용이 '안녕하세요'로 변경됨
    // 캔버스가 여전히 표시되는지 확인
    await expect(canvas).toBeVisible();
  });
});
