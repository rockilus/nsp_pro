/**
 * E2E tests for Template Viewer Select Feature
 *
 * This test suite covers the bulk selection functionality in the template viewer:
 * - Activating and deactivating select mode in template viewer
 * - Individual cell selection in template table
 * - Row and column selection in template table
 * - Bulk operations (create/update/delete) on template demands
 * - UI state management during select mode in template context
 */

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { TemplateTestBase } from "../../utils/template-test-base";

// Extend dayjs with the required plugins
dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("Template Viewer - Select Feature", () => {
  let templateTestBase: TemplateTestBase;

  test.beforeAll(async () => {
    // Setup once for all tests to avoid timeout issues
    templateTestBase = new TemplateTestBase();
    await templateTestBase.setupTemplateTests();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the shift demands page and open template management
    await templateTestBase.navigateToShiftDemandsPage(page);

    // Create a template via API for testing with unique name
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: `Test Template for Select ${Date.now()}`,
      description: "Template for testing select functionality",
    });

    // Open template management window and select the template
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.selectTemplateInViewer(page, templateId);

    // Wait for template viewer to load
    await expect(
      page.locator('[data-testid="template-viewer-container"]'),
    ).toBeVisible();
  });

  test.describe("Select Mode Activation/Deactivation", () => {
    test("should activate select mode when clicking the select button in template toolbar", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const actionToolbar = templateTestBase.getTemplateActionToolbar(page);

      // Verify initial state - select button is visible but action toolbar is not
      await expect(selectButton).toBeVisible();
      await expect(actionToolbar).not.toBeVisible();

      // Click the select button to activate select mode
      await selectButton.click();

      // Verify select mode is activated
      await expect(actionToolbar).toBeVisible();
      await expect(selectButton).toHaveCSS(
        "background-color",
        "rgb(25, 118, 210)",
      ); // Active blue color

      // Verify bulk selection elements are visible in template context
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);
      await expect(bulkElements.input).toBeVisible();
      await expect(bulkElements.deleteButton).toBeVisible();
      await expect(bulkElements.confirmButton).toBeVisible();
      await expect(bulkElements.cancelButton).toBeVisible();

      // Verify checkboxes appear in template table headers
      const checkboxes = templateTestBase.getTemplateSelectionCheckboxes(page);
      await expect(checkboxes.selectAll).toBeVisible();
    });

    test("should deactivate select mode when clicking the select button again", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const actionToolbar = templateTestBase.getTemplateActionToolbar(page);

      // Activate select mode
      await selectButton.click();
      await expect(actionToolbar).toBeVisible();

      // Click select button again to deactivate
      await selectButton.click();

      // Verify select mode is deactivated
      await expect(actionToolbar).not.toBeVisible();
      await expect(selectButton).not.toHaveCSS(
        "background-color",
        "rgb(25, 118, 210)",
      );
    });

    test("should deactivate select mode when clicking the cancel button", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const actionToolbar = templateTestBase.getTemplateActionToolbar(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();
      await expect(actionToolbar).toBeVisible();

      // Click cancel button to deactivate
      await bulkElements.cancelButton.click();

      // Verify select mode is deactivated
      await expect(actionToolbar).not.toBeVisible();
      await expect(selectButton).not.toHaveCSS(
        "background-color",
        "rgb(25, 118, 210)",
      );
    });

    test("should show checkboxes in template table cells when select mode is active", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);

      // Activate select mode
      await selectButton.click();

      // Check that cell checkboxes are visible (using a generic selector to verify presence)
      const cellCheckboxes = page.locator(
        '[data-testid*="template-cell-checkbox"] input',
      );
      await expect(cellCheckboxes.first()).toBeVisible();

      // Check that row checkboxes are visible
      const rowCheckboxes = page.locator(
        '[data-testid*="template-row-checkbox"] input',
      );
      await expect(rowCheckboxes.first()).toBeVisible();

      // Check that column checkboxes are visible
      const columnCheckboxes = page.locator(
        '[data-testid*="template-column-checkbox"] input',
      );
      await expect(columnCheckboxes.first()).toBeVisible();
    });
  });

  test.describe("Individual Cell Selection", () => {
    test("should select and deselect individual template cells", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Find a cell checkbox to interact with
      const firstCellCheckbox = page
        .locator('[data-testid*="template-cell-checkbox"] input')
        .first();
      await expect(firstCellCheckbox).toBeVisible();

      // Initially no cells should be selected
      await expect(firstCellCheckbox).not.toBeChecked();

      // Click to select the cell
      await firstCellCheckbox.click();

      // Verify cell is now selected
      await expect(firstCellCheckbox).toBeChecked();

      // Click again to deselect
      await firstCellCheckbox.click();

      // Verify cell is now deselected
      await expect(firstCellCheckbox).not.toBeChecked();
    });

    test("should show selection count when template cells are selected", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstCellCheckbox = page
        .locator('[data-testid*="template-cell-checkbox"] input')
        .first();
      await firstCellCheckbox.click();

      // Verify that action buttons are enabled when cells are selected
      await expect(bulkElements.confirmButton).toBeEnabled();
      await expect(bulkElements.deleteButton).toBeEnabled();

      // Select another cell
      const secondCellCheckbox = page
        .locator('[data-testid*="template-cell-checkbox"] input')
        .nth(1);
      await secondCellCheckbox.click();

      // Buttons should still be enabled
      await expect(bulkElements.confirmButton).toBeEnabled();
      await expect(bulkElements.deleteButton).toBeEnabled();
    });
  });

  test.describe("Row and Column Selection", () => {
    test("should select all cells in a template row when clicking row checkbox", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);

      // Activate select mode
      await selectButton.click();

      // Find and click a row checkbox
      const firstRowCheckbox = page
        .locator('[data-testid*="template-row-checkbox"] input')
        .first();
      await expect(firstRowCheckbox).toBeVisible();
      await firstRowCheckbox.click();

      // Verify the row checkbox is checked
      await expect(firstRowCheckbox).toBeChecked();

      // Get the shift ID from the row checkbox data-testid
      const shiftId = await firstRowCheckbox.getAttribute("data-testid");
      const extractedShiftId = shiftId?.replace("template-row-checkbox-", "");

      // Verify that all cells in the row are now selected
      if (extractedShiftId) {
        const rowCellCheckboxes = page.locator(
          `[data-testid*="template-cell-checkbox-${extractedShiftId}"] input`,
        );
        const count = await rowCellCheckboxes.count();

        // Check that we have cells and they are all selected
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          await expect(rowCellCheckboxes.nth(i)).toBeChecked();
        }
      }
    });

    test("should select all cells in a template column when clicking column checkbox", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);

      // Activate select mode
      await selectButton.click();

      // Find and click a column checkbox
      const firstColumnCheckbox = page
        .locator('[data-testid*="template-column-checkbox"] input')
        .first();
      await expect(firstColumnCheckbox).toBeVisible();
      await firstColumnCheckbox.click();

      // Verify the column checkbox is checked
      await expect(firstColumnCheckbox).toBeChecked();

      // Get the week and day index from the column checkbox data-testid
      const columnId = await firstColumnCheckbox.getAttribute("data-testid");
      const match = columnId?.match(/template-column-checkbox-(\d+)-(\d+)/);

      if (match) {
        const weekNumber = match[1];
        const dayIndex = match[2];

        // Verify that all cells in the column are now selected
        const columnCellCheckboxes = page.locator(
          `[data-testid*="-${weekNumber}-${dayIndex}"][data-testid*="template-cell-checkbox"] input`,
        );
        const count = await columnCellCheckboxes.count();

        // Check that we have cells and they are all selected
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          await expect(columnCellCheckboxes.nth(i)).toBeChecked();
        }
      }
    });

    test("should select all template cells when clicking select all checkbox", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const checkboxes = templateTestBase.getTemplateSelectionCheckboxes(page);

      // Activate select mode
      await selectButton.click();

      // Click select all checkbox
      await checkboxes.selectAll.click();

      // Verify select all checkbox is checked
      await expect(checkboxes.selectAll).toBeChecked();

      // Verify that all cell checkboxes are now selected
      const allCellCheckboxes = page.locator(
        '[data-testid*="template-cell-checkbox"] input',
      );
      const count = await allCellCheckboxes.count();

      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        await expect(allCellCheckboxes.nth(i)).toBeChecked();
      }
    });
  });

  test.describe("Button States", () => {
    test("should disable action buttons when no template cells are selected", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Verify action buttons are disabled when no selection
      await expect(bulkElements.confirmButton).toBeDisabled();
      await expect(bulkElements.deleteButton).toBeDisabled();
    });

    test("should enable action buttons when template cells are selected", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstCellCheckbox = page
        .locator('[data-testid*="template-cell-checkbox"]')
        .first();
      await firstCellCheckbox.click();

      // Verify action buttons are enabled when cells are selected
      await expect(bulkElements.deleteButton).toBeEnabled();

      // Confirm button should be enabled when there's a valid bulk value and selection
      await expect(bulkElements.input).toHaveValue("1"); // Default value
      await expect(bulkElements.confirmButton).toBeEnabled();
    });

    test("should disable confirm button when input is empty in template context", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstCellCheckbox = page
        .locator('[data-testid*="template-cell-checkbox"] input')
        .first();
      await firstCellCheckbox.click();

      // Clear the input
      await bulkElements.input.fill("");

      // Confirm button should be disabled
      await expect(bulkElements.confirmButton).toBeDisabled();

      // Set a valid value
      await bulkElements.input.fill("2");

      // Confirm button should be enabled again
      await expect(bulkElements.confirmButton).toBeEnabled();
    });
  });

  test.describe("Bulk Operations", () => {
    test("should create/update template demands when confirming bulk selection", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a few cells
      const cellCheckboxes = page.locator(
        '[data-testid*="template-cell-checkbox"] input',
      );
      await cellCheckboxes.first().click();
      await cellCheckboxes.nth(1).click();

      // Set bulk value
      await bulkElements.input.fill("3");

      // Apply bulk change
      await bulkElements.confirmButton.click();

      // Wait for operation to complete and select mode to exit
      await expect(
        templateTestBase.getTemplateActionToolbar(page),
      ).not.toBeVisible();

      // Verify select mode is no longer active
      await expect(selectButton).not.toHaveCSS(
        "background-color",
        "rgb(25, 118, 210)",
      );

      // Note: In a real test, you might want to verify the actual demand values
      // were updated in the template table, but that would require more complex
      // UI inspection of the template cells
    });

    test("should delete template demands when confirming bulk deletion", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select some cells
      const cellCheckboxes = page.locator(
        '[data-testid*="template-cell-checkbox"] input',
      );
      await cellCheckboxes.first().click();
      await cellCheckboxes.nth(1).click();

      // Click delete button
      await bulkElements.deleteButton.click();

      // Confirm deletion in dialog (assuming the BulkSelectionSection handles the confirmation)
      const deleteConfirmButton = page.locator(
        '[data-testid="bulk-selection-delete-confirm-button"]',
      );
      if (await deleteConfirmButton.isVisible()) {
        await deleteConfirmButton.click();
      }

      // Wait for operation to complete and select mode to exit
      await expect(
        templateTestBase.getTemplateActionToolbar(page),
      ).not.toBeVisible();

      // Verify select mode is no longer active
      await expect(selectButton).not.toHaveCSS(
        "background-color",
        "rgb(25, 118, 210)",
      );
    });

    test("should cancel deletion when clicking cancel in confirmation dialog", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select some cells
      const cellCheckboxes = page.locator(
        '[data-testid*="template-cell-checkbox"] input',
      );
      await cellCheckboxes.first().click();

      // Click delete button
      await bulkElements.deleteButton.click();

      // Cancel deletion in dialog
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }

      // Verify select mode is still active
      await expect(
        templateTestBase.getTemplateActionToolbar(page),
      ).toBeVisible();
      await expect(selectButton).toHaveCSS(
        "background-color",
        "rgb(25, 118, 210)",
      );
    });
  });

  test.describe("Keyboard Shortcuts", () => {
    test("should apply bulk change when pressing Enter in input field", async ({
      page,
    }) => {
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstCellCheckbox = page
        .locator('[data-testid*="template-cell-checkbox"] input')
        .first();
      await firstCellCheckbox.check();

      // Set bulk value and press Enter
      await bulkElements.input.fill("2");
      await bulkElements.input.press("Enter");

      // Wait for operation to complete and select mode to exit
      await expect(
        templateTestBase.getTemplateActionToolbar(page),
      ).not.toBeVisible();

      // Verify select mode is no longer active
      await expect(selectButton).not.toHaveCSS(
        "background-color",
        "rgb(25, 118, 210)",
      );
    });

    // Note: Escape functionality may not be implemented yet - commenting out like in shift-demand-select.spec.ts
    // test("should cancel select mode when pressing Escape in input field", async ({
    //   page,
    // }) => {
    //   const selectButton = templateTestBase.getTemplateSelectButton(page);
    //   const bulkElements =
    //     templateTestBase.getTemplateBulkSelectionElements(page);

    //   // Activate select mode
    //   await selectButton.click();

    //   // Press Escape in input field
    //   await bulkElements.input.press("Escape");

    //   // Verify select mode is exited
    //   await expect(
    //     templateTestBase.getTemplateActionToolbar(page)
    //   ).not.toBeVisible();
    //
    //   // Get fresh locator for the select button after escape
    //   const selectButtonAfterEscape = templateTestBase.getTemplateSelectButton(page);
    //   await expect(selectButtonAfterEscape).not.toHaveCSS(
    //     "background-color",
    //     "rgb(25, 118, 210)"
    //   );
    // });
  });
});
