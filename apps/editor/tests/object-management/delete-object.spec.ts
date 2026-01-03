// spec: 객체 선택 및 관리
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('객체 선택 및 관리', () => {
  test('객체 삭제', async ({ page }) => {
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

    // 6. 캔버스 클릭으로 객체 선택
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width / 2,
        canvasBox.y + canvasBox.height / 2
      );
    }
    await page.waitForTimeout(500);

    // 7. 속성 패널이 표시되는지 확인 (객체 선택됨)
    await expect(page.getByText('크기')).toBeVisible({ timeout: 3000 });

    // 8. ESC를 눌러 편집 모드에서 선택 모드로 전환
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 9. Delete 키 입력으로 삭제
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // 10. 객체가 삭제되었는지 확인
    await expect(page.getByText('객체가 없습니다')).toBeVisible({ timeout: 3000 });
  });
});
