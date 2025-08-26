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

    // Fill in bool-type dimension for workers
    await dimensionTestBase.fillNameField(page, propertyName);
    await dimensionTestBase.selectType(page, DimensionEntryType.BOOL);

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
      `✅ Worker-specific bool dimension '${propertyName}' created successfully`
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

  // Tests for linked dimensions
  test.describe("Linked Dimensions", () => {
    test("should show shift dimension of type bool in link dimension list", async ({
      page,
    }) => {
      // Create a shift dimension of type bool
      const shiftDimension = await dimensionTestBase.createTestDimension({
        name: "Test Shift Bool Dimension",
        entryType: DimensionEntryType.BOOL,
        dimensionType: DimensionType.SHIFT,
      });

      // Refresh the page to ensure the UI is updated with the new dimension
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Open the popup (we're on workers page, so this will be for worker dimension type)
      await dimensionTestBase.openNewDimensionPopup(page);
      await dimensionTestBase.waitForPopupVisible(page);

      // Check if the shift dimension appears in the link dimension list
      const isInLinkList = await dimensionTestBase.isDimensionInLinkList(
        page,
        shiftDimension.name
      );
      expect(isInLinkList).toBe(true);

      console.log(
        "✅ Shift dimension of type bool appears in link dimension list"
      );

      // Clean up
      await dimensionTestBase.deleteTestDimension(shiftDimension.dimensionId);
    });

    test("should show shift dimension of type dim entries in link dimension list", async ({
      page,
    }) => {
      // Create a shift dimension of type dim entries
      const shiftDimension = await dimensionTestBase.createTestDimension({
        name: "Test Shift Tags Dimension",
        entryType: DimensionEntryType.DIM_ENTRIES,
        dimensionType: DimensionType.SHIFT,
        dimEntries: [
          { id: "", name: "Tag1", dimensionId: "", deleted: false },
          { id: "", name: "Tag2", dimensionId: "", deleted: false },
        ],
      });

      // Refresh the page to ensure the UI is updated with the new dimension
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Open the popup (we're on workers page, so this will be for worker dimension type)
      await dimensionTestBase.openNewDimensionPopup(page);
      await dimensionTestBase.waitForPopupVisible(page);

      // Check if the shift dimension appears in the link dimension list
      const isInLinkList = await dimensionTestBase.isDimensionInLinkList(
        page,
        shiftDimension.name
      );
      expect(isInLinkList).toBe(true);

      console.log(
        "✅ Shift dimension of type dim entries appears in link dimension list"
      );

      // Clean up
      await dimensionTestBase.deleteTestDimension(shiftDimension.dimensionId);
    });

    test("should not show shift dimensions of type text and int in link dimension list", async ({
      page,
    }) => {
      // Create shift dimensions of type text and int
      const textDimension = await dimensionTestBase.createTestDimension({
        name: "Test Shift Text Dimension",
        entryType: DimensionEntryType.STR,
        dimensionType: DimensionType.SHIFT,
      });

      const intDimension = await dimensionTestBase.createTestDimension({
        name: "Test Shift Int Dimension",
        entryType: DimensionEntryType.INT,
        dimensionType: DimensionType.SHIFT,
      });

      // Refresh the page to ensure the UI is updated with the new dimensions
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Open the popup (we're on workers page, so this will be for worker dimension type)
      await dimensionTestBase.openNewDimensionPopup(page);
      await dimensionTestBase.waitForPopupVisible(page);

      // Check that text dimension does not appear in link list
      const textIsInLinkList = await dimensionTestBase.isDimensionInLinkList(
        page,
        textDimension.name
      );
      expect(textIsInLinkList).toBe(false);

      // Check that int dimension does not appear in link list
      const intIsInLinkList = await dimensionTestBase.isDimensionInLinkList(
        page,
        intDimension.name
      );
      expect(intIsInLinkList).toBe(false);

      console.log(
        "✅ Shift dimensions of type text and int do not appear in link dimension list"
      );

      // Clean up
      await dimensionTestBase.deleteTestDimension(textDimension.dimensionId);
      await dimensionTestBase.deleteTestDimension(intDimension.dimensionId);
    });

    test("should create same dimension for worker tab when clicking on shift dimension in link list", async ({
      page,
    }) => {
      // Create a shift dimension of type bool
      const shiftDimension = await dimensionTestBase.createTestDimension({
        name: "Test Linkable Shift Dimension",
        entryType: DimensionEntryType.BOOL,
        dimensionType: DimensionType.SHIFT,
      });

      // Refresh the page to ensure the UI is updated with the new dimension
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Open the popup (we're on workers page, so this will be for worker dimension type)
      await dimensionTestBase.openNewDimensionPopup(page);
      await dimensionTestBase.waitForPopupVisible(page);

      // Verify the dimension appears in link list
      const isInLinkList = await dimensionTestBase.isDimensionInLinkList(
        page,
        shiftDimension.name
      );
      expect(isInLinkList).toBe(true);

      // Click on the dimension to select it
      await dimensionTestBase.selectLinkDimension(page, shiftDimension.name);

      // Verify it becomes selected (add button appears)
      const isSelected = await dimensionTestBase.isDimensionSelected(
        page,
        shiftDimension.name
      );
      expect(isSelected).toBe(true);

      // Click the add button to link the dimension
      await dimensionTestBase.linkDimension(page, shiftDimension.name);

      // Wait for popup to close
      await dimensionTestBase.waitForPopupHidden(page);

      // Verify the dimension now appears as a column in the workers table
      await dimensionTestBase.waitForNewColumn(page, shiftDimension.name);
      const columnExists = await dimensionTestBase.columnExists(
        page,
        shiftDimension.name
      );
      expect(columnExists).toBe(true);

      console.log(
        "✅ Clicking on shift dimension in link list creates same dimension for worker tab"
      );

      // Clean up
      await dimensionTestBase.deleteTestDimension(shiftDimension.dimensionId);
    });
  });
});
