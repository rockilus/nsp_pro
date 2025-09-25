import { test, expect } from "@playwright/test";
import { ShiftDemandTestBase } from "../../utils/shift-demand-test-base";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("Shift Demand - Table", () => {
  let shiftDemandTestBase: ShiftDemandTestBase;

  test.beforeAll(async () => {
    // Setup once for all tests to avoid timeout issues
    shiftDemandTestBase = new ShiftDemandTestBase();
    await shiftDemandTestBase.setupShiftDemandTests();
  });

  test.beforeEach(async ({ page }) => {
    // Just navigate to the page since setup is already done
    await shiftDemandTestBase.navigateToShiftDemandsPage(page);
  });

  test("should display all shifts in the row headers", async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid^="shift-demand-row-header-"]');

    // Get all shift row headers
    const rowHeaders = await page
      .locator('[data-testid^="shift-demand-row-header-"]')
      .all();

    // Verify we have the expected number of shifts (4 shifts created in setupShiftDemandTests)
    expect(rowHeaders).toHaveLength(4);

    // Verify each shift name is displayed
    const expectedShiftNames = [
      "Morning Shift",
      "Afternoon Shift",
      "Duty 1",
      "Duty 2",
    ];

    for (let i = 0; i < rowHeaders.length; i++) {
      const header = rowHeaders[i];
      const shiftNameElement = header.locator(
        '[data-testid^="shift-demand-name-"]'
      );
      await expect(shiftNameElement).toBeVisible();

      // Get the text content and check it matches one of our expected names
      const shiftName = await shiftNameElement.textContent();
      expect(expectedShiftNames).toContain(shiftName);
    }
  });

  test("should create a shift demand when clicking on an empty cell", async ({
    page,
  }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid^="shift-demand-cell-"]');

    // Get the first shift's cell for tomorrow to avoid conflicts with other tests
    const tomorrow = dayjs.utc().add(1, "day");
    const dateStr = tomorrow.format("YYYY-MM-DD");

    // Find a shift row and get its first empty cell
    const firstRowHeader = page
      .locator('[data-testid^="shift-demand-row-header-"]')
      .first();
    await expect(firstRowHeader).toBeVisible();

    // Extract the shift ID from the data-testid
    const shiftId = await firstRowHeader
      .getAttribute("data-testid")
      .then((id) => id?.replace("shift-demand-row-header-", ""));
    expect(shiftId).toBeTruthy();

    // Find the cell for this shift and tomorrow's date
    const cellSelector = `[data-testid="shift-demand-cell-${shiftId}-${dateStr}"]`;
    const cell = page.locator(cellSelector);
    await expect(cell).toBeVisible();

    // Verify it's initially empty (should show empty state)
    const emptyState = cell.locator('[data-testid^="shift-demand-empty-"]');
    await expect(emptyState).toBeVisible();

    // Click on the cell to create a demand
    await cell.hover(); // Hover to show the add icon
    await cell.click();

    // Wait for the demand to be created and UI to update
    await page.waitForTimeout(1000); // Allow for API call to complete

    // Verify the cell now shows a value of 1
    const valueElement = cell.locator(
      `[data-testid="shift-demand-value-${shiftId}-${dateStr}"]`
    );
    await expect(valueElement).toBeVisible();
    await expect(valueElement).toHaveText("1");
  });

  test("should show plus and minus buttons on hover and handle increment/decrement", async ({
    page,
  }) => {
    // First, create a shift demand by clicking an empty cell - use a nearby date
    const today = dayjs.utc();
    const testDate = today.add(3, "day"); // Use a closer date that should be visible
    const dateStr = testDate.format("YYYY-MM-DD");

    const firstRowHeader = page
      .locator('[data-testid^="shift-demand-row-header-"]')
      .first();
    await expect(firstRowHeader).toBeVisible();

    const shiftId = await firstRowHeader
      .getAttribute("data-testid")
      .then((id) => id?.replace("shift-demand-row-header-", ""));
    const cellSelector = `[data-testid="shift-demand-cell-${shiftId}-${dateStr}"]`;
    const cell = page.locator(cellSelector);

    // Scroll the date into view if needed
    await cell.scrollIntoViewIfNeeded();

    // Create initial demand
    await cell.hover();
    await cell.click();
    await page.waitForTimeout(1000);

    // Now test increment functionality
    await cell.hover();

    // Verify plus button appears on hover
    const incrementButton = page.locator(
      `[data-testid="shift-demand-increment-${shiftId}-${dateStr}"]`
    );
    await expect(incrementButton).toBeVisible();

    // Verify minus button appears on hover
    const decrementButton = page.locator(
      `[data-testid="shift-demand-decrement-${shiftId}-${dateStr}"]`
    );
    await expect(decrementButton).toBeVisible();

    // Click increment button
    await incrementButton.click();
    await page.waitForTimeout(1000);

    // Verify value increased to 2
    const valueElement = cell.locator(
      `[data-testid="shift-demand-value-${shiftId}-${dateStr}"]`
    );
    await expect(valueElement).toHaveText("2");

    // Test decrement
    await cell.hover();
    await decrementButton.click();
    await page.waitForTimeout(1000);

    // Verify value decreased to 1
    await expect(valueElement).toHaveText("1");
  });

  test("should delete shift demand when decrementing from 1", async ({
    page,
  }) => {
    // Create a shift demand first - use another nearby date
    const today = dayjs.utc();
    const testDate = today.add(2, "day"); // Use a closer date
    const dateStr = testDate.format("YYYY-MM-DD");

    const firstRowHeader = page
      .locator('[data-testid^="shift-demand-row-header-"]')
      .first();
    await expect(firstRowHeader).toBeVisible();

    const shiftId = await firstRowHeader
      .getAttribute("data-testid")
      .then((id) => id?.replace("shift-demand-row-header-", ""));
    const cellSelector = `[data-testid="shift-demand-cell-${shiftId}-${dateStr}"]`;
    const cell = page.locator(cellSelector);

    // Scroll the date into view if needed
    await cell.scrollIntoViewIfNeeded();

    // Create initial demand
    await cell.hover();
    await cell.click();
    await page.waitForTimeout(1000);

    // Verify value is 1
    const valueElement = cell.locator(
      `[data-testid="shift-demand-value-${shiftId}-${dateStr}"]`
    );
    await expect(valueElement).toHaveText("1");

    // Hover and click decrement
    await cell.hover();
    const decrementButton = page.locator(
      `[data-testid="shift-demand-decrement-${shiftId}-${dateStr}"]`
    );
    await decrementButton.click();
    await page.waitForTimeout(1000);

    // Verify the demand was deleted - should show empty state again
    const emptyState = cell.locator('[data-testid^="shift-demand-empty-"]');
    await expect(emptyState).toBeVisible();

    // Verify value element is no longer present
    await expect(valueElement).not.toBeVisible();
  });

  test("should handle multiple increments correctly", async ({ page }) => {
    // Create a shift demand first - use a nearby date
    const today = dayjs.utc();
    const testDate = today.add(1, "day"); // Use tomorrow

    const firstRowHeader = page
      .locator('[data-testid^="shift-demand-row-header-"]')
      .nth(1); // Use second shift to avoid conflicts
    await expect(firstRowHeader).toBeVisible();

    const shiftId = await firstRowHeader
      .getAttribute("data-testid")
      .then((id) => id?.replace("shift-demand-row-header-", ""));
    const cellSelector = `[data-testid="shift-demand-cell-${shiftId}-${testDate.format(
      "YYYY-MM-DD"
    )}"]`;
    const cell = page.locator(cellSelector);

    // Scroll the date into view if needed
    await cell.scrollIntoViewIfNeeded();

    // Create initial demand
    await cell.hover();
    await cell.click();
    await page.waitForTimeout(1000);

    const valueElement = cell.locator(
      `[data-testid="shift-demand-value-${shiftId}-${testDate.format(
        "YYYY-MM-DD"
      )}"]`
    );
    const incrementButton = page.locator(
      `[data-testid="shift-demand-increment-${shiftId}-${testDate.format(
        "YYYY-MM-DD"
      )}"]`
    );

    // Increment multiple times
    for (let i = 2; i <= 5; i++) {
      await cell.hover();
      await incrementButton.click();
      await page.waitForTimeout(500);
      await expect(valueElement).toHaveText(i.toString());
    }

    // Verify final value
    await expect(valueElement).toHaveText("5");
  });

  test("should work with different shifts and dates", async ({ page }) => {
    // Test with multiple shifts and dates - use nearby dates
    const today = dayjs.utc();

    const rowHeaders = await page
      .locator('[data-testid^="shift-demand-row-header-"]')
      .all();
    expect(rowHeaders.length).toBeGreaterThanOrEqual(2);

    // Use different shifts to avoid conflicts with other tests
    const shiftId1 = await rowHeaders[2]
      .getAttribute("data-testid")
      .then((id) => id?.replace("shift-demand-row-header-", ""));
    const shiftId2 = await rowHeaders[3]
      .getAttribute("data-testid")
      .then((id) => id?.replace("shift-demand-row-header-", ""));

    // Use today and tomorrow to stay within current view
    const testDate1 = today;
    const testDate2 = today.add(1, "day");

    const cell1 = page.locator(
      `[data-testid="shift-demand-cell-${shiftId1}-${testDate1.format(
        "YYYY-MM-DD"
      )}"]`
    );
    const cell2 = page.locator(
      `[data-testid="shift-demand-cell-${shiftId2}-${testDate2.format(
        "YYYY-MM-DD"
      )}"]`
    );

    // Scroll cells into view
    await cell1.scrollIntoViewIfNeeded();
    await cell2.scrollIntoViewIfNeeded();

    // Test with first shift, test date 1
    await cell1.hover();
    await cell1.click();
    await page.waitForTimeout(1000);

    let valueElement = cell1.locator(
      `[data-testid="shift-demand-value-${shiftId1}-${testDate1.format(
        "YYYY-MM-DD"
      )}"]`
    );
    await expect(valueElement).toHaveText("1");

    // Test with second shift, test date 2
    await cell2.hover();
    await cell2.click();
    await page.waitForTimeout(1000);

    valueElement = cell2.locator(
      `[data-testid="shift-demand-value-${shiftId2}-${testDate2.format(
        "YYYY-MM-DD"
      )}"]`
    );
    await expect(valueElement).toHaveText("1");

    // Verify both demands exist independently
    await expect(
      cell1.locator(
        `[data-testid="shift-demand-value-${shiftId1}-${testDate1.format(
          "YYYY-MM-DD"
        )}"]`
      )
    ).toHaveText("1");
    await expect(
      cell2.locator(
        `[data-testid="shift-demand-value-${shiftId2}-${testDate2.format(
          "YYYY-MM-DD"
        )}"]`
      )
    ).toHaveText("1");
  });

  test("should display shift information correctly in row headers", async ({
    page,
  }) => {
    // Wait for the table to load
    await page.waitForSelector('[data-testid^="shift-demand-row-header-"]');

    const rowHeaders = await page
      .locator('[data-testid^="shift-demand-row-header-"]')
      .all();

    for (const header of rowHeaders) {
      // Check that shift name is visible
      const nameElement = header.locator('[data-testid^="shift-demand-name-"]');
      await expect(nameElement).toBeVisible();

      // Check that the name is not empty
      const nameText = await nameElement.textContent();
      expect(nameText).toBeTruthy();
      expect(nameText?.length).toBeGreaterThan(0);
    }
  });
});
