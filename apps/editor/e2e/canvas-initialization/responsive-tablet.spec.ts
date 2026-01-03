// spec: 캔버스 초기화 및 기본 동작
// seed: /Users/martin/Documents/work/papas/storige/apps/editor/e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('캔버스 초기화 및 기본 동작', () => {
  test('반응형 레이아웃 - 태블릿', async ({ page }) => {
    // 1. 뷰포트를 768x1024로 설정
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 2. 에디터 페이지로 이동
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // 3. 캔버스가 표시되는지 확인
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
    
    // 태블릿 모드에서는 도구 모음이 가로 방향으로 표시됨
    const toolbar = page.locator('.toolbar');
    await expect(toolbar).toBeVisible();
    
    // 가로 방향 도구 모음은 flex-row 클래스를 가짐
    const toolbarClasses = await toolbar.getAttribute('class');
    expect(toolbarClasses).toContain('flex-row');
    
    // 기대결과: 태블릿 레이아웃이 정상적으로 표시됨
  });
});
