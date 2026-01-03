// spec: 캔버스 초기화 및 기본 동작
// seed: /Users/martin/Documents/work/papas/storige/apps/editor/e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('캔버스 초기화 및 기본 동작', () => {
  test('에디터 페이지 로딩', async ({ page }) => {
    // 1. http://localhost:3000 으로 이동
    await page.goto('http://localhost:3000');
    
    // 2. 페이지 로딩 완료 대기
    await page.waitForLoadState('networkidle');
    
    // 3. 캔버스 엘리먼트가 표시되는지 확인
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
    
    // 4. 도구 모음(ToolBar)이 표시되는지 확인
    const toolbar = page.locator('.toolbar');
    await expect(toolbar).toBeVisible();
    
    // 기대결과: 페이지가 오류 없이 로드되고 캔버스와 도구 모음이 표시됨
    await expect(page).toHaveURL('http://localhost:3000/');
  });
});
