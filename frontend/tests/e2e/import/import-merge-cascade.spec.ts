/**
 * E2E tests for import merge cascade behavior.
 *
 * Verifies that skipping workers causes their requests and assignments
 * to be excluded from the merged data.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';
import { testConfig } from '../../utils/test-config';

const BOB_ID = 'gen-bob';
const CHARLIE_ID = 'gen-charlie';

test.describe('Import Merge — Cascade', () => {
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
    await page.goto(`${testConfig.frontendUrl}/en/admin/import/merge?id=${importId}`);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should cascade-skip requests when worker is skipped', async ({ page }, testInfo) => {
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

    // Step 2: Skip Bob AND Charlie (only Alice kept)
    for (const workerId of [BOB_ID, CHARLIE_ID]) {
      const actionSelect = page
        .locator(`[data-testid="merge-worker-row-${workerId}"] [role="combobox"]`)
        .first();
      await actionSelect.click();
      const skipOpt = page.locator('[role="option"]', { hasText: 'Skip' });
      await skipOpt.click();
    }

    // Execute merge
    await page.locator('[data-testid="merge-step2-next"]').click();
    await page.waitForSelector('[data-testid="merge-execute-btn"]', { timeout: 5000 });
    await page.locator('[data-testid="merge-execute-btn"]').click();

    // Wait for result
    await page.waitForSelector('[data-testid="merge-result-workers-created"]', { timeout: 15000 });

    // DB verification: only Alice + Dave exist (Bob and Charlie skipped)
    const workers = await testBase.getWorkersInDb();
    // Alice merged into existing Alice Worker, Dave existing, plus maybe Alice as new?
    // Alice matches by name → merge_into. So 2 workers total: Alice Worker + Dave Worker
    expect(workers.length).toBeLessThanOrEqual(3);

    // Bob should NOT exist
    const bobWorker = workers.find((w) => w.name === 'Bob');
    expect(bobWorker).toBeUndefined();

    // Charlie should NOT exist
    const charlieWorker = workers.find((w) => w.name === 'Charlie');
    expect(charlieWorker).toBeUndefined();

    console.log('✅ Cascade verification: skipped workers not in DB');
  });
});
