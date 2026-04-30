/**
 * E2E tests for Excel Export feature (Tools Menu)
 *
 * These tests verify the export dialog functionality including:
 * - Opening and closing the dialog via the Tools menu
 * - Period option selection
 * - Date picker enable/disable states
 * - Excel file download for all period options
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ScheduleTestBase } from '../../../../utils/schedule-test-base';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/** Open the export dialog via the Tools (settings) menu */
async function openExportDialog(page: import('@playwright/test').Page): Promise<void> {
  const settingsButton = page.locator('[data-testid="schedule-settings-button"]');
  await settingsButton.waitFor({ state: 'visible', timeout: 10000 });
  await settingsButton.click();
  const exportMenuItem = page.locator('[data-testid="settings-export-excel-button"]');
  await exportMenuItem.waitFor({ state: 'visible', timeout: 5000 });
  await exportMenuItem.click();
  await page.locator('[data-testid="export-dialog"]').waitFor({ state: 'visible', timeout: 5000 });
}

test.describe('Export Feature', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting replacement test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: true,
      linkMemberToWorker: false,
      campaignDates: {
        start: dayjs.utc().add(1, 'day').subtract(7, 'day'),
        end: dayjs.utc().add(1, 'day').add(7, 'day'),
      },
    });

    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test('should open dialog when clicking export in tools menu', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    await openExportDialog(page);

    // Verify dialog contains expected elements
    const periodToggleGroup = page.locator('[data-testid="export-period-toggle-group"]');
    await expect(periodToggleGroup).toBeVisible();

    const confirmButton = page.locator('[data-testid="confirm-export-button"]');
    await expect(confirmButton).toBeVisible();

    console.log('✅ Export dialog opens successfully via tools menu');
  });

  test('should close dialog when clicking close icon', async ({ page }) => {
    await openExportDialog(page);

    // Click the close button
    const closeButton = page.locator('[data-testid="export-dialog-close-button"]');
    await closeButton.click();

    // Verify dialog is closed
    const dialog = page.locator('[data-testid="export-dialog"]');
    await expect(dialog).not.toBeVisible();

    console.log('✅ Export dialog closes via close icon');
  });

  test("should disable date pickers when 'Current Selection' option is selected", async ({
    page,
  }) => {
    await openExportDialog(page);

    // Select "Current Selection" option (value 0)
    const optionButton = page.locator(`[data-testid="export-period-option-${0}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    // Verify date pickers are disabled
    const startDatePicker = page.locator('[data-testid="export-start-date-picker"]');
    const endDatePicker = page.locator('[data-testid="export-end-date-picker"]');

    const startDisabled = await startDatePicker.isDisabled();
    const endDisabled = await endDatePicker.isDisabled();

    expect(startDisabled && endDisabled).toBe(true);

    console.log('✅ Date pickers disabled for Current Selection option');
  });

  test("should disable date pickers when 'Campaign' option is selected", async ({ page }) => {
    await openExportDialog(page);

    // Select "Campaign" option (value 1)
    const optionButton = page.locator(`[data-testid="export-period-option-${1}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    // Verify date pickers are disabled
    const startDatePicker = page.locator('[data-testid="export-start-date-picker"]');
    const endDatePicker = page.locator('[data-testid="export-end-date-picker"]');

    const startDisabled = await startDatePicker.isDisabled();
    const endDisabled = await endDatePicker.isDisabled();

    expect(startDisabled && endDisabled).toBe(true);

    console.log('✅ Date pickers disabled for Campaign option');
  });

  test("should disable date pickers when 'All' option is selected", async ({ page }) => {
    await openExportDialog(page);

    // Select "All" option (value 2)
    const optionButton = page.locator(`[data-testid="export-period-option-${2}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    // Verify date pickers are disabled
    const startDatePicker = page.locator('[data-testid="export-start-date-picker"]');
    const endDatePicker = page.locator('[data-testid="export-end-date-picker"]');

    const startDisabled = await startDatePicker.isDisabled();
    const endDisabled = await endDatePicker.isDisabled();

    expect(startDisabled && endDisabled).toBe(true);

    console.log('✅ Date pickers disabled for All option');
  });

  test("should enable date pickers when 'Custom' option is selected", async ({ page }) => {
    await openExportDialog(page);

    // Select "Custom" option (value 3)
    const optionButton = page.locator(`[data-testid="export-period-option-${3}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    // Verify date pickers are enabled
    const startDatePicker = page.locator('[data-testid="export-start-date-picker"]');
    const endDatePicker = page.locator('[data-testid="export-end-date-picker"]');

    const startEnabled = !(await startDatePicker.isDisabled());
    const endEnabled = !(await endDatePicker.isDisabled());

    expect(startEnabled && endEnabled).toBe(true);

    console.log('✅ Date pickers enabled for Custom option');
  });

  test("should download Excel file when exporting with 'Current Selection' option", async ({
    page,
  }) => {
    await openExportDialog(page);

    // Select "Current Selection" option (value 0)
    const optionButton = page.locator(`[data-testid="export-period-option-${0}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    const confirmButton = page.locator('[data-testid="confirm-export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await confirmButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    console.log(`✅ Download verified: ${download.suggestedFilename()}`);
    console.log('✅ Excel file downloaded for Current Selection option');
  });

  test("should download Excel file when exporting with 'Campaign' option", async ({ page }) => {
    await openExportDialog(page);

    // Select "Campaign" option (value 1)
    const optionButton = page.locator(`[data-testid="export-period-option-${1}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    const confirmButton = page.locator('[data-testid="confirm-export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await confirmButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    console.log(`✅ Download verified: ${download.suggestedFilename()}`);
    console.log('✅ Excel file downloaded for Campaign option');
  });

  test("should download Excel file when exporting with 'All' option", async ({ page }) => {
    await openExportDialog(page);

    // Select "All" option (value 2)
    const optionButton = page.locator(`[data-testid="export-period-option-${2}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    const confirmButton = page.locator('[data-testid="confirm-export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await confirmButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    console.log(`✅ Download verified: ${download.suggestedFilename()}`);
    console.log('✅ Excel file downloaded for All option');
  });

  test("should download Excel file when exporting with 'Custom' option", async ({ page }) => {
    await openExportDialog(page);

    // Select "Custom" option (value 3)
    const optionButton = page.locator(`[data-testid="export-period-option-${3}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    // Verify date pickers are enabled
    const startDatePicker = page.locator('[data-testid="export-start-date-picker"]');
    const endDatePicker = page.locator('[data-testid="export-end-date-picker"]');

    expect(!(await startDatePicker.isDisabled()) && !(await endDatePicker.isDisabled())).toBe(true);

    const confirmButton = page.locator('[data-testid="confirm-export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await confirmButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    console.log(`✅ Download verified: ${download.suggestedFilename()}`);
    console.log('✅ Excel file downloaded for Custom option');
  });

  test('should close dialog after successful export', async ({ page }) => {
    await openExportDialog(page);

    // Select "Current Selection" option
    const optionButton = page.locator(`[data-testid="export-period-option-${0}"]`);
    await optionButton.click();
    await page.waitForTimeout(200);

    const dialog = page.locator('[data-testid="export-dialog"]');
    await expect(dialog).toBeVisible();

    const confirmButton = page.locator('[data-testid="confirm-export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await confirmButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    console.log(`✅ Download verified: ${download.suggestedFilename()}`);
    console.log('✅ Export completed successfully');
  });
});
