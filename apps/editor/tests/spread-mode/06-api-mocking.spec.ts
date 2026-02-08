/**
 * 06. API 모킹 및 데이터 플로우 테스트
 *
 * 스프레드 모드에서 API 요청이 올바르게 처리되는지 검증합니다.
 */
import { test as base, expect } from '@playwright/test'
import {
  MOCK_TEMPLATE_SET_ID,
  MOCK_TEMPLATE_SET_RESPONSE,
  MOCK_FONTS_RESPONSE,
} from './fixtures'

const test = base

test.describe('API 모킹 및 데이터 플로우', () => {
  test('template-sets API가 올바른 ID로 호출된다', async ({ page }) => {
    let templateSetApiCalled = false
    let requestedUrl = ''

    await page.route('http://localhost:4000/**', async (route) => {
      const url = route.request().url()

      if (url.includes('/template-sets/') && url.includes('/with-templates')) {
        templateSetApiCalled = true
        requestedUrl = url
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_TEMPLATE_SET_RESPONSE),
        })
        return
      }

      if (url.includes('/library/fonts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_FONTS_RESPONSE),
        })
        return
      }

      if (url.includes('/spine/calculate')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ spineWidthMm: 7.5, formulaVersion: '1.0' }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    expect(templateSetApiCalled).toBe(true)
    expect(requestedUrl).toContain(MOCK_TEMPLATE_SET_ID)
  })

  test('fonts API가 호출된다', async ({ page }) => {
    let fontsApiCalled = false

    await page.route('http://localhost:4000/**', async (route) => {
      const url = route.request().url()

      if (url.includes('/library/fonts')) {
        fontsApiCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_FONTS_RESPONSE),
        })
        return
      }

      if (url.includes('/template-sets/') && url.includes('/with-templates')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_TEMPLATE_SET_RESPONSE),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    expect(fontsApiCalled).toBe(true)
  })

  test('template-sets API 에러 시 에디터가 크래시하지 않는다', async ({ page }) => {
    await page.route('http://localhost:4000/**', async (route) => {
      const url = route.request().url()

      if (url.includes('/template-sets/') && url.includes('/with-templates')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        })
        return
      }

      if (url.includes('/library/fonts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_FONTS_RESPONSE),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    // 페이지가 크래시하지 않고 에디터 DOM이 존재하는지 확인
    const editor = page.locator('#editor')
    await expect(editor).toBeAttached()
  })

  test('editorMode가 book이 아닌 경우 spread 모드에 진입하지 않는다', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text())
      }
    })

    const singleModeResponse = {
      ...MOCK_TEMPLATE_SET_RESPONSE,
      templateSet: {
        ...MOCK_TEMPLATE_SET_RESPONSE.templateSet,
        editorMode: 'single',
      },
    }

    await page.route('http://localhost:4000/**', async (route) => {
      const url = route.request().url()

      if (url.includes('/template-sets/') && url.includes('/with-templates')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(singleModeResponse),
        })
        return
      }

      if (url.includes('/library/fonts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_FONTS_RESPONSE),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto(
      `/?templateSetId=${MOCK_TEMPLATE_SET_ID}&pageCount=4&paperType=matte100&bindingType=perfect`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    const hasSpreadLog = logs.some((log) =>
      log.includes('Loading spread mode editor')
    )
    expect(hasSpreadLog).toBe(false)
  })
})
