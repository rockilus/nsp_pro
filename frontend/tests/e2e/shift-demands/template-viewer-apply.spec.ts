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

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { TemplateTestBase } from "../../utils/template-test-base";
import { TemplateType } from "../../../src/types/shift-demand-template";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("TemplateViewer - Apply Template", () => {
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

  test.describe("Template Application Dialog", () => {
    test("should open template application dialog when clicking apply button", async ({
      page,
    }) => {
      // Create a template via API to test with
      const templateId = await templateTestBase.createTemplateViaAPI({
        name: "Test Apply Template",
        description: "Template for apply functionality testing",
      });

      // Select the template in the viewer
      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Click the apply button
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await expect(applyButton).toBeVisible();
      await applyButton.click();

      // Verify the application dialog is open
      const applicationDialog =
        templateTestBase.getTemplateApplicationDialog(page);
      await expect(applicationDialog).toBeVisible();

      // Verify dialog contains expected elements
      await expect(
        page.locator("text=Apply Template to Date Range")
      ).toBeVisible();

      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.startDatePicker).toBeVisible();
      await expect(dialogElements.endDatePicker).toBeVisible();
      await expect(dialogElements.overwriteSwitch).toBeVisible();
      await expect(dialogElements.applyButton).toBeVisible();
      await expect(dialogElements.cancelButton).toBeVisible();
    });

    test("should close application dialog when clicking cancel", async ({
      page,
    }) => {
      // Create and select a template
      const templateId = await templateTestBase.createTemplateViaAPI({
        name: "Test Cancel Template",
        description: "Template for cancel testing",
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Open the application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      const applicationDialog =
        templateTestBase.getTemplateApplicationDialog(page);
      await expect(applicationDialog).toBeVisible();

      // Click cancel
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.cancelButton.click();

      // Verify dialog is closed
      await expect(applicationDialog).not.toBeVisible();
    });

    test("should validate date range input", async ({ page }) => {
      // Create and select a template
      const templateId = await templateTestBase.createTemplateViaAPI({
        name: "Test Validation Template",
        description: "Template for validation testing",
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Open the application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);

      // Initially, apply button should be disabled (no dates selected)
      await expect(dialogElements.applyButton).toBeDisabled();

      // Set start date
      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-01-01"
      );

      // Apply button should still be disabled (no end date)
      await expect(dialogElements.applyButton).toBeDisabled();

      // Set end date before start date
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2023-12-31"
      );

      // Apply button should be disabled (invalid range)
      await expect(dialogElements.applyButton).toBeDisabled();

      // Verify error message is shown
      await expect(
        page.locator("text=End date must be after start date")
      ).toBeVisible();

      // Set valid end date
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-01-07"
      );

      // Apply button should now be enabled
      await expect(dialogElements.applyButton).toBeEnabled();
    });

    test("should show template information in dialog header", async ({
      page,
    }) => {
      // Create a template with specific details
      const templateId = await templateTestBase.createTemplateViaAPI({
        name: "My Test Template",
        description: "A template for testing header display",
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Open the application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Get the application dialog for scoped assertions
      const applicationDialog =
        templateTestBase.getTemplateApplicationDialog(page);
      await expect(applicationDialog).toBeVisible();

      // Verify template information is displayed in the dialog
      await expect(
        applicationDialog.locator("text=My Test Template")
      ).toBeVisible();
      await expect(applicationDialog.locator("text=Standard")).toBeVisible(); // Default template type
      await expect(applicationDialog.locator("text=Weeks: 1")).toBeVisible(); // Default week count
    });
  });

  test.describe("Standard Template Application", () => {
    test("should apply standard template with rolling week logic", async ({
      page,
    }) => {
      // Get the standard test template created during setup
      const standardTemplate = templateTestBase.getStandardTestTemplate();
      if (!standardTemplate) {
        throw new Error("Standard test template not found");
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
      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-01-01"
      ); // Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-01-28"
      ); // Sunday (4 weeks)

      // Ensure overwrite is enabled
      await templateTestBase.setApplicationDialogOverwrite(page, true);

      // Wait for validation to complete and apply button to be enabled
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await expect(dialogElements.applyButton).toBeEnabled({ timeout: 10000 });

      // Apply the template
      await dialogElements.applyButton.click();

      // Navigate to the period to verify the demands
      await templateTestBase.navigateToPeriod(page, "2024-01-01");

      // Verify the shift demands were applied in rolling fashion
      // The standard template has 2 weeks that should repeat:
      // Week 0 pattern applied to 2024-01-01 to 2024-01-07
      // Week 1 pattern applied to 2024-01-08 to 2024-01-14
      // Week 0 pattern applied again to 2024-01-15 to 2024-01-21
      // Week 1 pattern applied again to 2024-01-22 to 2024-01-28

      // Calculate expected values based on the template creation logic
      // Week 0, Monday (dayOfWeek=0, index=0): ((0 + 0 + 1) % 5) + 1 = 2
      await templateTestBase.verifyShiftDemandValue(
        page,
        morningShiftId,
        "2024-01-01",
        2
      ); // Monday, Week 0

      // Week 0, Friday (dayOfWeek=4, index=0): ((4 + 0 + 1) % 5) + 1 = 1
      await templateTestBase.verifyShiftDemandValue(
        page,
        morningShiftId,
        "2024-01-05",
        1
      ); // Friday, Week 0

      // Week 1, Monday (dayOfWeek=0, index=0): ((0 + 0) % 5) + 2 = 2
      await templateTestBase.verifyShiftDemandValue(
        page,
        morningShiftId,
        "2024-01-08",
        2
      ); // Monday, Week 1

      // Week 1, Tuesday (dayOfWeek=1, index=0): ((1 + 0) % 5) + 2 = 3
      await templateTestBase.verifyShiftDemandValue(
        page,
        morningShiftId,
        "2024-01-09",
        3
      ); // Tuesday, Week 1

      // Week 0 repeats - Monday (dayOfWeek=0, index=0): ((0 + 0 + 1) % 5) + 1 = 2
      await templateTestBase.verifyShiftDemandValue(
        page,
        morningShiftId,
        "2024-01-15",
        2
      ); // Monday, Week 0 (repeated)

      // Week 1 repeats - Monday (dayOfWeek=0, index=0): ((0 + 0) % 5) + 2 = 2
      await templateTestBase.verifyShiftDemandValue(
        page,
        morningShiftId,
        "2024-01-22",
        2
      ); // Monday, Week 1 (repeated)
    });

    test("should apply standard template with rolling logic for longer period", async ({
      page,
    }) => {
      // Create a 2-week template
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Two-week Standard Template",
        description: "Template with 2 weeks for extended rolling test",
        demands: [
          // Week 1
          { weekNumber: 0, dayIndex: 0, shiftId: "shift1", value: 1 }, // Monday
          // Week 2
          { weekNumber: 1, dayIndex: 0, shiftId: "shift1", value: 2 }, // Monday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Open application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Set a date range that covers 5 weeks (should repeat pattern 2.5 times)
      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-02-05"
      ); // Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-03-10"
      ); // Sunday (5 weeks)

      // Apply the template
      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Wait for completion
      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify rolling pattern: Week1, Week2, Week1, Week2, Week1
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-02-05",
        1
      ); // Week 1
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-02-12",
        2
      ); // Week 2
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-02-19",
        1
      ); // Week 1 (repeat)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-02-26",
        2
      ); // Week 2 (repeat)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-04",
        1
      ); // Week 1 (repeat)
    });

    test("should handle standard template application starting mid-week", async ({
      page,
    }) => {
      // Create a template with demands across all days
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Full Week Template",
        description: "Template with demands on all days",
        demands: [
          { weekNumber: 0, dayIndex: 0, shiftId: "shift1", value: 1 }, // Monday
          { weekNumber: 0, dayIndex: 1, shiftId: "shift1", value: 2 }, // Tuesday
          { weekNumber: 0, dayIndex: 2, shiftId: "shift1", value: 3 }, // Wednesday
          { weekNumber: 0, dayIndex: 3, shiftId: "shift1", value: 4 }, // Thursday
          { weekNumber: 0, dayIndex: 4, shiftId: "shift1", value: 5 }, // Friday
          { weekNumber: 0, dayIndex: 5, shiftId: "shift1", value: 6 }, // Saturday
          { weekNumber: 0, dayIndex: 6, shiftId: "shift1", value: 7 }, // Sunday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Open application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Start on a Wednesday (mid-week)
      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-01-03"
      ); // Wednesday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-01-09"
      ); // Tuesday (1 week)

      // Apply the template
      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Wait for completion
      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify that the first week is applied starting from Wednesday
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-03",
        3
      ); // Wednesday (day 2 of template week)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-04",
        4
      ); // Thursday
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-05",
        5
      ); // Friday
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-06",
        6
      ); // Saturday
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-07",
        7
      ); // Sunday
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-08",
        1
      ); // Monday (start of next template cycle)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-09",
        2
      ); // Tuesday
    });
  });

  test.describe("Even/Odd Template Application", () => {
    test("should apply even/odd template based on year week numbers", async ({
      page,
    }) => {
      // First create the template as standard, then convert to even/odd
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Even/Odd Template",
        description: "Template for even/odd week testing",
        demands: [
          // Week 1 (will become "odd" week)
          { weekNumber: 0, dayIndex: 0, shiftId: "shift1", value: 1 }, // Monday
          // Week 2 (will become "even" week)
          { weekNumber: 1, dayIndex: 0, shiftId: "shift1", value: 2 }, // Monday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Convert template to even/odd type
      await templateTestBase.convertTemplateToEvenOdd(page, templateId);

      // Open application dialog
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      // Apply to a range that includes weeks 6, 7, 8 of 2024
      // Week 6 (even), Week 7 (odd), Week 8 (even)
      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-02-05"
      ); // Week 6 Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-02-25"
      ); // Week 8 Sunday

      // Apply the template
      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Wait for completion
      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify even/odd pattern application
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-02-05",
        2
      ); // Week 6 Monday (even week = template week 2)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-02-12",
        1
      ); // Week 7 Monday (odd week = template week 1)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-02-19",
        2
      ); // Week 8 Monday (even week = template week 2)
    });

    test("should correctly handle even/odd template for different year week ranges", async ({
      page,
    }) => {
      // Create even/odd template
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Year Week Even/Odd Template",
        description: "Template for year week number testing",
        demands: [
          // Odd week template
          { weekNumber: 0, dayIndex: 2, shiftId: "shift1", value: 3 }, // Wednesday
          // Even week template
          { weekNumber: 1, dayIndex: 2, shiftId: "shift1", value: 6 }, // Wednesday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Convert to even/odd
      await templateTestBase.convertTemplateToEvenOdd(page, templateId);

      // Apply to weeks 15, 16, 17 (odd, even, odd)
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-04-08"
      ); // Week 15 Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-04-28"
      ); // Week 17 Sunday

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify pattern: odd(15), even(16), odd(17)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-04-10",
        3
      ); // Week 15 Wednesday (odd)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-04-17",
        6
      ); // Week 16 Wednesday (even)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-04-24",
        3
      ); // Week 17 Wednesday (odd)
    });
  });

  test.describe("Override vs Additive Mode", () => {
    test("should override existing shift demands when overwrite is enabled", async ({
      page,
    }) => {
      // First, create some existing shift demands
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: "shift1",
        date: "2024-03-04", // Monday
        value: 5,
      });

      await templateTestBase.createShiftDemandViaAPI({
        shiftId: "shift1",
        date: "2024-03-05", // Tuesday
        value: 3,
      });

      // Create a template that will override these
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Override Template",
        description: "Template for override testing",
        demands: [
          { weekNumber: 0, dayIndex: 0, shiftId: "shift1", value: 1 }, // Monday
          { weekNumber: 0, dayIndex: 1, shiftId: "shift1", value: 2 }, // Tuesday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Apply with overwrite enabled
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-03-04"
      ); // Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-03-10"
      ); // Sunday

      // Ensure overwrite is enabled (should be default)
      await templateTestBase.setApplicationDialogOverwrite(page, true);

      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify values were overridden
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-04",
        1
      ); // Was 5, now 1
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-05",
        2
      ); // Was 3, now 2
    });

    test("should add to existing shift demands when overwrite is disabled", async ({
      page,
    }) => {
      // First, create some existing shift demands
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: "shift1",
        date: "2024-03-11", // Monday
        value: 2,
      });

      await templateTestBase.createShiftDemandViaAPI({
        shiftId: "shift1",
        date: "2024-03-12", // Tuesday
        value: 1,
      });

      // Create a template that will add to these
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Additive Template",
        description: "Template for additive testing",
        demands: [
          { weekNumber: 0, dayIndex: 0, shiftId: "shift1", value: 3 }, // Monday
          { weekNumber: 0, dayIndex: 1, shiftId: "shift1", value: 4 }, // Tuesday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Apply with overwrite disabled
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-03-11"
      ); // Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-03-17"
      ); // Sunday

      // Disable overwrite (set to additive mode)
      await templateTestBase.setApplicationDialogOverwrite(page, false);

      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify values were added together
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-11",
        5
      ); // 2 + 3 = 5
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-12",
        5
      ); // 1 + 4 = 5
    });

    test("should handle mixed scenarios (some existing, some new demands)", async ({
      page,
    }) => {
      // Create existing demands for only some days
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: "shift1",
        date: "2024-03-18", // Monday - has existing
        value: 1,
      });
      // Tuesday - no existing demand
      // Wednesday - no existing demand
      await templateTestBase.createShiftDemandViaAPI({
        shiftId: "shift1",
        date: "2024-03-21", // Thursday - has existing
        value: 2,
      });

      // Create template with demands for all these days
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Mixed Scenario Template",
        description: "Template for mixed scenario testing",
        demands: [
          { weekNumber: 0, dayIndex: 0, shiftId: "shift1", value: 2 }, // Monday
          { weekNumber: 0, dayIndex: 1, shiftId: "shift1", value: 1 }, // Tuesday
          { weekNumber: 0, dayIndex: 2, shiftId: "shift1", value: 3 }, // Wednesday
          { weekNumber: 0, dayIndex: 3, shiftId: "shift1", value: 1 }, // Thursday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Apply in additive mode
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-03-18"
      ); // Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-03-24"
      ); // Sunday

      await templateTestBase.setApplicationDialogOverwrite(page, false);

      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify mixed results
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-18",
        3
      ); // 1 + 2 = 3 (existing + template)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-19",
        1
      ); // 0 + 1 = 1 (new)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-20",
        3
      ); // 0 + 3 = 3 (new)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-03-21",
        3
      ); // 2 + 1 = 3 (existing + template)
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle template application across year boundary", async ({
      page,
    }) => {
      // Create even/odd template for year boundary testing
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Year Boundary Template",
        description: "Template for year boundary testing",
        demands: [
          // Odd week
          { weekNumber: 0, dayIndex: 0, shiftId: "shift1", value: 1 },
          // Even week
          { weekNumber: 1, dayIndex: 0, shiftId: "shift1", value: 2 },
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);
      await templateTestBase.convertTemplateToEvenOdd(page, templateId);

      // Apply across 2023-2024 boundary (weeks 52, 53 of 2023 and week 1 of 2024)
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2023-12-25"
      ); // Week 52 Monday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-01-07"
      ); // Week 1 Sunday of 2024

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify year boundary handling (week numbers should be calculated per year)
      // 2023 Week 52 (even), 2023 Week 53 (odd), 2024 Week 1 (odd)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2023-12-25",
        2
      ); // Week 52 (even)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-01",
        1
      ); // Week 53 (odd)
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-01-01",
        1
      ); // Week 1 of 2024 (odd)
    });

    test("should handle single day application", async ({ page }) => {
      // Create template
      const templateId = await templateTestBase.createTemplateWithDemands({
        name: "Single Day Template",
        description: "Template for single day testing",
        demands: [
          { weekNumber: 0, dayIndex: 2, shiftId: "shift1", value: 5 }, // Wednesday
        ],
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Apply to just one day (Wednesday)
      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-04-03"
      ); // Wednesday
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-04-03"
      ); // Same Wednesday

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify single day application
      await templateTestBase.verifyShiftDemandValue(
        page,
        "shift1",
        "2024-04-03",
        5
      );
    });

    test("should handle empty template application", async ({ page }) => {
      // Create template with no demands
      const templateId = await templateTestBase.createTemplateViaAPI({
        name: "Empty Template",
        description: "Template with no demands",
      });

      await templateTestBase.selectTemplateInViewer(page, templateId);

      const applyButton = templateTestBase.getTemplateViewerApplyButton(page);
      await applyButton.click();

      await templateTestBase.setApplicationDialogDate(
        page,
        "start",
        "2024-05-01"
      );
      await templateTestBase.setApplicationDialogDate(
        page,
        "end",
        "2024-05-07"
      );

      await templateTestBase.setApplicationDialogOverwrite(page, true);
      const dialogElements =
        templateTestBase.getTemplateApplicationDialogElements(page);
      await dialogElements.applyButton.click();

      // Should complete successfully even with no demands
      await expect(
        page.locator("text=Template applied successfully")
      ).toBeVisible();
      await templateTestBase.closeTemplateManagementWindow(page);

      // Verify no demands were created (existing empty state should remain)
      await templateTestBase.verifyShiftDemandNotExists(
        page,
        "shift1",
        "2024-05-01"
      );
    });
  });
});
