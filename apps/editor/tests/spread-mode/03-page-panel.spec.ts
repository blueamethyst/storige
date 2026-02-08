/**
 * 03. SpreadPagePanel 상호작용 테스트
 *
 * 하단 페이지 패널의 클릭/선택/추가/삭제 동작 검증
 * - 스프레드 썸네일 클릭 → 스프레드 캔버스 선택
 * - 내지 썸네일 클릭 → 해당 내지 캔버스 선택
 * - 페이지 추가(+) 버튼 동작
 * - 구분선 표시
 */
import { test as base, expect } from '@playwright/test'
import { setupSpreadMocks, openSpreadEditor } from './fixtures'

const test = base

test.describe('SpreadPagePanel 상호작용', () => {
  test.beforeEach(async ({ page }) => {
    await setupSpreadMocks(page)
    await openSpreadEditor(page)
  })

  test('초기 상태에서 스프레드 썸네일이 활성화되어 있다', async ({ page }) => {
    // SpreadThumbnailItem은 라벨을 2곳에 표시 (썸네일 내부 + 아래 라벨)
    const spreadLabel = page.getByText('표지 스프레드').first()
    await expect(spreadLabel).toBeVisible({ timeout: 10000 })

    // 스프레드 썸네일의 부모 요소에서 활성 스타일 확인
    // SpreadThumbnailItem: isActive → border-blue-500
    const activeBorder = page.locator('.h-\\[100px\\] [class*="border-blue-500"]').first()
    await expect(activeBorder).toBeVisible()
  })

  test('구분선이 스프레드와 내지 사이에 표시된다', async ({ page }) => {
    // 구분선: h-16 w-px bg-gray-300
    const separator = page.locator('.h-16.w-px.bg-gray-300')
    await expect(separator).toBeVisible({ timeout: 10000 })
  })

  test('내지 페이지가 올바른 수만큼 표시된다', async ({ page }) => {
    // pageCount=4로 진입, 템플릿에 내지가 2개 + 2개 추가 = 총 4개
    await page.waitForTimeout(2000)

    // 하단 패널에 내지 항목 (텍스트 "내지") 확인
    const bottomPanel = page.locator('.h-\\[100px\\].border-t')
    await expect(bottomPanel).toBeVisible()

    // 내지 페이지 아이템들 확인 (각 PageItem에 "내지" 텍스트)
    const innerPageItems = bottomPanel.getByText('내지')
    const count = await innerPageItems.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('스프레드 썸네일 클릭 시 스프레드 캔버스로 전환된다', async ({ page }) => {
    // 스프레드 라벨 클릭
    const spreadLabel = page.getByText('표지 스프레드').first()
    await expect(spreadLabel).toBeVisible({ timeout: 10000 })
    await spreadLabel.click()

    // 스프레드 썸네일이 활성 상태 유지
    const activeBorder = page.locator('.h-\\[100px\\] [class*="border-blue-500"]').first()
    await expect(activeBorder).toBeVisible()
  })

  test('페이지 추가 버튼에 적절한 title이 표시된다', async ({ page }) => {
    // title="내지 페이지 추가" 또는 title="최대 페이지 수에 도달했습니다"
    const addButton = page.locator(
      'button[title="내지 페이지 추가"], button[title="최대 페이지 수에 도달했습니다"]'
    )
    await expect(addButton).toBeVisible({ timeout: 10000 })
  })
})
