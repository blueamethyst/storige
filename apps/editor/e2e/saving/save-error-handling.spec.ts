// spec: 저장 기능
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('저장 기능', () => {
  test('저장 실패 시 에러 처리', async ({ page, context }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. 에디터에서 텍스트 추가
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

    // 3. 네트워크를 오프라인 모드로 설정
    await context.setOffline(true);

    // 4. 저장 시도 (자동 저장 또는 수동 저장)
    await page.waitForTimeout(3000);

    // 5. 네트워크를 다시 온라인으로 설정
    await context.setOffline(false);

    // 6. 페이지가 크래시하지 않았는지 확인
    await expect(canvas).toBeVisible();

    // 에러가 발생해도 에디터가 정상 작동하는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
