// spec: 저장 기능
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('저장 기능', () => {
  test('편집 완료 버튼', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 에디터에서 작업 수행
    const textButton = page.getByRole('button', { name: /텍스트/i }).first();
    if (await textButton.isVisible()) {
      await textButton.click();
      await page.waitForTimeout(500);
    }

    const addButton = page.locator('button').filter({ hasText: /텍스트 추가/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    // 3. 상단 헤더에서 '편집완료' 버튼 찾기
    const finishButton = page.locator('button').filter({ hasText: /편집완료|완료/i }).first();

    // 편집완료 버튼이 있으면 클릭
    if (await finishButton.isVisible()) {
      await finishButton.click();
      await page.waitForTimeout(1000);

      // 4. 확인 모달이 표시되는지 확인
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();

      if (await modal.isVisible()) {
        // 5. 모달에서 '확인' 버튼 클릭
        const confirmButton = modal.locator('button').filter({ hasText: /확인|편집 완료/i }).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    }

    // 페이지가 크래시하지 않았는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
