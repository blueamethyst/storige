// spec: 캔버스 초기화 및 기본 동작
// seed: /Users/martin/Documents/work/papas/storige/apps/editor/e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('캔버스 초기화 및 기본 동작', () => {
  test('쿼리 파라미터로 에디터 초기화', async ({ page }) => {
    // 1. /?productId=test-product&size=A4 URL로 이동
    await page.goto('http://localhost:3000/?productId=test-product&size=A4');
    
    // 2. 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
    
    // 3. 에디터가 오류 없이 초기화되는지 확인
    // URL이 쿼리 파라미터를 포함하고 있는지 확인
    await expect(page).toHaveURL(/productId=test-product/);
    await expect(page).toHaveURL(/size=A4/);
    
    // 캔버스가 정상적으로 로드되었는지 확인
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
    
    // 도구 모음이 표시되는지 확인
    const toolbar = page.locator('.toolbar');
    await expect(toolbar).toBeVisible();
    
    // 기대결과: 쿼리 파라미터가 정상적으로 파싱되고 에디터가 초기화됨
  });
});
