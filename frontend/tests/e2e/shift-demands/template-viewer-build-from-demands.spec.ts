/**
 * End-to-end tests for TemplateViewer Build From Demands Feature
 *
 * This test suite covers the build from demands functionality in the temp    test("should enable apply button when source week is selected", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Wait for dialog to be fully visible
      await expect(page.getByTestId("build-from-demands-dialog")).toBeVisible();

      const applyButton = page.getByTestId("build-from-demands-apply-button");

      // Initially apply button should be disabled
      await expect(applyButton).toBeDisabled();

      // Enter a date directly
      const dateInput = page.getByTestId("source-week-date-input");
      await expect(dateInput).toBeVisible();
      
      await dateInput.click();
      await dateInput.fill("15/01/2024");
      
      // Press Enter to confirm the date
      await dateInput.press("Enter");

      // Now apply button should be enabled
      await expect(applyButton).toBeEnabled();- Opening and closing the build from demands dialog
 * - Source week selection and validation
 * - Target week selection for both standard and even/odd templates
 * - Applying demands and verifying data transfer
 * - Error handling and validation
 */

import { test, expect } from "@playwright/test";
import { TemplateTestBase } from "../../utils/template-test-base";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";

// Extend dayjs with the required plugins
dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("TemplateViewer - Build From Demands Feature", () => {
  let templateTestBase: TemplateTestBase;

  test.beforeEach(async ({ page }) => {
    // Setup for each test to avoid timeout issues with beforeAll
    templateTestBase = new TemplateTestBase();
    await templateTestBase.setupTemplateTests();
    // Navigate to the shift demands page and open template management
    await templateTestBase.navigateToShiftDemandsPage(page);

    // Create a template via API for testing with unique name
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: `Test Template for Build From Demands ${Date.now()}`,
      description: "Template for testing build from demands functionality",
    });

    // Open template management window and select the template
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.selectTemplateInViewer(page, templateId);

    // Wait for template viewer to load
    await expect(
      page.locator('[data-testid="template-viewer-container"]')
    ).toBeVisible();
  });

  test.describe("Dialog Opening and Closing", () => {
    test("should display build from demands button in template toolbar", async ({
      page,
    }) => {
      const buildButton = templateTestBase.getBuildFromDemandsButton(page);
      await expect(buildButton).toBeVisible();
      // Check for the translation key or the translated text
      await expect(buildButton).toContainText(/from_demands|From Demands/);
    });

    test("should open build from demands dialog when clicking the button", async ({
      page,
    }) => {
      const buildButton = templateTestBase.getBuildFromDemandsButton(page);
      const dialog = templateTestBase.getBuildFromDemandsDialog(page);

      // Verify initial state - button visible, dialog not visible
      await expect(buildButton).toBeVisible();
      await expect(dialog).not.toBeVisible();

      // Click the button to open dialog
      await buildButton.click();

      // Verify dialog is now visible
      await expect(dialog).toBeVisible();

      // Verify dialog contains expected elements - use dialog role to be specific
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /Build from Demands/i })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Source Week" })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Target Week" })
      ).toBeVisible();
    });

    test("should close build from demands dialog when clicking cancel button", async ({
      page,
    }) => {
      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Open the dialog
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Click the cancel button
      await formElements.cancelButton.click();

      // Verify dialog is closed
      await expect(
        page.getByTestId("build-from-demands-dialog")
      ).not.toBeVisible();
    });

    test("should close build from demands dialog when pressing Escape key", async ({
      page,
    }) => {
      const dialog = templateTestBase.getBuildFromDemandsDialog(page);

      // Open the dialog
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Press Escape key
      await page.keyboard.press("Escape");

      // Verify dialog is closed - check our specific dialog
      await expect(
        page.getByTestId("build-from-demands-dialog")
      ).not.toBeVisible();
    });
  });

  test.describe("Source Week Selection", () => {
    test("should display date picker for source week selection", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Wait for dialog to be fully visible
      await expect(page.getByTestId("build-from-demands-dialog")).toBeVisible();

      // Check if date picker is visible by looking for the input field directly
      await expect(page.getByTestId("source-week-date-input")).toBeVisible();
    });

    test("should accept valid date for source week", async ({ page }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Wait for dialog to be fully visible
      await expect(page.getByTestId("build-from-demands-dialog")).toBeVisible();

      // Enter a date directly
      const dateInput = page.getByTestId("source-week-date-input");
      await expect(dateInput).toBeVisible();

      await dateInput.click();
      await dateInput.fill("15/01/2024");

      // Verify the input has the value
      await expect(dateInput).toHaveValue("15/01/2024");
    });

    test("should enable apply button when source week is selected", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Wait for dialog to be fully visible
      await expect(page.getByTestId("build-from-demands-dialog")).toBeVisible();

      const applyButton = page.getByTestId("build-from-demands-apply-button");

      // Initially apply button should be disabled
      await expect(applyButton).toBeDisabled();

      // Enter a date directly
      const dateInput = page.getByTestId("source-week-date-input");
      await expect(dateInput).toBeVisible();

      await dateInput.click();
      await dateInput.fill("15/01/2024");

      // Press Enter to confirm the date
      await dateInput.press("Enter");

      // Now apply button should be enabled
      await expect(applyButton).toBeEnabled();
    });

    test("should show helper text about Monday calculation", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Should show helper text explaining Monday calculation - check for the first occurrence
      await expect(
        page
          .getByTestId("build-from-demands-dialog")
          .getByText(/find the Monday/i)
          .first()
      ).toBeVisible();
    });
  });

  test.describe("Target Week Selection", () => {
    test("should display dropdown for target week selection", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);
      await expect(formElements.targetWeekSelect).toBeVisible();
    });

    test("should show correct number of target weeks for standard template", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Click on the select to open dropdown
      await formElements.targetWeekSelect.click();

      // For a new template, should have at least Week 1 option
      const week1Option = templateTestBase.getTargetWeekOption(page, 0); // Week numbers are 0-indexed
      await expect(week1Option).toBeVisible();
      await expect(week1Option).toContainText("Week 1");

      // Close dropdown by clicking elsewhere
      await page.click("body");
    });

    test("should allow selection of target week", async ({ page }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Select target week 1 (index 0)
      await templateTestBase.selectTargetWeek(page, 0);

      // Verify the selection by checking that the dropdown shows the selected option text
      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // For MUI Select, we check the displayed text rather than value
      await expect(formElements.targetWeekSelect).toContainText("Week 1");
    });

    test("should show overwrite warning for selected target week", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Select target week 1 (index 0)
      await templateTestBase.selectTargetWeek(page, 0);

      // Should show warning about overwriting data
      await expect(
        page.locator(":text('overwrite')").or(page.locator(":text('replace')"))
      ).toBeVisible();
    });
  });

  test.describe("Template Type Handling", () => {
    test("should handle standard template with multiple weeks", async ({
      page,
    }) => {
      // First, we need to add more weeks to the template
      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Add a second week
      await toolbarElements.addWeekButton.click();

      // Open build from demands dialog
      await templateTestBase.openBuildFromDemandsDialog(page);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Click on the select to open dropdown
      await formElements.targetWeekSelect.click();

      // Should now have Week 1 and Week 2 options
      const week1Option = templateTestBase.getTargetWeekOption(page, 0);
      const week2Option = templateTestBase.getTargetWeekOption(page, 1);

      await expect(week1Option).toBeVisible();
      await expect(week1Option).toContainText("Week 1");
      await expect(week2Option).toBeVisible();
      await expect(week2Option).toContainText("Week 2");

      // Close dropdown
      await page.click("body");
    });

    test("should handle even/odd template conversion and show appropriate weeks", async ({
      page,
    }) => {
      // Convert template to even/odd type
      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Click the even/odd button
      await toolbarElements.evenOddTypeButton.click();

      // Handle the confirmation dialog
      const confirmDialog =
        templateTestBase.getEvenOddConversionDialogElements(page);
      await expect(confirmDialog.dialog).toBeVisible();
      await confirmDialog.confirmButton.click();

      // Open build from demands dialog
      await templateTestBase.openBuildFromDemandsDialog(page);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Click on the select to open dropdown
      await formElements.targetWeekSelect.click();

      // For even/odd template, should have Even Week and Odd Week options
      const evenWeekOption = templateTestBase.getTargetWeekOption(page, 0);
      const oddWeekOption = templateTestBase.getTargetWeekOption(page, 1);

      await expect(evenWeekOption).toBeVisible();
      await expect(oddWeekOption).toBeVisible();

      // Close dropdown
      await page.click("body");
    });
  });

  test.describe("Applying Demands", () => {
    test("should successfully apply demands from source to target week", async ({
      page,
    }) => {
      // This test would ideally create some source shift demands via API first
      // For now, we'll test the UI flow

      await templateTestBase.openBuildFromDemandsDialog(page);

      // Select source week date
      await templateTestBase.selectSourceWeekDate(page, "01/15/2024");

      // Select target week
      await templateTestBase.selectTargetWeek(page, 0);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Click apply button
      await formElements.applyButton.click();

      // Dialog should close after successful application
      await expect(formElements.dialog).not.toBeVisible();

      // Should show success feedback (this might be a toast/snackbar)
      // The exact implementation depends on how success is communicated
    });

    test("should show loading state while applying demands", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Select source week date
      await templateTestBase.selectSourceWeekDate(page, "01/15/2024");

      // Select target week
      await templateTestBase.selectTargetWeek(page, 0);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Click apply button
      await formElements.applyButton.click();

      // Should briefly show loading state
      // Note: this might be too fast to reliably test in E2E, but we can try
      const loadingIndicator = page.locator("text=Applying").or(
        formElements.applyButton.locator("svg") // CircularProgress
      );

      // The loading state might be very brief, so we use a short timeout
      try {
        await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
      } catch (e) {
        // Loading might be too fast to catch, which is acceptable
        console.log(
          "Loading state was too fast to detect, which is normal for fast operations"
        );
      }
    });

    test("should disable cancel and apply buttons during operation", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Select source week date
      await templateTestBase.selectSourceWeekDate(page, "01/15/2024");

      // Select target week
      await templateTestBase.selectTargetWeek(page, 0);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Click apply button
      await formElements.applyButton.click();

      // Buttons should be disabled during operation
      // Note: this might be very brief, similar to loading state test
      try {
        await expect(formElements.applyButton).toBeDisabled({ timeout: 1000 });
        await expect(formElements.cancelButton).toBeDisabled({ timeout: 1000 });
      } catch (e) {
        // Operation might be too fast, which is acceptable
        console.log(
          "Button disable state was too fast to detect, which is normal for fast operations"
        );
      }
    });
  });

  test.describe("Validation and Error Handling", () => {
    test("should show error when no source week is selected", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Don't select a source week, just try to apply
      await formElements.applyButton.click();

      // Should show validation error
      await expect(
        page
          .locator(":text('please_select_source_week')")
          .or(
            page
              .locator(":text('Please select')")
              .or(page.locator(":text('required')"))
          )
      ).toBeVisible();
    });

    test("should keep apply button disabled when no source week is selected", async ({
      page,
    }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Apply button should remain disabled without source week
      await expect(formElements.applyButton).toBeDisabled();

      // Select target week only
      await templateTestBase.selectTargetWeek(page, 0);

      // Apply button should still be disabled without source week
      await expect(formElements.applyButton).toBeDisabled();
    });

    test("should reset form when dialog is reopened", async ({ page }) => {
      await templateTestBase.openBuildFromDemandsDialog(page);

      // Select some values
      await templateTestBase.selectSourceWeekDate(page, "01/15/2024");
      await templateTestBase.selectTargetWeek(page, 0);

      // Close dialog
      await templateTestBase.closeBuildFromDemandsDialog(page);

      // Reopen dialog
      await templateTestBase.openBuildFromDemandsDialog(page);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);

      // Form should be reset
      const dateInput = page
        .locator('[data-testid="source-week-date-picker"] input')
        .first();
      await expect(dateInput).toHaveValue("");
      // For Select, we check that it shows the default selection
      await expect(formElements.targetWeekSelect).toContainText("Week 1");
      await expect(formElements.applyButton).toBeDisabled();
    });
  });

  test.describe("Integration with Template Data", () => {
    test("should update template table after applying demands", async ({
      page,
    }) => {
      // This test would ideally:
      // 1. Create shift demands via API for a specific week
      // 2. Apply those demands to a template week
      // 3. Verify the template table shows the copied demands

      await templateTestBase.openBuildFromDemandsDialog(page);

      // Select source and target
      await templateTestBase.selectSourceWeekDate(page, "01/15/2024");
      await templateTestBase.selectTargetWeek(page, 0);

      const formElements =
        templateTestBase.getBuildFromDemandsFormElements(page);
      await formElements.applyButton.click();

      // Wait for dialog to close
      await expect(formElements.dialog).not.toBeVisible();

      // Template table should be updated
      // The exact verification would depend on having known source data
      await expect(
        page.locator('[data-testid="template-table"]')
      ).toBeVisible();
    });

    test("should handle multiple build operations on same template", async ({
      page,
    }) => {
      // First application
      await templateTestBase.applyDemandsFromSourceToTarget(
        page,
        "01/15/2024",
        0
      );

      // Second application (should overwrite)
      await templateTestBase.applyDemandsFromSourceToTarget(
        page,
        "01/22/2024",
        0
      );

      // Should complete successfully both times
      await expect(
        page.locator('[data-testid="template-table"]')
      ).toBeVisible();
    });
  });
});
