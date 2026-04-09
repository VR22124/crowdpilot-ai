// @ts-nocheck
import { expect, test } from '@playwright/test'
import { openApp } from '../ui/testUtils'

test.describe('Zoom levels', () => {
  test('out/mid/in toggles maintain expected classes and no layout shift spikes', async ({ page }) => {
    await openApp(page)

    const before = await page.getByTestId('stadium-canvas').boundingBox()

    await page.getByTestId('zoom-out').click()
    await expect(page.getByTestId('stadium-svg')).toHaveAttribute('data-zoom-level', 'out')

    await page.getByTestId('zoom-mid').click()
    await expect(page.getByTestId('stadium-svg')).toHaveAttribute('data-zoom-level', 'mid')

    await page.getByTestId('zoom-in').click()
    await expect(page.getByTestId('stadium-svg')).toHaveAttribute('data-zoom-level', 'in')

    const after = await page.getByTestId('stadium-canvas').boundingBox()
    expect(before?.height).toBeTruthy()
    expect(after?.height).toBeTruthy()
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(4)
  })
})
