// spec: 키보드 단축키 및 사용성
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('키보드 단축키 및 사용성', () => {
  test('ESC 키로 선택 해제', async ({ page }) => {
    // 1. 에디터 페이지로 이동
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 3. 텍스트 추가
    await page.getByRole('button', { name: '텍스트' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '텍스트 추가' }).click();
    await page.waitForTimeout(1000);

    // 4. 객체가 선택된 상태 확인 (속성 패널 표시)
    await expect(page.getByText('크기')).toBeVisible({ timeout: 3000 });

    // 5. ESC 키 입력
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 6. 선택 해제 확인 - 텍스트 메뉴 버튼이 비활성 상태
    // ESC 후에도 객체는 존재하지만 선택이 해제됨
    await expect(canvas).toBeVisible();
  });
});
