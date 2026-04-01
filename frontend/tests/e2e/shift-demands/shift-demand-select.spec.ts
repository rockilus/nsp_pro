/**
 * E2E tests for Shift Demand Select Feature
 *
 * This test suite covers the bulk selection functionality in the shift demands page:
 * - Activating and deactivating select mode
 * - Individual cell selection
 * - Row and column selection
 * - Bulk operations (create/update/delete)
 * - UI state management during select mode
 */

import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import { ShiftDemandTestBase } from '../../utils/shift-demand-test-base';

// Extend dayjs with the required plugins
dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe('Shift Demand - Select Feature', () => {
  let shiftDemandTestBase: ShiftDemandTestBase;

  test.beforeAll(async () => {
    // Setup once for all tests to avoid timeout issues
    shiftDemandTestBase = new ShiftDemandTestBase();
    await shiftDemandTestBase.setupShiftDemandTests();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the page and wait for it to load
    await shiftDemandTestBase.navigateToShiftDemandsPage(page);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Select Mode Activation/Deactivation', () => {
    test('should activate select mode when clicking the select button', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const actionToolbar = shiftDemandTestBase.getActionToolbar(page);

      // Verify initial state - select button is visible but action toolbar is not
      await expect(selectButton).toBeVisible();
      await expect(actionToolbar).not.toBeVisible();

      // Click the select button to activate select mode
      await selectButton.click();

      // Verify select mode is activated
      await expect(actionToolbar).toBeVisible();
      await expect(selectButton).toHaveCSS('background-color', 'rgb(25, 118, 210)'); // Active blue color

      // Verify bulk selection elements are visible
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);
      await expect(bulkElements.input).toBeVisible();
      await expect(bulkElements.deleteButton).toBeVisible();
      await expect(bulkElements.confirmButton).toBeVisible();
      await expect(bulkElements.cancelButton).toBeVisible();

      // Verify checkboxes appear in table headers
      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      await expect(checkboxes.selectAll).toBeVisible();
    });

    test('should deactivate select mode when clicking the select button again', async ({
      page,
    }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const actionToolbar = shiftDemandTestBase.getActionToolbar(page);

      // Activate select mode
      await selectButton.click();
      await expect(actionToolbar).toBeVisible();

      // Click select button again to deactivate
      await selectButton.click();

      // Verify select mode is deactivated
      await expect(actionToolbar).not.toBeVisible();
      await expect(selectButton).not.toHaveCSS('background-color', 'rgb(25, 118, 210)');
    });

    test('should deactivate select mode when clicking the cancel button', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const actionToolbar = shiftDemandTestBase.getActionToolbar(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();
      await expect(actionToolbar).toBeVisible();

      // Click cancel button
      await bulkElements.cancelButton.click();

      // Verify select mode is deactivated
      await expect(actionToolbar).not.toBeVisible();
      await expect(selectButton).not.toHaveCSS('background-color', 'rgb(25, 118, 210)');
    });

    test('should show checkboxes in table cells when select mode is active', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);

      // Get first shift row header to extract shift ID
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      await expect(firstRowHeader).toBeVisible();

      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const today = dayjs.utc();
      const testDate = today.format('YYYY-MM-DD');

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);

      // Verify cell checkbox is not visible initially
      await expect(checkboxes.cellSelect(shiftId!, testDate)).not.toBeVisible();

      // Activate select mode
      await selectButton.click();

      // Verify cell checkbox is now visible
      await expect(checkboxes.cellSelect(shiftId!, testDate)).toBeVisible();
    });
  });

  test.describe('Individual Cell Selection', () => {
    test('should select and deselect individual cells', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);

      // Activate select mode
      await selectButton.click();

      // Get first shift and today's date
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const today = dayjs.utc();
      const testDate = today.format('YYYY-MM-DD');

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      const cellCheckbox = checkboxes.cellSelect(shiftId!, testDate);

      // Initially should not be checked
      await expect(cellCheckbox).not.toBeChecked();

      // Click to select
      await cellCheckbox.click();
      await expect(cellCheckbox).toBeChecked();

      // Click to deselect
      await cellCheckbox.click();
      await expect(cellCheckbox).not.toBeChecked();
    });

    test('should show selection count when cells are selected', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Get first shift and today's date
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const today = dayjs.utc();
      const testDate = today.format('YYYY-MM-DD');

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      const cellCheckbox = checkboxes.cellSelect(shiftId!, testDate);

      // Select a cell
      await cellCheckbox.click();

      // Verify buttons are enabled when cells are selected
      await expect(bulkElements.deleteButton).toBeEnabled();
      await expect(bulkElements.confirmButton).toBeEnabled();
    });
  });

  test.describe('Row and Column Selection', () => {
    test('should select all cells in a row when clicking row checkbox', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);

      // Activate select mode
      await selectButton.click();

      // Get first shift
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      const rowCheckbox = checkboxes.rowSelect(shiftId!);

      // Click row checkbox
      await rowCheckbox.click();
      await expect(rowCheckbox).toBeChecked();

      // Verify some cells in the row are selected (check first few visible dates)
      const today = dayjs.utc();
      for (let i = 0; i < 3; i++) {
        const testDate = today.add(i, 'day').format('YYYY-MM-DD');
        const cellCheckbox = checkboxes.cellSelect(shiftId!, testDate);

        // Only check if the cell is visible (it might not be if outside the current period)
        if (await cellCheckbox.isVisible()) {
          await expect(cellCheckbox).toBeChecked();
        }
      }
    });

    test('should select all cells in a column when clicking column checkbox', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);

      // Activate select mode
      await selectButton.click();

      const today = dayjs.utc();
      const testDate = today.format('YYYY-MM-DD');

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      const columnCheckbox = checkboxes.columnSelect(testDate);

      // Click column checkbox
      await columnCheckbox.click();
      await expect(columnCheckbox).toBeChecked();

      // Verify some cells in the column are selected (check first few visible shifts)
      const shiftRows = page.locator('[data-testid^="shift-demand-row-header-"]');
      const shiftCount = Math.min(await shiftRows.count(), 3);

      for (let i = 0; i < shiftCount; i++) {
        const shiftHeader = shiftRows.nth(i);
        const shiftId = await shiftHeader
          .getAttribute('data-testid')
          .then((id) => id?.replace('shift-demand-row-header-', ''));

        const cellCheckbox = checkboxes.cellSelect(shiftId!, testDate);
        if (await cellCheckbox.isVisible()) {
          await expect(cellCheckbox).toBeChecked();
        }
      }
    });

    test('should select all cells when clicking select all checkbox', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);

      // Activate select mode
      await selectButton.click();

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      const selectAllCheckbox = checkboxes.selectAll;

      // Click select all checkbox
      await selectAllCheckbox.click();
      await expect(selectAllCheckbox).toBeChecked();

      // Verify row checkboxes are checked
      const shiftRows = page.locator('[data-testid^="shift-demand-row-header-"]');
      const shiftCount = Math.min(await shiftRows.count(), 2); // Check first 2 rows

      for (let i = 0; i < shiftCount; i++) {
        const shiftHeader = shiftRows.nth(i);
        const shiftId = await shiftHeader
          .getAttribute('data-testid')
          .then((id) => id?.replace('shift-demand-row-header-', ''));

        const rowCheckbox = checkboxes.rowSelect(shiftId!);
        if (await rowCheckbox.isVisible()) {
          await expect(rowCheckbox).toBeChecked();
        }
      }
    });
  });

  test.describe('Button States', () => {
    test('should disable action buttons when no cells are selected', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Verify buttons are disabled when no selection
      await expect(bulkElements.deleteButton).toBeDisabled();
      await expect(bulkElements.confirmButton).toBeDisabled();
      await expect(bulkElements.input).toBeDisabled();
    });

    test('should enable action buttons when cells are selected', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Get first shift and select a cell
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const today = dayjs.utc();
      const testDate = today.format('YYYY-MM-DD');

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      await checkboxes.cellSelect(shiftId!, testDate).click();

      // Verify buttons are enabled
      await expect(bulkElements.deleteButton).toBeEnabled();
      await expect(bulkElements.input).toBeEnabled();

      // Add value to input to enable confirm button
      await bulkElements.input.fill('2');
      await expect(bulkElements.confirmButton).toBeEnabled();
    });

    test('should disable confirm button when input is empty', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const today = dayjs.utc();
      const testDate = today.format('YYYY-MM-DD');

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      await checkboxes.cellSelect(shiftId!, testDate).click();

      // Clear input value
      await bulkElements.input.clear();

      // Verify confirm button is disabled
      await expect(bulkElements.confirmButton).toBeDisabled();
    });
  });

  test.describe('Bulk Operations', () => {
    test('should create/update shift demands when confirming bulk selection', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const tomorrow = dayjs.utc().add(1, 'day');
      const testDate = tomorrow.format('YYYY-MM-DD');

      // Navigate to the correct month before selecting the cell
      await shiftDemandTestBase.navigateToMonth(page, tomorrow);

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      await checkboxes.cellSelect(shiftId!, testDate).click();

      // Set value and confirm
      await bulkElements.input.fill('3');
      await bulkElements.confirmButton.click();

      // Verify select mode is exited (wait for action toolbar to become invisible)
      const actionToolbar = shiftDemandTestBase.getActionToolbar(page);
      await expect(actionToolbar).not.toBeVisible();

      // Verify the shift demand value is updated in the table
      const cell = page.locator(`[data-testid="shift-demand-cell-${shiftId}-${testDate}"]`);
      const valueElement = cell.locator(
        `[data-testid="shift-demand-value-${shiftId}-${testDate}"]`,
      );

      await expect(valueElement).toBeVisible();
      await expect(valueElement).toHaveText('3');
    });

    test('should delete shift demands when confirming bulk deletion', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // First, create a shift demand to delete
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const tomorrow = dayjs.utc().add(1, 'day');
      const testDate = tomorrow.format('YYYY-MM-DD');

      // Navigate to the correct month before creating the shift demand
      await shiftDemandTestBase.navigateToMonth(page, tomorrow);

      // Create a shift demand first by clicking the cell
      const cell = page.locator(`[data-testid="shift-demand-cell-${shiftId}-${testDate}"]`);

      // Wait for the cell to be visible before interacting with it
      await expect(cell).toBeVisible();
      await cell.hover();
      await cell.click();

      // Wait for the shift demand to be created by checking for the value element
      const valueElement = cell.locator(
        `[data-testid="shift-demand-value-${shiftId}-${testDate}"]`,
      );
      await expect(valueElement).toBeVisible();

      // Now activate select mode and select the cell
      await selectButton.click();

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      await checkboxes.cellSelect(shiftId!, testDate).click();

      // Click delete button
      await bulkElements.deleteButton.click();

      // Confirm deletion in the dialog
      await expect(bulkElements.deleteConfirmButton).toBeVisible();
      await bulkElements.deleteConfirmButton.click();

      // Verify select mode is exited
      const actionToolbar = shiftDemandTestBase.getActionToolbar(page);
      await expect(actionToolbar).not.toBeVisible();

      // Verify the cell is back to empty state
      const emptyState = cell.locator(`[data-testid="shift-demand-empty-${shiftId}-${testDate}"]`);
      await expect(emptyState).toBeVisible();
    });

    test('should cancel deletion when clicking cancel in confirmation dialog', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const today = dayjs.utc();
      const testDate = today.format('YYYY-MM-DD');

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      await checkboxes.cellSelect(shiftId!, testDate).click();

      // Click delete button
      await bulkElements.deleteButton.click();

      // Cancel deletion in the dialog
      await page.locator('button:has-text("Cancel")').click();

      // Verify we're still in select mode
      const actionToolbar = shiftDemandTestBase.getActionToolbar(page);
      await expect(actionToolbar).toBeVisible();

      // Verify cell is still selected
      await expect(checkboxes.cellSelect(shiftId!, testDate)).toBeChecked();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should apply bulk change when pressing Enter in input field', async ({ page }) => {
      const selectButton = shiftDemandTestBase.getSelectButton(page);
      const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

      // Activate select mode
      await selectButton.click();

      // Select a cell
      const firstRowHeader = page.locator('[data-testid^="shift-demand-row-header-"]').first();
      const shiftId = await firstRowHeader
        .getAttribute('data-testid')
        .then((id) => id?.replace('shift-demand-row-header-', ''));

      const tomorrow = dayjs.utc().add(1, 'day');
      const testDate = tomorrow.format('YYYY-MM-DD');

      // Navigate to the correct month before selecting the cell
      await shiftDemandTestBase.navigateToMonth(page, tomorrow);

      const checkboxes = shiftDemandTestBase.getSelectionCheckboxes(page);
      await checkboxes.cellSelect(shiftId!, testDate).click();

      // Type value and press Enter
      await bulkElements.input.fill('5');
      await bulkElements.input.press('Enter');

      // Verify select mode is exited
      const actionToolbar = shiftDemandTestBase.getActionToolbar(page);
      await expect(actionToolbar).not.toBeVisible();

      // Verify the shift demand value is updated in the table
      const cell = page.locator(`[data-testid="shift-demand-cell-${shiftId}-${testDate}"]`);
      const valueElement = cell.locator(
        `[data-testid="shift-demand-value-${shiftId}-${testDate}"]`,
      );

      await expect(valueElement).toBeVisible();
      await expect(valueElement).toHaveText('5');
    });

    // test("should cancel select mode when pressing Escape in input field", async ({
    //   page,
    // }) => {
    //   const selectButton = shiftDemandTestBase.getSelectButton(page);
    //   const bulkElements = shiftDemandTestBase.getBulkSelectionElements(page);

    //   // Activate select mode
    //   await selectButton.click();

    //   // Press Escape in input field
    //   await bulkElements.input.press("Escape");

    //   // Verify select mode is exited
    //   const actionToolbar = shiftDemandTestBase.getActionToolbar(page);
    //   await expect(actionToolbar).not.toBeVisible();
    // });
  });
});
