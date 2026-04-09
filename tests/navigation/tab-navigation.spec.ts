// @ts-nocheck
import { expect, test } from '@playwright/test'
import { expectSingleVisiblePanel, openApp } from '../ui/testUtils'

test.describe('Tab navigation', () => {
  test('clicking tabs scrolls to expanded section and collapses previous', async ({ page }) => {
    await openApp(page)

    await page.getByTestId('tab-route').click()
    await expectSingleVisiblePanel(page, 'panel-route')

    const viewportRect = await page.getByTestId('expanded-tab-viewport').boundingBox()
    expect(viewportRect?.height ?? 0).toBeGreaterThan(500)

    await page.getByTestId('tab-ai').click()
    await expectSingleVisiblePanel(page, 'panel-ai')
  })

  test('only one tab has active state at a time', async ({ page }) => {
    await openApp(page)

    const tabs = ['overview', 'route', 'control', 'assist', 'ai'] as const
    for (const tab of tabs) {
      await page.getByTestId(`tab-${tab}`).click()
      for (const check of tabs) {
        const locator = page.getByTestId(`tab-${check}`)
        if (check === tab) {
          await expect(locator).toHaveClass(/active/)
        } else {
          await expect(locator).not.toHaveClass(/active/)
        }
      }
    }
  })
})
