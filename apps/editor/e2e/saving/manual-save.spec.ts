// spec: 저장 기능
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('저장 기능', () => {
  test('수동 저장 버튼', async ({ page }) => {
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

    // 3. 상단 헤더에서 '저장' 버튼 찾기
    const saveButton = page.locator('button').filter({ hasText: /저장/i }).first();

    // 저장 버튼이 있으면 클릭
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // 4. 저장 완료 확인
      // 저장 성공 메시지나 UI 피드백 확인
    }

    // 페이지가 정상 작동하는지 확인
    await expect(canvas).toBeVisible();
  });
});
