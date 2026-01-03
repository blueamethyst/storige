// spec: 캔버스 초기화 및 기본 동작
// seed: /Users/martin/Documents/work/papas/storige/apps/editor/e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('캔버스 초기화 및 기본 동작', () => {
  test('반응형 레이아웃 - 데스크톱', async ({ page }) => {
    // 1. 뷰포트를 1920x1080으로 설정
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 2. 에디터 페이지로 이동
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // 3. 캔버스가 표시되는지 확인
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
    
    // 4. 좌측 도구 모음이 세로 방향으로 표시되는지 확인
    const toolbar = page.locator('.toolbar');
    await expect(toolbar).toBeVisible();
    
    // 세로 방향 도구 모음은 flex-col 클래스를 가짐
    const toolbarClasses = await toolbar.getAttribute('class');
    expect(toolbarClasses).toContain('flex-col');
    
    // 기대결과: 데스크톱 레이아웃이 정상적으로 표시됨
  });
});
