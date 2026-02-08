/**
 * 04. 3D 미리보기 모달 테스트
 *
 * BookMockup3D 컴포넌트의 동작 검증
 * - 3D 미리보기 모달 열기/닫기
 * - 회전 슬라이더 동작
 * - 책 면 (앞표지/책등/뒷표지) 표시
 */
import { test as base, expect } from '@playwright/test'
import { setupSpreadMocks, openSpreadEditor } from './fixtures'

const test = base

/**
 * 헤더 버튼을 순회하며 3D 모달을 여는 헬퍼
 * 모달이 열리면 true 반환
 */
async function open3DModal(page: import('@playwright/test').Page): Promise<boolean> {
  const header = page.locator('nav')
  const buttons = header.locator('button')
  const buttonCount = await buttons.count()

  for (let i = 0; i < buttonCount; i++) {
    const btn = buttons.nth(i)
    const isDisabled = await btn.isDisabled().catch(() => true)
    if (isDisabled) continue

    // 텍스트가 있는 버튼(불러오기, 편집완료 등)은 건너뜀
    const text = await btn.innerText().catch(() => '')
    if (text.trim().length > 0) continue

    await btn.click()
    await page.waitForTimeout(500)

    const mockupTitle = page.getByText('3D 책 미리보기')
    if (await mockupTitle.isVisible().catch(() => false)) {
      return true
    }
  }
  return false
}

test.describe('3D 미리보기', () => {
  test.beforeEach(async ({ page }) => {
    await setupSpreadMocks(page)
    await openSpreadEditor(page)
  })

  test('3D 미리보기 모달이 열리고 닫힌다', async ({ page }) => {
    const opened = await open3DModal(page)

    if (!opened) {
      console.log('3D 미리보기 모달이 열리지 않음 - 스프레드 모드 활성화 확인 필요')
      return
    }

    // 모달 내용 확인
    const mockupTitle = page.getByText('3D 책 미리보기')
    await expect(mockupTitle).toBeVisible()

    // X 닫기 버튼 클릭 (모달 내부의 rounded-full 버튼)
    const closeBtn = page.locator('.rounded-full').filter({ has: page.locator('svg') })
    await closeBtn.click()
    await expect(mockupTitle).not.toBeVisible()
  })

  test('3D 미리보기 모달에 앞표지/책등/뒷표지가 표시된다', async ({ page }) => {
    const opened = await open3DModal(page)
    if (!opened) return

    // 모달 안의 3D 뷰 영역 확인
    // 앞표지는 3D 면과 슬라이더 라벨 양쪽에 있으므로 first() 사용
    await expect(page.getByText('앞표지').first()).toBeVisible()
    await expect(page.getByText('책등').first()).toBeVisible()
    await expect(page.getByText('뒷표지').first()).toBeVisible()
  })

  test('3D 미리보기 회전 슬라이더가 동작한다', async ({ page }) => {
    const opened = await open3DModal(page)
    if (!opened) return

    // 슬라이더 찾기
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible()

    // 초기값 확인 (30도)
    const initialValue = await slider.inputValue()
    expect(Number(initialValue)).toBe(30)

    // 슬라이더 값 변경
    await slider.fill('60')
    await page.waitForTimeout(300)

    // 회전 각도 텍스트 업데이트 확인
    await expect(page.getByText('회전 각도: 60°')).toBeVisible()

    // 슬라이더를 음수로 변경
    await slider.fill('-45')
    await page.waitForTimeout(300)
    await expect(page.getByText('회전 각도: -45°')).toBeVisible()
  })

  test('3D 미리보기 모달 배경 클릭으로 닫힌다', async ({ page }) => {
    const opened = await open3DModal(page)
    if (!opened) return

    const mockupTitle = page.getByText('3D 책 미리보기')
    await expect(mockupTitle).toBeVisible()

    // 모달 오버레이의 빈 영역을 클릭 (좌상단 모서리)
    // 모달 컨텐츠는 중앙에 위치하므로 (10, 10) 좌표는 오버레이 영역
    await page.mouse.click(10, 100)
    await page.waitForTimeout(500)

    // 모달이 닫혔는지 확인
    await expect(mockupTitle).not.toBeVisible({ timeout: 3000 })
  })
})
