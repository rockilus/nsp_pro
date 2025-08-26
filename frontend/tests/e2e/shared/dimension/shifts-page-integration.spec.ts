import { test, expect } from "@playwright/test";
import { DimensionTestBase } from "../../../utils/dimension-test-base";
import { DimensionEntryType } from "../../../../src/types/dimension";

const dimensionTestBase = new DimensionTestBase();

test.describe("Shifts Page - Dimension Integration", () => {
  test.beforeAll(async () => {
    // Setup the test environment
    await dimensionTestBase.setupDimensionTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the shifts page
    const testTeam = dimensionTestBase.getTestTeam();
    if (!testTeam) {
      throw new Error("Test team not available");
    }

    await page.goto(`/en/plan/shifts?teamId=${testTeam.teamId}`);
    await page.waitForSelector('[aria-label="shift table"]');
  });

  test("should add new dimension column to shifts table", async ({ page }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    const propertyName = "Shift Location";

    // Fill in valid data
    await dimensionTestBase.fillNameField(page, propertyName);
    await dimensionTestBase.selectType(page, DimensionEntryType.STR);

    // Submit
    await dimensionTestBase.clickAddButton(page);
    await dimensionTestBase.waitForPopupHidden(page);

    // Wait for new column to appear in the shifts table
    await dimensionTestBase.waitForNewColumn(page, propertyName);

    // Verify the new column header exists in the shifts table
    const columnExists = await dimensionTestBase.columnExists(
      page,
      propertyName
    );
    expect(columnExists).toBe(true);

    console.log(
      `✅ Shift dimension '${propertyName}' added successfully to shifts table`
    );
  });

  test("should create shift-specific dimension with intensity level", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    const propertyName = "Intensity Level";

    // Fill in shift-specific property data
    await dimensionTestBase.fillNameField(page, propertyName);
    await dimensionTestBase.selectType(page, DimensionEntryType.INT);

    // Submit
    await dimensionTestBase.clickAddButton(page);
    await dimensionTestBase.waitForPopupHidden(page);

    // Verify column was added to shifts table
    await dimensionTestBase.waitForNewColumn(page, propertyName);
    const columnExists = await dimensionTestBase.columnExists(
      page,
      propertyName
    );
    expect(columnExists).toBe(true);

    console.log(
      `✅ Shift-specific dimension '${propertyName}' created successfully`
    );
  });

  test("should handle shift-specific tags dimension", async ({ page }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    const propertyName = "Shift Requirements";

    // Fill in tags-type dimension for shifts
    await dimensionTestBase.fillNameField(page, propertyName);
    await dimensionTestBase.selectType(page, DimensionEntryType.DIM_ENTRIES);

    // Verify tags section appears
    const tagsSection = dimensionTestBase.getTagsSection(page);
    await expect(tagsSection).toBeVisible();

    // Submit
    await dimensionTestBase.clickAddButton(page);
    await dimensionTestBase.waitForPopupHidden(page);

    // Verify column was added to shifts table
    await dimensionTestBase.waitForNewColumn(page, propertyName);
    const columnExists = await dimensionTestBase.columnExists(
      page,
      propertyName
    );
    expect(columnExists).toBe(true);

    console.log(
      `✅ Shift-specific tags dimension '${propertyName}' created successfully`
    );
  });
});
