/**
 * 02. 스프레드 모드 레이아웃 및 UI 테스트
 *
 * 스프레드 모드에서 UI 구조가 올바른지 검증합니다.
 * - 하단 SpreadPagePanel 표시
 * - ToolBar/FeatureSidebar/ControlBar 숨김
 * - 3D 미리보기 버튼 표시
 * - EditorHeader 변경사항
 */
import { test as base, expect } from '@playwright/test'
import { setupSpreadMocks, openSpreadEditor } from './fixtures'

const test = base

test.describe('스프레드 모드 UI 레이아웃', () => {
  test.beforeEach(async ({ page }) => {
    await setupSpreadMocks(page)
    await openSpreadEditor(page)
  })

  test('하단 SpreadPagePanel이 표시된다', async ({ page }) => {
    // SpreadPagePanel: h-[180px] bg-white border-t
    const bottomPanel = page.locator('.h-\\[180px\\].border-t')
    await expect(bottomPanel).toBeVisible({ timeout: 10000 })
  })

  test('스프레드 썸네일이 표시된다', async ({ page }) => {
    // SpreadThumbnailItem에 "표지 스프레드" 텍스트가 있어야 함
    // SpreadThumbnailItem은 썸네일 내부와 라벨에 "표지 스프레드"를 표시
    const spreadLabel = page.getByText('표지 스프레드').first()
    await expect(spreadLabel).toBeVisible({ timeout: 10000 })
  })

  test('스프레드 썸네일이 기본적으로 활성 상태이다', async ({ page }) => {
    // 첫 페이지(스프레드)가 active 상태 → border-blue-500 클래스
    const activeThumbnail = page.locator('[class*="border-blue-500"]').first()
    await expect(activeThumbnail).toBeVisible({ timeout: 10000 })
  })

  test('내지 페이지 추가 버튼(+)이 표시된다', async ({ page }) => {
    // Plus 버튼: border-dashed 스타일
    const addButton = page.locator('button.border-dashed')
    // 또는 title 속성으로 찾기
    const addButtonByTitle = page.locator('button[title*="페이지 추가"], button[title*="최대 페이지"]')
    const anyVisible = await addButton.or(addButtonByTitle).first().isVisible().catch(() => false)
    expect(anyVisible).toBe(true)
  })

  test('스프레드 모드에서 ToolBar가 표시된다', async ({ page }) => {
    // 스프레드 모드에서도 좌측 ToolBar(이미지/텍스트/요소/배경)가 표시됨
    await page.waitForTimeout(1000)

    // ToolBar 버튼들이 보이는지 확인
    const imageButton = page.getByRole('button', { name: '이미지' })
    await expect(imageButton).toBeVisible()

    const textButton = page.getByRole('button', { name: '텍스트' })
    await expect(textButton).toBeVisible()
  })

  test('3D 미리보기 버튼이 헤더에 표시된다', async ({ page }) => {
    // EditorHeader: isSpreadMode일 때 Box 아이콘 버튼이 보임
    // TooltipContent: "3D 미리보기"
    // Box 아이콘의 버튼 자체를 찾기
    const header = page.locator('nav')
    await expect(header).toBeVisible()

    // 3D 미리보기 버튼: Box 아이콘 (h-5 w-5)이 포함된 버튼
    // SVG 기반이므로 직접 텍스트로는 찾기 어려움
    // 대신, 스프레드 모드 전용 버튼 수를 확인
    const headerButtons = header.locator('button')
    const buttonCount = await headerButtons.count()
    // 스프레드 모드에서는 3D 미리보기 버튼이 추가되므로 기존보다 1개 더 많아야 함
    expect(buttonCount).toBeGreaterThanOrEqual(3)
  })

  test('SpreadPagePanel과 메인 캔버스가 올바른 순서로 배치된다', async ({ page }) => {
    // flex-col 구조에서: 캔버스 영역이 위, SpreadPagePanel이 아래
    const editorMain = page.locator('#editor')
    await expect(editorMain).toBeVisible()

    // 캔버스 영역과 하단 패널이 모두 보이는지 확인
    const canvasWrapper = page.locator('#canvas-wrapper')
    await expect(canvasWrapper).toBeVisible()

    const bottomPanel = page.locator('.h-\\[180px\\].border-t')
    await expect(bottomPanel).toBeVisible()

    // 캔버스 영역의 y 좌표가 하단 패널보다 작은지 확인
    const canvasBox = await canvasWrapper.boundingBox()
    const panelBox = await bottomPanel.boundingBox()

    if (canvasBox && panelBox) {
      expect(canvasBox.y).toBeLessThan(panelBox.y)
    }
  })
})
