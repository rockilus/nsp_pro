/**
 * End-to-end tests for TemplateViewer Apply Template functionality
 *
 * Tests cover:
 * - Opening template application dialog
 * - Template application for standard templates with rolling logic
 * - Template application for even/odd templates with year-based week matching
 * - Override vs additive mode functionality
 * - Date range validation and preview
 */

import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import { TemplateTestBase } from '../../utils/template-test-base';
import { TemplateType } from '../../../src/types/shift-demand-template';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe('TemplateViewer - Apply Template', () => {
  let templateTestBase: TemplateTestBase;

  test.beforeAll(async () => {
    // Setup once for all tests to avoid timeout issues
    templateTestBase = new TemplateTestBase();
    await templateTestBase.setupTemplateTests();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the page since setup is already done
    await templateTestBase.navigateToShiftDemandsPage(page);

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
  });

  test.describe('Template Application Dialog', () => {
    test('should open template application dialog when clicking apply button', async ({ page }) => {
      // Get the standard test template created during setup
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }

      // Select the template in the viewer
      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Click the apply button
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await expect(applyButton).toBeVisible();
      await applyButton.click();

      // Verify the application dialog is open
      const applicationDialog = templateTestBase.getTemplateApplicationDialog(page);
      await expect(applicationDialog).toBeVisible();

      // Verify dialog contains expected elements
      await expect(page.locator('text=Apply Template to Date Range')).toBeVisible();

      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.startDatePicker).toBeVisible();
      await expect(dialogElements.endDatePicker).toBeVisible();
      await expect(dialogElements.overwriteSwitch).toBeVisible();
      await expect(dialogElements.applyButton).toBeVisible();
      await expect(dialogElements.cancelButton).toBeVisible();
    });

    test('should close application dialog when clicking cancel', async ({ page }) => {
      // Get the standard test template created during setup
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Open the application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      const applicationDialog = templateTestBase.getTemplateApplicationDialog(page);
      await expect(applicationDialog).toBeVisible();

      // Click cancel
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.cancelButton.click();

      // Verify dialog is closed
      await expect(applicationDialog).not.toBeVisible();
    });

    test('should validate date range input', async ({ page }) => {
      // Get the standard test template created during setup
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Open the application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);

      // Initially, apply button should be disabled (no dates selected)
      await expect(dialogElements.applyButton).toBeDisabled();

      // Set start date
      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-01-01');

      // Apply button should still be disabled (no end date)
      await expect(dialogElements.applyButton).toBeDisabled();

      // Set end date before start date
      await templateTestBase.setApplicationDialogDate(page, 'end', '2023-12-31');

      // Apply button should be disabled (invalid range)
      await expect(dialogElements.applyButton).toBeDisabled();

      // Verify error message is shown
      await expect(page.locator('text=End date must be after start date')).toBeVisible();

      // Set valid end date
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-01-07');

      // Apply button should now be enabled
      await expect(dialogElements.applyButton).toBeEnabled();
    });

    test('should show template information in dialog header', async ({ page }) => {
      // Get the standard test template created during setup
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Open the application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Get the application dialog for scoped assertions
      const applicationDialog = templateTestBase.getTemplateApplicationDialog(page);
      await expect(applicationDialog).toBeVisible();

      // Verify template information is displayed in the dialog
      await expect(applicationDialog.locator(`text=${standardTemplate.name}`)).toBeVisible();
      await expect(applicationDialog.getByText('Standard', { exact: true })).toBeVisible(); // Template type
      await expect(applicationDialog.locator('text=Weeks: 2')).toBeVisible(); // Standard template has 2 weeks
    });
  });

  test.describe('Standard Template Application', () => {
    test('should apply standard template with rolling week logic', async ({ page }) => {
      // Get the standard test template created during setup
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }

      // Get the actual shift IDs created during setup
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0]; // First shift created (Morning Shift)

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Open application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Set a date range that covers 4 weeks to test rolling logic
      // The standard template has 2 weeks, so it should repeat twice
      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-01-01'); // Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-01-28'); // Sunday (4 weeks)

      // Ensure overwrite is enabled
      await templateTestBase.setApplicationDialogOverwrite(page, true);

      // Wait for validation to complete and apply button to be enabled
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });

      // Apply the template
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-01-01');

      // Verify the shift demands were applied in rolling fashion
      // The standard template has 2 weeks that should repeat:
      // Week 0 pattern applied to 2024-01-01 to 2024-01-07
      // Week 1 pattern applied to 2024-01-08 to 2024-01-14
      // Week 0 pattern applied again to 2024-01-15 to 2024-01-21
      // Week 1 pattern applied again to 2024-01-22 to 2024-01-28

      // Calculate expected values based on the template creation logic
      // Week 0, Monday (dayOfWeek=0, index=0): ((0 + 0 + 1) % 5) + 1 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-01', 2); // Monday, Week 0

      // Week 0, Friday (dayOfWeek=4, index=0): ((4 + 0 + 1) % 5) + 1 = 1
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-05', 1); // Friday, Week 0

      // Week 1, Monday (dayOfWeek=0, index=0): ((0 + 0) % 5) + 2 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-08', 2); // Monday, Week 1

      // Week 1, Tuesday (dayOfWeek=1, index=0): ((1 + 0) % 5) + 2 = 3
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-09', 3); // Tuesday, Week 1

      // Week 0 repeats - Monday (dayOfWeek=0, index=0): ((0 + 0 + 1) % 5) + 1 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-15', 2); // Monday, Week 0 (repeated)

      // Week 1 repeats - Monday (dayOfWeek=0, index=0): ((0 + 0) % 5) + 2 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-22', 2); // Monday, Week 1 (repeated)
    });

    test('should apply standard template with rolling logic for longer period', async ({
      page,
    }) => {
      // Get the standard test template created during setup (has 2 weeks)
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }

      // Get the actual shift IDs created during setup
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0]; // First shift created (Morning Shift)

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Open application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Set a date range that covers 5 weeks (should repeat pattern 2.5 times)
      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-02-05'); // Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-03-10'); // Sunday (5 weeks)

      // Apply the template
      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-02-05');

      // Verify rolling pattern: Week 0, Week 1, Week 0, Week 1, Week 0 (partial)
      // Week 0, Monday (dayOfWeek=0, index=0): ((0 + 0 + 1) % 5) + 1 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-02-05', 2); // Week 0 (first cycle)

      // Week 1, Monday (dayOfWeek=0, index=0): ((0 + 0) % 5) + 2 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-02-12', 2); // Week 1 (first cycle)

      // Week 0 repeats - Monday
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-02-19', 2); // Week 0 (second cycle)

      // Week 1 repeats - Monday
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-02-26', 2); // Week 1 (second cycle)

      // Week 0 repeats again - Monday
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-04', 2); // Week 0 (third cycle)
    });

    test('should handle standard template application starting mid-week', async ({ page }) => {
      // Get the standard test template (has demands across all days)
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }

      // Get the actual shift IDs created during setup
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0]; // First shift created (Morning Shift)

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Open application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Start on a Wednesday (mid-week)
      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-01-03'); // Wednesday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-01-09'); // Tuesday (1 week)

      // Apply the template
      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-01-03');

      // Verify that the first week is applied starting from Wednesday
      // Week 0, Wednesday (dayOfWeek=2, index=0): ((2 + 0 + 1) % 5) + 1 = 4
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-03', 4); // Wednesday (day 2 of template week 0)

      // Week 0, Thursday (dayOfWeek=3, index=0): ((3 + 0 + 1) % 5) + 1 = 5
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-04', 5); // Thursday

      // Week 0, Friday (dayOfWeek=4, index=0): ((4 + 0 + 1) % 5) + 1 = 1
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-05', 1); // Friday

      // Week 0, Saturday (dayOfWeek=5, index=0): ((5 + 0 + 1) % 5) + 1 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-06', 2); // Saturday

      // Week 0, Sunday (dayOfWeek=6, index=0): ((6 + 0 + 1) % 5) + 1 = 3
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-07', 3); // Sunday

      // Week 1, Monday (dayOfWeek=0, index=0): ((0 + 0) % 5) + 2 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-08', 2); // Monday (start of week 1)

      // Week 1, Tuesday (dayOfWeek=1, index=0): ((1 + 0) % 5) + 2 = 3
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-09', 3); // Tuesday
    });
  });

  test.describe('Even/Odd Template Application', () => {
    test('should apply even/odd template based on year week numbers', async ({ page }) => {
      // Get the even/odd test template created during setup
      const evenOddTemplate = templateTestBase.getEvenOddTestTemplate();
      if (!evenOddTemplate) {
        throw new Error('Even/odd test template not found');
      }

      // Get the actual shift IDs created during setup
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0]; // First shift created (Morning Shift)

      await templateTestBase.selectTemplateInViewer(page, evenOddTemplate.id);

      // Open application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Apply to a range that includes weeks 6, 7, 8 of 2024
      // Week 6 (even), Week 7 (odd), Week 8 (even)
      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-02-05'); // Week 6 Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-02-25'); // Week 8 Sunday

      // Apply the template
      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-02-05');

      // Verify even/odd pattern application
      // Week 6 is even, so it uses Week 0 pattern: Morning shift = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-02-05', 2); // Week 6 Monday (even week = template week 0)

      // Week 7 is odd, so it uses Week 1 pattern: Morning shift = 1
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-02-12', 1); // Week 7 Monday (odd week = template week 1)

      // Week 8 is even, so it uses Week 0 pattern: Morning shift = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-02-19', 2); // Week 8 Monday (even week = template week 0)
    });

    test('should correctly handle even/odd template for different year week ranges', async ({
      page,
    }) => {
      // Get the even/odd test template created during setup
      const evenOddTemplate = templateTestBase.getEvenOddTestTemplate();
      if (!evenOddTemplate) {
        throw new Error('Even/odd test template not found');
      }

      // Get the actual shift IDs created during setup
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0]; // First shift created (Morning Shift)

      await templateTestBase.selectTemplateInViewer(page, evenOddTemplate.id);

      // Apply to weeks 15, 16, 17 (odd, even, odd)
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-04-08'); // Week 15 Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-04-28'); // Week 17 Sunday

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-04-10');

      // Verify pattern: odd(15), even(16), odd(17)
      // Week 15 is odd, so it uses Week 1 pattern: Morning shift = 1
      // Wednesday (dayOfWeek=2)
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-04-10', 1); // Week 15 Wednesday (odd = template week 1, morning shift)

      // Week 16 is even, so it uses Week 0 pattern: Morning shift = 2
      // Wednesday (dayOfWeek=2)
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-04-17', 2); // Week 16 Wednesday (even = template week 0, morning shift)

      // Week 17 is odd, so it uses Week 1 pattern: Morning shift = 1
      // Wednesday (dayOfWeek=2)
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-04-24', 1); // Week 17 Wednesday (odd = template week 1, morning shift)
    });
  });

  test.describe('Override vs Additive Mode', () => {
    test('should override existing shift demands when overwrite is enabled', async ({ page }) => {
      // Get the standard test template and actual shift IDs
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0];

      // First, create some existing shift demands
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: morningShiftId,
        date: '2024-03-04', // Monday
        value: 100, // Use a value that's clearly different from template
      });

      await templateTestBase.createShiftDemandViaAPI({
        shiftId: morningShiftId,
        date: '2024-03-05', // Tuesday
        value: 200, // Use a value that's clearly different from template
      });

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Apply with overwrite enabled
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-03-04'); // Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-03-10'); // Sunday

      // Ensure overwrite is enabled (should be default)
      await templateTestBase.setApplicationDialogOverwrite(page, true);

      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-03-04');

      // Verify values were overridden with template values
      // Week 0, Monday (dayOfWeek=0, index=0): ((0 + 0 + 1) % 5) + 1 = 2
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-04', 2); // Was 100, now 2 (overridden)
      // Week 0, Tuesday (dayOfWeek=1, index=0): ((1 + 0 + 1) % 5) + 1 = 3
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-05', 3); // Was 200, now 3 (overridden)
    });

    test('should add to existing shift demands when overwrite is disabled', async ({ page }) => {
      // Get the standard test template and actual shift IDs
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0];

      // First, create some existing shift demands
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: morningShiftId,
        date: '2024-03-11', // Monday
        value: 10,
      });

      await templateTestBase.createShiftDemandViaAPI({
        shiftId: morningShiftId,
        date: '2024-03-12', // Tuesday
        value: 10,
      });

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Apply with overwrite disabled
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-03-11'); // Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-03-17'); // Sunday

      // Disable overwrite (set to additive mode)
      await templateTestBase.setApplicationDialogOverwrite(page, false);

      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-03-11');

      // Verify values were added together
      // Week 0, Monday (dayOfWeek=0, index=0): ((0 + 0 + 1) % 5) + 1 = 2
      // Existing 10 + template 2 = 12
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-11', 12);
      // Week 0, Tuesday (dayOfWeek=1, index=0): ((1 + 0 + 1) % 5) + 1 = 3
      // Existing 10 + template 3 = 13
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-12', 13);
    });

    test('should handle mixed scenarios (some existing, some new demands)', async ({ page }) => {
      // Get the standard test template and actual shift IDs
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0];

      // Create existing demands for only some days
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: morningShiftId,
        date: '2024-03-18', // Monday - has existing
        value: 5,
      });
      // Tuesday - no existing demand
      // Wednesday - no existing demand
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: morningShiftId,
        date: '2024-03-21', // Thursday - has existing
        value: 5,
      });

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Apply in additive mode
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-03-18'); // Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-03-24'); // Sunday

      await templateTestBase.setApplicationDialogOverwrite(page, false);

      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-03-18');

      // Verify mixed results
      // Monday: Week 0, dayOfWeek=0: ((0 + 0 + 1) % 5) + 1 = 2
      // Existing 5 + template 2 = 7
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-18', 7);
      // Tuesday: Week 0, dayOfWeek=1: ((1 + 0 + 1) % 5) + 1 = 3
      // No existing, just template = 3
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-19', 3);
      // Wednesday: Week 0, dayOfWeek=2: ((2 + 0 + 1) % 5) + 1 = 4
      // No existing, just template = 4
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-20', 4);
      // Thursday: Week 0, dayOfWeek=3: ((3 + 0 + 1) % 5) + 1 = 5
      // Existing 5 + template 5 = 10
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-03-21', 10);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle template application across year boundary', async ({ page }) => {
      // Get the even/odd test template and actual shift IDs
      const evenOddTemplate = templateTestBase.getEvenOddTestTemplate();
      if (!evenOddTemplate) {
        throw new Error('Even/odd test template not found');
      }
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0];

      await templateTestBase.selectTemplateInViewer(page, evenOddTemplate.id);

      // Apply across 2023-2024 boundary (weeks 52, 53 of 2023 and week 1 of 2024)
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(page, 'start', '2023-12-25'); // Week 52 Monday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-01-07'); // Week 1 Sunday of 2024

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2023-12-25');

      // Verify year boundary handling (week numbers should be calculated per year)
      // 2023 Week 52 (even) = template Week 0 (Morning shift = 2)
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2023-12-25', 2);
      // 2024 Week 1 (odd) = template Week 1 (Morning shift = 1)
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-01-01', 1);
    });

    test('should handle single day application', async ({ page }) => {
      // Get the standard test template and actual shift IDs
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error('Standard test template not found');
      }
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0];

      await templateTestBase.selectTemplateInViewer(page, standardTemplate.id);

      // Apply to just one day (Wednesday)
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-04-03'); // Wednesday
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-04-03'); // Same Wednesday

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, '2024-04-03');

      // Verify single day application
      // Week 0, Wednesday (dayOfWeek=2, index=0): ((2 + 0 + 1) % 5) + 1 = 4
      await templateTestBase.verifyShiftDemandValue(page, morningShiftId, '2024-04-03', 4);
    });

    test('should handle empty template application', async ({ page }) => {
      // Create an empty template via API (no demands)
      const templateId = await templateTestBase.createTemplateViaAPI({
        name: 'Empty Template',
        description: 'Template with no demands',
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(page, 'start', '2024-05-01');
      await templateTestBase.setApplicationDialogDate(page, 'end', '2024-05-07');

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements = templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });
      await dialogElements.applyButton.click();

      // Close the template management window
      await templateTestBase.closeTemplateManagementWindow(page);

      // Navigate to the period manually using localStorage (since navigateToPeriod expects demands to exist)
      const targetDate = dayjs('2024-05-01');
      await page.evaluate((dateStr) => {
        const periodState = {
          currentDate: dateStr,
          periodType: 'month',
        };
        localStorage.setItem('nsp_pro_period_state', JSON.stringify(periodState));
      }, targetDate.toISOString());

      // Reload to apply the period state
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Wait for the shift demand table to be visible
      const shiftDemandTable = page.locator('[data-testid="shift-demand-table"]');
      await expect(shiftDemandTable).toBeVisible({ timeout: 10000 });

      // Get actual shift IDs
      const shiftIds = templateTestBase.getCreatedShiftIds();
      const morningShiftId = shiftIds[0];

      // Verify no demands were created by checking that the value element doesn't exist or is empty
      const valueSelector = `[data-testid="shift-demand-value-${morningShiftId}-2024-05-01"]`;
      const valueElement = page.locator(valueSelector);
      const exists = (await valueElement.count()) > 0;

      if (exists) {
        const text = await valueElement.textContent();
        expect(text === '' || text === '0').toBeTruthy();
      }
      // If element doesn't exist, that's also valid (no demand was created)
    });
  });
});
