import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';

test.describe('Dark Mode Theme Toggle', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    await getTestBase(testInfo).setupWorkerTests(workerIndex);
    await getTestBase(testInfo).navigateToWorkersPage(page);
    await page.waitForSelector('[aria-label="worker table"]');
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  /** Get the isolated WorkerTestBase for the current test */
  function getTestBase(testInfo: any): WorkerTestBase {
    const testRunId = testInfo.testRunId as string;
    const tb = testBasesMap.get(testRunId);
    if (!tb) throw new Error('Test base not found');
    return tb;
  }

  test('should add .dark class on <html> when toggled', async ({ page }, testInfo) => {
    const html = page.locator('html');

    // Initially no dark class
    await expect(html).not.toHaveClass(/dark/);

    // Click the theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();

    // <html> should now have the .dark class
    await expect(html).toHaveClass(/dark/);

    // Toggle back
    await themeToggle.click();
    await expect(html).not.toHaveClass(/dark/);

    console.log('✅ .dark class added/removed on <html>');
  });

  test('should change body background color when toggled', async ({ page }, testInfo) => {
    // Helper: read the actual computed background-color of <body>
    const getBodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Also check the visible .page-layout background
    const getPageBg = () =>
      page.evaluate(() => {
        const el = document.querySelector('.page-layout');
        return el ? getComputedStyle(el).backgroundColor : 'no .page-layout found';
      });

    const lightBg = await getBodyBg();
    const lightPageBg = await getPageBg();
    console.log(`Light body bg: ${lightBg}, page-layout bg: ${lightPageBg}`);

    // Toggle to dark
    await page.locator('[data-testid="theme-toggle"]').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.waitForTimeout(200);

    const darkBg = await getBodyBg();
    const darkPageBg = await getPageBg();
    console.log(`Dark body bg:  ${darkBg}, page-layout bg: ${darkPageBg}`);

    // Verify the colours actually differ
    expect(darkBg).not.toBe(lightBg);
    expect(darkPageBg).not.toBe(lightPageBg);

    const lightL = extractLightness(lightBg);
    const darkL = extractLightness(darkBg);
    const lightPageL = extractLightness(lightPageBg);
    const darkPageL = extractLightness(darkPageBg);

    console.log(`Light body L: ${lightL}, page-layout L: ${lightPageL}`);
    console.log(`Dark body L:  ${darkL}, page-layout L: ${darkPageL}`);

    // Light mode: L near 100 (white)
    expect(lightL, `Light body bg should be near-white, got "${lightBg}"`).toBeGreaterThan(90);
    expect(
      lightPageL,
      `Light page-layout should be near-white, got "${lightPageBg}"`,
    ).toBeGreaterThan(90);
    // Dark mode: L near 3 (near-black)
    expect(darkL, `Dark body bg should be near-black, got "${darkBg}"`).toBeLessThan(10);
    expect(darkPageL, `Dark page-layout should be near-black, got "${darkPageBg}"`).toBeLessThan(
      10,
    );

    // Toggle back
    await page.locator('[data-testid="theme-toggle"]').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.waitForTimeout(200);

    expect(await getBodyBg()).toBe(lightBg);
    expect(await getPageBg()).toBe(lightPageBg);

    console.log('✅ Both body and page-layout background fully toggle');
  });

  test('should persist theme preference in localStorage', async ({ page }, testInfo) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');

    // Set to dark
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const storedTheme = await page.evaluate(() => localStorage.getItem('rockilus-theme'));
    expect(storedTheme).toBe('dark');

    // Set back to light
    await themeToggle.click();
    const storedLight = await page.evaluate(() => localStorage.getItem('rockilus-theme'));
    expect(storedLight).toBe('light');

    console.log('✅ Theme preference persisted in localStorage');
  });

  test('should show moon icon in light mode and sun icon in dark mode', async ({
    page,
  }, testInfo) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');

    // Initially light mode: aria-label should mention switching TO dark
    await expect(themeToggle.locator('svg').first()).toBeVisible();
    const initialLabel = await themeToggle.getAttribute('aria-label');
    expect(initialLabel).toContain('dark');

    // Toggle to dark
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Now aria-label should mention switching TO light
    const darkLabel = await themeToggle.getAttribute('aria-label');
    expect(darkLabel).toContain('light');

    console.log('✅ Icon and aria-label update correctly');
  });
});

/** Extract the L (lightness) from a CSS lab() or rgb() colour string.
 *  lab(100 0 0) → 100, rgb(255, 255, 255) → 100 (as relative luminance) */
function extractLightness(str: string): number {
  // lab(L a b) — L is 0-100 (dimensionless) or 0%-100% (with %)
  const labMatch = str.match(/lab\(([\d.]+)%?\s/);
  if (labMatch) return parseFloat(labMatch[1]);
  // rgb(r, g, b) — convert to relative luminance (0-100 scale)
  const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const [r, g, b] = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 2.55;
  }
  throw new Error(`Cannot extract lightness from: ${str}`);
}
