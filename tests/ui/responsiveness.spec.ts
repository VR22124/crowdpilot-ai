// @ts-nocheck
import { expect, test } from '@playwright/test'

const sizes = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
]

for (const size of sizes) {
  test(`responsive layout at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.goto('/')

    const twin = page.getByTestId('twin-viewport')
    await expect(twin).toBeVisible()

    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > window.innerWidth,
      y: document.documentElement.scrollHeight > window.innerHeight * 2,
    }))

    expect(overflow.x).toBe(false)
    await expect(page.getByTestId('tabs-nav')).toBeVisible()
    await expect(page.getByTestId('stadium-canvas')).toBeVisible()
  })
}
