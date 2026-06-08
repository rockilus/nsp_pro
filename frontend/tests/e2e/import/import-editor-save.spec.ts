/**
 * E2E tests for import editor inline edit + auto-save.
 *
 * Verifies that editing a value in the import editor persists
 * to the backend via the auto-save mechanism.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';
import { testConfig } from '../../utils/test-config';

test.describe('Import Editor — Save', () => {
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
    await page.goto(`${testConfig.frontendUrl}/en/admin/import/editor?id=${importId}`);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should save edited worker name via auto-save', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Wait for editor to load
    await page.waitForSelector('[data-testid="import-merge-btn"]', { timeout: 10000 });

    // Find Alice's name cell and double-click to edit
    // The EditableCell component makes cells editable on double-click
    const aliceCell = page.locator('td:has-text("Alice")').first();
    await aliceCell.dblclick();

    // Type new name
    const input = page.locator('input').first();
    await input.fill('Alice Updated');

    // Press Enter to commit
    await input.press('Enter');

    // Wait for auto-save (the status text should show "All changes saved")
    await page.waitForFunction(
      () => {
        return document.body.textContent?.includes('All changes saved');
      },
      { timeout: 10000 },
    );

    // Navigate away and back to verify persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify Alice's name is still "Alice Updated"
    const updatedCell = page.locator('td:has-text("Alice Updated")');
    await expect(updatedCell.first()).toBeVisible({ timeout: 5000 });

    console.log('✅ Editor auto-save: name change persisted');
  });
});
