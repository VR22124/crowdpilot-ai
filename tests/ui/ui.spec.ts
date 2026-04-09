// @ts-nocheck
import { expect, test } from '@playwright/test'
import { expectSingleVisiblePanel, openApp } from './testUtils'

test.describe('UI viewport container', () => {
  test('tabs switch and only one panel is visible', async ({ page }) => {
    await openApp(page)

    await expectSingleVisiblePanel(page, 'panel-overview')

    await page.getByTestId('tab-route').click()
    await expectSingleVisiblePanel(page, 'panel-route')

    await page.getByTestId('tab-control').click()
    await expectSingleVisiblePanel(page, 'panel-control')

    await page.getByTestId('tab-assist').click()
    await expectSingleVisiblePanel(page, 'panel-assist')

    await page.getByTestId('tab-ai').click()
    await expectSingleVisiblePanel(page, 'panel-ai')
  })

  test('viewport and no overflow in twin viewport', async ({ page }) => {
    await openApp(page)

    const metrics = await page.evaluate(() => {
      const twin = document.querySelector('[data-testid="twin-viewport"]') as HTMLElement
      const body = document.body
      return {
        viewportHeight: window.innerHeight,
        twinHeight: twin.getBoundingClientRect().height,
        bodyScrollHeight: body.scrollHeight,
        bodyClientHeight: body.clientHeight,
      }
    })

    expect(Math.abs(metrics.twinHeight - metrics.viewportHeight)).toBeLessThanOrEqual(2)
    expect(metrics.bodyScrollHeight).toBeGreaterThanOrEqual(metrics.bodyClientHeight)
  })

  test('chatbot visible and send action works', async ({ page }) => {
    await openApp(page)

    await page.getByTestId('tab-assist').click()
    await expect(page.getByTestId('chat-input')).toBeVisible()

    await page.getByTestId('chat-input').fill('Fastest gate now?')
    await page.getByTestId('chat-send').click()

    await expect(page.locator('.chat-bubble.user').last()).toContainText('Fastest gate now?')
  })
})
