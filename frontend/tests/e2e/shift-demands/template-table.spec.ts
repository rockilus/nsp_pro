/**
 * End-to-end tests for TemplateTable component in Shift Demands page
 *
 * Tests cover:
 * - Template table display and navigation
 * - Shift row headers display
 * - Template cell interactions (empty state, value creation, increment/decrement)
 * - Bulk selection mode functionality
 * - Week-based table layout (vs date-based for shift demands)
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

test.describe("Template Table", () => {
  let templateTestBase: TemplateTestBase;
  let testTemplateId: string;

  test.beforeAll(async () => {
    // Setup once for all tests to avoid timeout issues
    templateTestBase = new TemplateTestBase();
    await templateTestBase.setupTemplateTests();

    // Create a test template for table testing
    testTemplateId = await templateTestBase.createTemplateViaAPI({
      name: "Test Template for Table",
      description: "Template created for testing table functionality",
    });
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to template management and select our test template
    await templateTestBase.navigateToShiftDemandsPage(page);
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.selectTemplateAndWaitForTable(page, testTemplateId);
  });

  test.describe("Table Display", () => {
    test("should display template table with proper structure", async ({
      page,
    }) => {
      const templateTable = templateTestBase.getTemplateTable(page);
      await expect(templateTable).toBeVisible();

      // Check that we have week headers (template tables show weeks, not dates)
      const weekHeaders = templateTestBase.getTemplateWeekHeaders(page);
      const weekHeadersCount = await weekHeaders.count();
      expect(weekHeadersCount).toBeGreaterThan(0);

      // Verify the first week header exists
      const firstWeekHeader = templateTestBase.getTemplateWeekHeader(page, 0);
      await expect(firstWeekHeader).toBeVisible();
    });

    test("should display all shifts in the row headers", async ({ page }) => {
      // Wait for the template table to load
      await templateTestBase.waitForTemplateTableLoaded(page);

      // Get all shift row headers
      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const rowHeadersCount = await rowHeaders.count();

      // Use the shifts created during setup to assert the table rows
      const createdShiftIds = templateTestBase.getCreatedShiftIds();

      // At minimum, the number of created shifts should match the row headers
      expect(rowHeadersCount).toBeGreaterThanOrEqual(createdShiftIds.length);

      // Verify each created shift is present in the row headers and its name is visible
      for (const shiftId of createdShiftIds) {
        const header = templateTestBase.getTemplateRowHeader(page, shiftId);
        await expect(header).toBeVisible();

        const shiftNameElement = templateTestBase.getTemplateShiftName(
          page,
          shiftId,
        );
        await expect(shiftNameElement).toBeVisible();

        const shiftName = await shiftNameElement.textContent();
        // Ensure the name is a non-empty string
        expect(shiftName && shiftName.trim().length).toBeGreaterThan(0);
      }
    });

    test("should display week-based headers instead of date-based headers", async ({
      page,
    }) => {
      // Template tables should show "Week 1", "Week 2", etc., not specific dates
      const weekHeaders = templateTestBase.getTemplateWeekHeaders(page);
      const firstWeekHeader = weekHeaders.first();
      await expect(firstWeekHeader).toBeVisible();

      // The header should contain "Week" text (this is different from shift demand table)
      const headerText = await firstWeekHeader.textContent();
      expect(headerText).toMatch(/Week\s+\d+/i);
    });
  });

  test.describe("Cell Interactions", () => {
    test("should create a template demand when clicking on an empty cell", async ({
      page,
    }) => {
      // Wait for the template table to load
      await templateTestBase.waitForTemplateTableLoaded(page);

      // Get the first shift's first cell (Week 0, Monday = dayIndex 0)
      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));
      expect(shiftId).toBeTruthy();

      // Find a cell for week 0, day 0 (Monday)
      const weekNumber = 0;
      const dayIndex = 0; // Monday
      const cell = templateTestBase.getTemplateCell(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await expect(cell).toBeVisible();

      // Verify it's initially empty (should show empty state)
      const emptyState = templateTestBase.getTemplateEmptyState(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await expect(emptyState).toBeVisible();

      // Click on the cell to create a demand
      await cell.hover(); // Hover to show the add icon
      await cell.click();

      // Wait for the demand to be created and UI to update
      const valueElement = templateTestBase.getTemplateValue(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await expect(valueElement).toBeVisible();
      await expect(valueElement).toHaveText("1");
    });

    test("should show plus and minus buttons on hover and handle increment/decrement", async ({
      page,
    }) => {
      // First, create a template demand by clicking an empty cell
      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      const weekNumber = 0;
      const dayIndex = 1; // Tuesday
      const cell = templateTestBase.getTemplateCell(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );

      // Click to create initial demand
      await cell.hover();
      await cell.click();

      // Wait for value to appear
      const valueElement = templateTestBase.getTemplateValue(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await expect(valueElement).toBeVisible();
      await expect(valueElement).toHaveText("1");

      // Hover over the cell to show increment/decrement buttons
      await cell.hover();

      // Test increment
      const incrementButton = templateTestBase.getTemplateIncrementButton(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await expect(incrementButton).toBeVisible();
      await incrementButton.click();

      // Check that value increased
      await expect(valueElement).toHaveText("2");

      // Test decrement
      const decrementButton = templateTestBase.getTemplateDecrementButton(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await expect(decrementButton).toBeVisible();
      await decrementButton.click();

      // Check that value decreased
      await expect(valueElement).toHaveText("1");

      // Test decrement to zero (should return to empty state)
      await decrementButton.click();
      await expect(valueElement).not.toBeVisible();

      // Should show empty state again
      const emptyState = templateTestBase.getTemplateEmptyState(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await expect(emptyState).toBeVisible();
    });

    test("should handle multiple cells in the same row", async ({ page }) => {
      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      const weekNumber = 0;

      // Create demands for multiple days of the week
      for (let dayIndex = 0; dayIndex < 3; dayIndex++) {
        const cell = templateTestBase.getTemplateCell(
          page,
          shiftId!,
          weekNumber,
          dayIndex,
        );
        await cell.hover();
        await cell.click();

        const valueElement = templateTestBase.getTemplateValue(
          page,
          shiftId!,
          weekNumber,
          dayIndex,
        );
        await expect(valueElement).toBeVisible();
        await expect(valueElement).toHaveText("1");
      }

      // Verify all three cells now have values
      for (let dayIndex = 0; dayIndex < 3; dayIndex++) {
        const valueElement = templateTestBase.getTemplateValue(
          page,
          shiftId!,
          weekNumber,
          dayIndex,
        );
        await expect(valueElement).toHaveText("1");
      }
    });

    test("should handle cells across different weeks", async ({ page }) => {
      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      // Create demands in week 0 and week 1 (if week 1 is visible)
      const weekHeaders = templateTestBase.getTemplateWeekHeaders(page);
      const weekCount = await weekHeaders.count();

      if (weekCount >= 2) {
        // Test week 0, day 0
        const cell1 = templateTestBase.getTemplateCell(page, shiftId!, 0, 0);
        await cell1.hover();
        await cell1.click();

        const value1 = templateTestBase.getTemplateValue(page, shiftId!, 0, 0);
        await expect(value1).toHaveText("1");

        // Test week 1, day 0 (if displayed)
        const cell2 = templateTestBase.getTemplateCell(page, shiftId!, 1, 0);
        await cell2.hover();
        await cell2.click();

        const value2 = templateTestBase.getTemplateValue(page, shiftId!, 1, 0);
        await expect(value2).toHaveText("1");
      } else {
        // If only one week is visible, test multiple days in that week
        for (let dayIndex = 0; dayIndex < 2; dayIndex++) {
          const cell = templateTestBase.getTemplateCell(
            page,
            shiftId!,
            0,
            dayIndex,
          );
          await cell.hover();
          await cell.click();

          const value = templateTestBase.getTemplateValue(
            page,
            shiftId!,
            0,
            dayIndex,
          );
          await expect(value).toHaveText("1");
        }
      }
    });
  });

  test.describe("Bulk Selection Mode", () => {
    test("should activate bulk selection mode when clicking select button", async ({
      page,
    }) => {
      // Find and click the select button (this would be in the template toolbar)
      const selectButton = templateTestBase.getTemplateSelectButton(page);
      await selectButton.click();

      // Verify that checkboxes appear in cells
      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      const checkbox = templateTestBase.getTemplateCellCheckbox(
        page,
        shiftId!,
        0,
        0,
      );
      await expect(checkbox).toBeVisible();

      // Verify action toolbar appears
      const actionToolbar = templateTestBase.getTemplateActionToolbar(page);
      await expect(actionToolbar).toBeVisible();
    });

    test("should select and deselect individual cells in bulk mode", async ({
      page,
    }) => {
      // Activate bulk mode
      await templateTestBase.activateTemplateSelectMode(page);

      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      const weekNumber = 0;
      const dayIndex = 0;

      // Click checkbox to select cell
      const checkbox = templateTestBase.getTemplateCellCheckbox(
        page,
        shiftId!,
        weekNumber,
        dayIndex,
      );
      await checkbox.click();
      await expect(checkbox).toBeChecked();

      // Verify action buttons are enabled when cells are selected
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);
      await expect(bulkElements.deleteButton).toBeEnabled();
      await expect(bulkElements.confirmButton).toBeEnabled();

      // Click again to deselect
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();

      // Verify action buttons are disabled when no cells are selected
      await expect(bulkElements.deleteButton).toBeDisabled();
      await expect(bulkElements.confirmButton).toBeDisabled();
    });

    test("should select all cells in a row when clicking row checkbox", async ({
      page,
    }) => {
      await templateTestBase.activateTemplateSelectMode(page);

      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      // Click row checkbox
      const rowCheckbox = templateTestBase.getTemplateRowCheckbox(
        page,
        shiftId!,
      );
      await rowCheckbox.click();

      // Verify that action buttons are enabled (indicating cells are selected)
      const bulkElements =
        templateTestBase.getTemplateBulkSelectionElements(page);
      await expect(bulkElements.deleteButton).toBeEnabled();
      await expect(bulkElements.confirmButton).toBeEnabled();

      // Verify that individual cells in the row are checked
      const firstCellCheckbox = templateTestBase.getTemplateCellCheckbox(
        page,
        shiftId!,
        0,
        0,
      );
      await expect(firstCellCheckbox).toBeChecked();
    });

    test("should apply bulk changes to selected cells", async ({ page }) => {
      await templateTestBase.activateTemplateSelectMode(page);

      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      // Select a few cells
      for (let dayIndex = 0; dayIndex < 2; dayIndex++) {
        const checkbox = templateTestBase.getTemplateCellCheckbox(
          page,
          shiftId!,
          0,
          dayIndex,
        );
        await checkbox.click();
      }

      // Apply bulk change with value "3"
      // Note: This will automatically exit bulk mode
      await templateTestBase.applyTemplateBulkChange(page, "3");

      // Verify the values were set (bulk mode has already exited after applying changes)
      for (let dayIndex = 0; dayIndex < 2; dayIndex++) {
        const valueElement = templateTestBase.getTemplateValue(
          page,
          shiftId!,
          0,
          dayIndex,
        );
        await expect(valueElement).toContainText("3");
      }
    });
  });

  test.describe("Weekend Styling", () => {
    test("should apply weekend styling to Saturday and Sunday columns", async ({
      page,
    }) => {
      // Wait for table to load
      await templateTestBase.waitForTemplateTableLoaded(page);

      const rowHeaders = templateTestBase.getTemplateRowHeaders(page);
      const firstRowHeader = rowHeaders.first();
      const shiftId = await firstRowHeader
        .getAttribute("data-testid")
        .then((id) => id?.replace("template-row-header-", ""));

      // Check Saturday (dayIndex 5) and Sunday (dayIndex 6) cells have weekend styling
      const saturdayCell = templateTestBase.getTemplateCell(
        page,
        shiftId!,
        0,
        5,
      );
      const sundayCell = templateTestBase.getTemplateCell(page, shiftId!, 0, 6);

      // Check that weekend cells have the weekend class
      await expect(saturdayCell).toHaveClass(/weekend/);
      await expect(sundayCell).toHaveClass(/weekend/);

      // Check that Monday (dayIndex 0) does not have weekend styling
      const mondayCell = templateTestBase.getTemplateCell(page, shiftId!, 0, 0);
      await expect(mondayCell).not.toHaveClass(/weekend/);
    });
  });
});
