import { test, expect } from "@playwright/test";
import { DimensionTestBase } from "../../../utils/dimension-test-base";
import {
  DimensionEntryType,
  DimensionType,
} from "../../../../src/types/dimension";

const dimensionTestBase = new DimensionTestBase();

test.describe("Workers Page - Dimension Integration", () => {
  let testWorker: { workerId: string; name: string; teamId: string };

  test.beforeAll(async () => {
    // Setup the test environment
    await dimensionTestBase.setupDimensionTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    // Create a fresh test worker for each test
    const workerName = `Test Worker ${test.info().workerIndex}-${Date.now()}`;
    testWorker = await dimensionTestBase.createTestWorker({
      name: workerName,
      acronym: "TW",
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.workerId})`
    );

    // Navigate to the workers page
    await dimensionTestBase.navigateToWorkersPage(page);

    // Wait for the worker table to load and our test worker to appear
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify our test worker is visible in the table
    const workerRows = dimensionTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);
  });

  test.afterEach(async () => {
    // Clean up: delete the worker created for this test
    if (testWorker?.workerId) {
      try {
        await dimensionTestBase.deleteTestWorker(testWorker.workerId);
        console.log(`Deleted test worker: ${testWorker.workerId}`);
      } catch (error) {
        console.warn(
          `Failed to delete test worker ${testWorker.workerId}:`,
          error
        );
      }
    }
  });

  test("should add new dimension column to workers table", async ({ page }) => {
    const propertyName = "Worker Department";

    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Fill in valid data
    await dimensionTestBase.fillNameField(page, propertyName);
    await dimensionTestBase.selectType(page, DimensionEntryType.STR);

    // Submit
    await dimensionTestBase.clickAddButton(page);
    await dimensionTestBase.waitForPopupHidden(page);

    // Wait for new column to appear in the workers table
    await dimensionTestBase.waitForNewColumn(page, propertyName);

    // Verify the new column header exists in the workers table
    const columnExists = await dimensionTestBase.columnExists(
      page,
      propertyName
    );
    expect(columnExists).toBe(true);

    // Verify it has the correct data-testid for worker dimension
    const headerCell = page.locator(
      `[data-testid*="worker-dimension-"][data-testid*="header-cell"]`
    );
    await expect(headerCell).toBeVisible();

    console.log(
      `✅ Worker dimension '${propertyName}' added successfully to workers table`
    );
  });

  test("should create worker-specific dimension with complex type", async ({
    page,
  }) => {
    const propertyName = "Worker Skills";

    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Fill in tags-type dimension for workers
    await dimensionTestBase.fillNameField(page, propertyName);
    await dimensionTestBase.selectType(page, DimensionEntryType.DIM_ENTRIES);

    // Verify tags section appears
    const tagsSection = dimensionTestBase.getTagsSection(page);
    await expect(tagsSection).toBeVisible();

    // Submit
    await dimensionTestBase.clickAddButton(page);
    await dimensionTestBase.waitForPopupHidden(page);

    // Verify column was added to workers table
    await dimensionTestBase.waitForNewColumn(page, propertyName);
    const columnExists = await dimensionTestBase.columnExists(
      page,
      propertyName
    );
    expect(columnExists).toBe(true);

    console.log(
      `✅ Worker-specific tags dimension '${propertyName}' created successfully`
    );
  });

  test("should handle multiple worker dimensions creation", async ({
    page,
  }) => {
    const workerProperties = [
      { name: "Worker Department", type: DimensionEntryType.STR },
      { name: "Worker Experience", type: DimensionEntryType.INT },
      { name: "Worker Is Manager", type: DimensionEntryType.BOOL },
    ];

    for (const property of workerProperties) {
      // Open the popup
      await dimensionTestBase.openNewDimensionPopup(page);
      await dimensionTestBase.waitForPopupVisible(page);

      // Fill in the property data
      await dimensionTestBase.fillNameField(page, property.name);
      await dimensionTestBase.selectType(page, property.type);

      // Submit
      await dimensionTestBase.clickAddButton(page);
      await dimensionTestBase.waitForPopupHidden(page);

      // Verify column was added to workers table
      await dimensionTestBase.waitForNewColumn(page, property.name);
      const columnExists = await dimensionTestBase.columnExists(
        page,
        property.name
      );
      expect(columnExists).toBe(true);
    }

    console.log("✅ Multiple worker dimensions created successfully");
  });
});
