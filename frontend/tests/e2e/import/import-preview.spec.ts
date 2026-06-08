/**
 * E2E tests for import preview + creation via Excel upload.
 *
 * Verifies that uploading an Excel file shows correct preview data
 * and creates a persisted import record.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';
import { buildImportExcel, writeExcelToTempFile } from '../../fixtures/import-fixture';

test.describe('Import Preview & Create', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await testBase.actAsAdmin(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should preview uploaded Excel with correct counts', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Navigate to import page
    await page.goto('/en/admin/import');
    await page.waitForLoadState('domcontentloaded');

    // Open create dialog
    const createBtn = page.locator('button:has-text("Create Import")');
    await createBtn.click();

    // Upload the Excel fixture
    const buf = buildImportExcel(10);
    const filePath = writeExcelToTempFile(buf);
    const fileInput = page.locator('[data-testid="import-file-input"]');
    await fileInput.setInputFiles(filePath);

    // Click Upload & Preview
    const uploadBtn = page.locator('[data-testid="import-upload-btn"]');
    await uploadBtn.click();

    // Verify preview summary
    const previewSummary = page.locator('[data-testid="import-preview-summary"]');
    await expect(previewSummary).toBeVisible({ timeout: 10000 });
    const summaryText = await previewSummary.textContent();
    expect(summaryText).toContain('3');
    expect(summaryText).toContain('workers');
    expect(summaryText).toContain('shifts');

    console.log('✅ Preview summary shows correct counts');
  });

  test('should create import record from preview', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Navigate to import page
    await page.goto('/en/admin/import');
    await page.waitForLoadState('domcontentloaded');

    // Open create dialog
    const createBtn = page.locator('button:has-text("Create Import")');
    await createBtn.click();

    // Upload the Excel fixture
    const buf = buildImportExcel(10);
    const filePath = writeExcelToTempFile(buf);
    const fileInput = page.locator('[data-testid="import-file-input"]');
    await fileInput.setInputFiles(filePath);

    // Click Upload & Preview
    const uploadBtn = page.locator('[data-testid="import-upload-btn"]');
    await uploadBtn.click();

    // Wait for preview
    await page.waitForSelector('[data-testid="import-preview-summary"]', { timeout: 10000 });

    // Click Create & Open
    const createImportBtn = page.locator('[data-testid="import-create-btn"]');
    await createImportBtn.click();

    // Verify navigation to editor
    await page.waitForURL(/\/admin\/import\/editor\?id=/, { timeout: 10000 });
    const url = new URL(page.url());
    const importId = url.searchParams.get('id');
    expect(importId).toBeTruthy();

    console.log(`✅ Created import record: ${importId}`);
  });
});
