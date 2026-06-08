/**
 * E2E tests for assignment date filtering during merge.
 *
 * Verifies that only assignments within the selected date range
 * are created in the database.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';

test.describe('Import Merge — Date Filter', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    const importId = await testBase.createImportViaApi();

    await testBase.actAsAdmin(page);
    await page.goto(`/en/admin/import/merge?id=${importId}`);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should only create assignments within selected date range', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Step 1: Select team + resolve
    const selectTrigger = page.locator('[data-testid="merge-team-select"]');
    await selectTrigger.click();
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();

    const resolveBtn = page.locator('[data-testid="merge-resolve-btn"]');
    await resolveBtn.click();
    await page.waitForSelector('[data-testid="merge-step2-next"]', { timeout: 10000 });

    // Step 2: Set narrow date filter (1 day only)
    const filterRadio = page.locator('[data-testid="merge-assignments-filter-period"]');
    await filterRadio.click();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day1 = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const startInput = page.locator('[data-testid="merge-period-start"]');
    await startInput.fill(day1);

    const endInput = page.locator('[data-testid="merge-period-end"]');
    await endInput.fill(day1);

    // Verify reduced count
    const assignCount = page.locator('[data-testid="merge-assignment-count"]');
    await expect(assignCount).toBeVisible();
    const countText = await assignCount.textContent();
    console.log(`Filtered assignment count: ${countText}`);
    // With only day 1, we should have 2 assignments (Alice→MS, Bob→MS)

    // Execute merge
    await page.locator('[data-testid="merge-step2-next"]').click();
    await page.waitForSelector('[data-testid="merge-execute-btn"]', { timeout: 5000 });
    await page.locator('[data-testid="merge-execute-btn"]').click();

    // Wait for result
    await page.waitForSelector('[data-testid="merge-result-assignments-created"]', {
      timeout: 15000,
    });

    // Verify the assignments created count is 2 (only day 1)
    const assignResult = page.locator('[data-testid="merge-result-assignments-created"] .text-xl');
    const resultText = await assignResult.textContent();
    expect(resultText).toBe('2'); // 2 assignments on day 1

    console.log('✅ Date filter: only 2 assignments from day 1 created');
  });
});
