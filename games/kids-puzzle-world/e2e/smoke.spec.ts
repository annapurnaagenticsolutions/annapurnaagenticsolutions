import { test, expect } from '@playwright/test'

test('should load the world map', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Kids Puzzle World')
  await expect(page.locator('text=Kids Puzzle World')).toBeVisible()
})

test('should navigate to a region', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Pattern Forest')
  await expect(page).toHaveURL(/\/region\/pattern-forest/)
  await expect(page.locator('text=PATTERN FOREST')).toBeVisible()
})

test('should navigate to a puzzle level', async ({ page }) => {
  await page.goto('/region/pattern-forest')
  await page.click('button:nth-child(1)')
  await expect(page).toHaveURL(/\/puzzle\/pattern-forest\/level-1/)
})
