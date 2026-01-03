// spec: 키보드 단축키 및 사용성
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('키보드 단축키 및 사용성', () => {
  test('Delete 키로 객체 삭제', async ({ page }) => {
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

    // 4. 객체가 추가되었는지 확인
    await expect(page.locator('text=i-text').first()).toBeVisible({ timeout: 3000 });

    // 5. 캔버스 클릭으로 객체 선택
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width / 2,
        canvasBox.y + canvasBox.height / 2
      );
    }
    await page.waitForTimeout(500);

    // 6. ESC를 눌러 편집 모드에서 선택 모드로 전환
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 7. Delete 키 입력
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // 8. 객체가 삭제되었는지 확인
    await expect(page.getByText('객체가 없습니다')).toBeVisible({ timeout: 3000 });
  });
});
