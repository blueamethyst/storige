// spec: 실행취소 및 다시실행
// seed: e2e/editor.spec.ts

import { test, expect } from '@playwright/test';

test.describe('실행취소 및 다시실행', () => {
  test('다시실행 (Redo) 테스트', async ({ page }) => {
    // 에디터 초기화
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 캔버스가 로드될 때까지 대기
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 텍스트 메뉴 클릭
    await page.getByRole('button', { name: '텍스트' }).click();
    await page.waitForTimeout(500);

    // 텍스트 객체 추가
    await page.getByRole('button', { name: '텍스트 추가' }).click();
    await page.waitForTimeout(1000);

    // 텍스트가 추가되었는지 확인
    await expect(page.locator('text=i-text').first()).toBeVisible({ timeout: 3000 });

    // Ctrl+Z로 텍스트 추가 취소
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);

    // 텍스트가 제거되었는지 확인
    await expect(page.getByText('객체가 없습니다')).toBeVisible({ timeout: 3000 });

    // Ctrl+Shift+Z 키보드 단축키 입력 (Redo)
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(1000);

    // 기대결과: 텍스트가 다시 나타남
    await expect(page.locator('text=i-text').first()).toBeVisible({ timeout: 3000 });
  });
});
