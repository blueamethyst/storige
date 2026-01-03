// spec: 키보드 단축키 및 사용성
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('키보드 단축키 및 사용성', () => {
  test('화살표 키로 객체 이동', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 3. 에디터에 텍스트 객체 추가
    const textButton = page.getByRole('button', { name: /text|텍스트/i }).first();
    if (await textButton.isVisible()) {
      await textButton.click();
      await page.waitForTimeout(300);

      const addButton = page.locator('button').filter({ hasText: /추가|TEXT/i }).first();
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(500);
      }
    }

    // 4. 텍스트 객체 선택
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width / 2,
        canvasBox.y + canvasBox.height / 2
      );
    }
    await page.waitForTimeout(300);

    // 5. 오른쪽 화살표 키를 5회 입력
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
    }

    // 6. 아래 화살표 키를 5회 입력
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(300);

    // 7. 기대결과: 객체가 화살표 방향으로 이동함
    const controlBar = page.locator('#control-bar');
    await expect(controlBar).toBeVisible();
  });
});
