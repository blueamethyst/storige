// spec: 에러 처리 및 엣지 케이스
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('에러 처리 및 엣지 케이스', () => {
  test('존재하지 않는 라우트 처리', async ({ page }) => {
    // 1. /unknown-page 경로로 이동
    await page.goto('/unknown-page');

    // 2. 페이지가 홈('/') 또는 에러 페이지로 리다이렉트되는지 확인
    await page.waitForLoadState('networkidle');

    // 홈('/')으로 리다이렉트되어야 함
    await expect(page).toHaveURL('/');

    // 캔버스가 정상적으로 로드되는지 확인
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });
});
