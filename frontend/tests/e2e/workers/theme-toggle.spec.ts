import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';

test.describe('Theme Selector (Account Menu)', () => {
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

  /** Open the account menu and return the theme selector locator */
  async function openThemeSelector(page: import('@playwright/test').Page) {
    const menuTrigger = page.locator('[aria-label="account of current user"]');
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();
    const selector = page.locator('[data-testid="theme-selector"]');
    await expect(selector).toBeVisible();
    return selector;
  }

  test('should add .dark class on <html> when dark mode selected', async ({ page }, testInfo) => {
    const html = page.locator('html');

    // Initially no dark class
    await expect(html).not.toHaveClass(/dark/);

    await openThemeSelector(page);

    // Click dark mode button
    const darkBtn = page.locator('[data-testid="theme-selector-dark"]');
    await darkBtn.click();

    // <html> should now have the .dark class
    await expect(html).toHaveClass(/dark/);

    // Switch back to light
    await openThemeSelector(page);
    const lightBtn = page.locator('[data-testid="theme-selector-light"]');
    await lightBtn.click();
    await expect(html).not.toHaveClass(/dark/);

    console.log('✅ .dark class added/removed on <html> via segmented control');
  });

  test('should change body background color when switching modes', async ({ page }, testInfo) => {
    const getBodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    const getPageBg = () =>
      page.evaluate(() => {
        const el = document.querySelector('.page-layout');
        return el ? getComputedStyle(el).backgroundColor : 'no .page-layout found';
      });

    const lightBg = await getBodyBg();
    const lightPageBg = await getPageBg();
    console.log(`Light body bg: ${lightBg}, page-layout bg: ${lightPageBg}`);

    // Switch to dark via account menu
    await openThemeSelector(page);
    await page.locator('[data-testid="theme-selector-dark"]').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.waitForTimeout(200);

    const darkBg = await getBodyBg();
    const darkPageBg = await getPageBg();
    console.log(`Dark body bg:  ${darkBg}, page-layout bg: ${darkPageBg}`);

    expect(darkBg).not.toBe(lightBg);
    expect(darkPageBg).not.toBe(lightPageBg);

    const lightL = extractLightness(lightBg);
    const darkL = extractLightness(darkBg);
    const lightPageL = extractLightness(lightPageBg);
    const darkPageL = extractLightness(darkPageBg);

    console.log(`Light body L: ${lightL}, page-layout L: ${lightPageL}`);
    console.log(`Dark body L:  ${darkL}, page-layout L: ${darkPageL}`);

    expect(lightL, `Light body bg should be near-white, got "${lightBg}"`).toBeGreaterThan(90);
    expect(
      lightPageL,
      `Light page-layout should be near-white, got "${lightPageBg}"`,
    ).toBeGreaterThan(90);
    expect(darkL, `Dark body bg should be near-black, got "${darkBg}"`).toBeLessThan(10);
    expect(darkPageL, `Dark page-layout should be near-black, got "${darkPageBg}"`).toBeLessThan(
      10,
    );

    // Switch back to light
    await openThemeSelector(page);
    await page.locator('[data-testid="theme-selector-light"]').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.waitForTimeout(200);

    expect(await getBodyBg()).toBe(lightBg);
    expect(await getPageBg()).toBe(lightPageBg);

    console.log('✅ Both body and page-layout background fully toggle');
  });

  test('should persist theme preference via next-themes', async ({ page }, testInfo) => {
    await openThemeSelector(page);

    // Set to dark
    await page.locator('[data-testid="theme-selector-dark"]').click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedTheme).toBe('dark');

    // Set to auto (system)
    await openThemeSelector(page);
    await page.locator('[data-testid="theme-selector-auto"]').click();
    const storedSystem = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedSystem).toBe('system');

    console.log('✅ Theme preference persisted in localStorage (next-themes key)');
  });

  test('should show active state on the selected mode button', async ({ page }, testInfo) => {
    await openThemeSelector(page);

    const lightBtn = page.locator('[data-testid="theme-selector-light"]');
    const darkBtn = page.locator('[data-testid="theme-selector-dark"]');
    const autoBtn = page.locator('[data-testid="theme-selector-auto"]');

    // Default is system — auto should have accent background
    await expect(autoBtn).toHaveClass(/bg-accent/);

    // Click dark
    await darkBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await openThemeSelector(page);
    await expect(page.locator('[data-testid="theme-selector-dark"]')).toHaveClass(/bg-accent/);

    // Click light
    await page.locator('[data-testid="theme-selector-light"]').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await openThemeSelector(page);
    await expect(page.locator('[data-testid="theme-selector-light"]')).toHaveClass(/bg-accent/);

    console.log('✅ Active state updates correctly on segmented control');
  });

  test('should respect system preference in auto mode', async ({ page }, testInfo) => {
    await openThemeSelector(page);

    // Set to auto
    await page.locator('[data-testid="theme-selector-auto"]').click();

    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(300);
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Emulate light color scheme
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(300);
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    console.log('✅ Auto mode respects system/browser color scheme preference');
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
