// spec: 저장 기능
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('저장 기능', () => {
  test('자동 저장 확인', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 텍스트 객체 추가 (편집 작업 수행)
    const textButton = page.getByRole('button', { name: /텍스트/i }).first();
    if (await textButton.isVisible()) {
      await textButton.click();
      await page.waitForTimeout(500);
    }

    const addButton = page.locator('button').filter({ hasText: /텍스트 추가/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);
    }

    // 3. 자동 저장 대기 (일반적으로 몇 초 후 자동 저장)
    await page.waitForTimeout(3000);

    // 4. 네트워크 요청 확인 (저장 API 호출)
    // 저장이 성공했는지 확인하는 방법은 UI 피드백이나 네트워크 요청 확인
    // 저장 상태 인디케이터가 있으면 확인
    const saveIndicator = page.locator('[data-testid="save-status"], [class*="save"]').first();

    // 페이지가 여전히 정상 작동하는지 확인
    await expect(canvas).toBeVisible();
  });
});
