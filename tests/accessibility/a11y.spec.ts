// @ts-nocheck
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { openApp } from '../ui/testUtils'

test.describe('Accessibility checks', () => {
  test('axe checks and keyboard focus order baseline', async ({ page }) => {
    await openApp(page)

    const axe = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])

    const result = await axe.analyze()
    expect(result.violations).toEqual([])

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })

  test('aria labels are present for key regions', async ({ page }) => {
    await openApp(page)

    await expect(page.getByLabel('Dashboard tabs')).toBeVisible()
    await expect(page.getByLabel('Map zoom levels')).toBeVisible()
    await expect(page.getByLabel('Stadium map')).toBeVisible()
  })
})
