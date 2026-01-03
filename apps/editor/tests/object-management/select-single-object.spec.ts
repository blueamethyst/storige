// spec: 객체 선택 및 관리
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('객체 선택 및 관리', () => {
  test('단일 객체 선택', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 초기화 완료 대기
    await page.waitForTimeout(2000);

    // 3. 텍스트 메뉴 클릭
    const textButton = page.getByRole('button', { name: '텍스트' });
    await textButton.click();
    await page.waitForTimeout(500);

    // 4. 텍스트 추가 버튼 클릭
    const addTextButton = page.getByRole('button', { name: '텍스트 추가' });
    await addTextButton.click();
    await page.waitForTimeout(1000);

    // 5. 객체 목록에서 객체가 추가되었는지 확인
    const objectList = page.locator('text=i-text');
    await expect(objectList.first()).toBeVisible({ timeout: 3000 });

    // 6. 캔버스 클릭으로 객체 선택
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width / 2,
        canvasBox.y + canvasBox.height / 2
      );
    }
    await page.waitForTimeout(500);

    // 7. 속성 패널에 크기/속성 섹션이 표시되는지 확인
    const sizeSection = page.getByText('크기');
    await expect(sizeSection).toBeVisible({ timeout: 3000 });
  });
});
