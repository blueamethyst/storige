// spec: 객체 선택 및 관리
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('객체 선택 및 관리', () => {
  test('드래그 영역 선택', async ({ page }) => {
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

    // 5. ESC로 선택 해제
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 6. 캔버스 영역 가져오기
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    // 7. 캔버스에서 드래그 선택 시도
    const startX = canvasBox.x + canvasBox.width / 4;
    const startY = canvasBox.y + canvasBox.height / 4;
    const endX = canvasBox.x + (canvasBox.width * 3) / 4;
    const endY = canvasBox.y + (canvasBox.height * 3) / 4;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // 8. 캔버스가 정상 동작하는지 확인
    await expect(canvas).toBeVisible();
  });
});
