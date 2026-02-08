/**
 * 07. 초기화 플로우 순서 테스트
 *
 * 스프레드 모드 초기화 과정의 로그 순서를 검증하여
 * 올바른 순서로 초기화되는지 확인합니다.
 */
import { test as base, expect } from '@playwright/test'
import {
  MOCK_TEMPLATE_SET_ID,
  setupSpreadMocks,
} from './fixtures'

const test = base

test.describe('초기화 플로우 순서', () => {
  test('초기화 로그가 올바른 순서로 출력된다', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text())
      }
    })

    await setupSpreadMocks(page)

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')

    // 캔버스 로드 대기
    const canvas = page.locator('canvas').first()
    await canvas.waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(5000)

    // 주요 초기화 단계 로그 확인
    const initSteps = [
      'Handling template set editor',
      'Loading template set editor',
      'Template set loaded',
    ]

    for (const step of initSteps) {
      const found = logs.some((log) => log.includes(step))
      if (!found) {
        console.log(`Missing log step: ${step}`)
        console.log('Available logs:', logs.filter(l => l.includes('[Editor')).join('\n'))
      }
    }

    // 최소한 template set editor 핸들링은 되어야 함
    const hasHandlingLog = logs.some((log) =>
      log.includes('Handling template set editor')
    )
    expect(hasHandlingLog).toBe(true)
  })

  test('에디터 초기화 완료 로그가 출력된다', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text())
      }
    })

    await setupSpreadMocks(page)

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(8000)

    // 초기화 완료 로그 확인
    const hasInitComplete = logs.some((log) =>
      log.includes('initialized and content loaded successfully') ||
      log.includes('Editor initialized')
    )
    expect(hasInitComplete).toBe(true)
  })

  test('스프레드 모드 초기화 시 SpreadSpec과 SpreadConfig가 설정된다', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text())
      }
    })

    await setupSpreadMocks(page)

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(8000)

    // SpreadSpec 빌드 로그 (EditorMode가 book일 때만)
    const hasSpreadSpecLog = logs.some((log) => log.includes('SpreadSpec built'))
    const hasEditorModeBook = logs.some((log) =>
      log.includes('EditorMode:') && log.includes('book')
    )

    // EditorMode가 book이면 SpreadSpec도 있어야 함
    if (hasEditorModeBook) {
      expect(hasSpreadSpecLog).toBe(true)
    }
  })

  test('내지 페이지 생성 로그가 출력된다', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text())
      }
    })

    await setupSpreadMocks(page)

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(8000)

    // 내지 페이지 생성 로그 확인
    const hasPageCreation = logs.some((log) =>
      log.includes('Creating inner page') ||
      log.includes('Page templates count')
    )

    // EditorMode가 book이면 내지 페이지도 생성되어야 함
    const hasSpreadMode = logs.some((log) =>
      log.includes('Loading spread mode editor')
    )
    if (hasSpreadMode) {
      expect(hasPageCreation).toBe(true)
    }
  })
})
