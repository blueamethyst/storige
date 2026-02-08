/**
 * Spread Mode Seed - API Mock + 스프레드 모드 초기화
 *
 * 모든 스프레드 모드 테스트의 기반이 되는 seed 파일
 * Playwright route interception으로 필요한 API 응답을 모킹합니다.
 */
import { test, expect } from '@playwright/test'
import { setupSpreadMocks, openSpreadEditor, MOCK_TEMPLATE_SET_ID } from './fixtures'

test('seed: 스프레드 모드 에디터 초기화', async ({ page }) => {
  await setupSpreadMocks(page)
  const canvas = await openSpreadEditor(page)

  // 캔버스가 visible 상태인지 확인
  await expect(canvas).toBeVisible()
})
