// @ts-nocheck
import { expect, type Locator, type Page } from '@playwright/test'

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('twin-viewport')).toBeVisible()
}

export async function expectSingleVisiblePanel(page: Page, activePanelId: string) {
  const panelIds = ['panel-overview', 'panel-route', 'panel-control', 'panel-assist', 'panel-ai']
  for (const id of panelIds) {
    const panel = page.getByTestId(id)
    if (id === activePanelId) {
      await expect(panel).toBeVisible()
    } else {
      await expect(panel).toHaveCount(0)
    }
  }
}

export async function overlapCount(labels: Locator) {
  return labels.evaluateAll((elements) => {
    const visible = elements
      .filter((el) => {
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.15
      })
      .map((el) => el.getBoundingClientRect())

    let overlaps = 0
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        const a = visible[i]
        const b = visible[j]
        const intersects = !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top)
        if (intersects) overlaps += 1
      }
    }
    return overlaps
  })
}
