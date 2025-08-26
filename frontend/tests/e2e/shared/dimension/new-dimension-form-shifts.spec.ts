import { test, expect } from "@playwright/test";
import { DimensionTestBase } from "../../../utils/dimension-test-base";
import { DimensionEntryType } from "../../../../src/types/dimension";

const dimensionTestBase = new DimensionTestBase();

test.describe("NewDimensionForm on Shifts Page", () => {
  test.beforeAll(async () => {
    // Setup the common dimension test environment
    await dimensionTestBase.setupDimensionTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the shifts page for each test
    const testTeam = dimensionTestBase.getTestTeam();
    if (!testTeam) {
      throw new Error("Test team not available");
    }

    await page.goto(`/en/plan/shifts?teamId=${testTeam.teamId}`);
    await page.waitForSelector('[aria-label="shift table"]');
  });

  test("should show popup with title 'New property' when clicking on the add property button", async ({
    page,
  }) => {
    // Click the Add Property button
    const addPropertyButton = dimensionTestBase.getAddPropertyButton(page);
    await addPropertyButton.click();

    // Wait for popup to appear
    await dimensionTestBase.waitForPopupVisible(page);

    // Verify popup is visible
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).toBeVisible();

    // Verify popup title
    const popupTitle = dimensionTestBase.getPopupTitle(page);
    await expect(popupTitle).toContainText("New property");

    console.log(
      "✅ Popup appears with correct title when clicking Add Property button on shifts page"
    );
  });

  test("should close popup when clicking on the close icon", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Verify popup is visible
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).toBeVisible();

    // Click the close button
    await dimensionTestBase.closePopupViaCloseButton(page);

    // Wait for popup to close
    await dimensionTestBase.waitForPopupHidden(page);

    // Verify popup is no longer visible
    await expect(popup).not.toBeVisible();

    console.log("✅ Popup closes when clicking close icon on shifts page");
  });

  test("should contain a name text field", async ({ page }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Verify name text field exists and is visible
    const nameField = dimensionTestBase.getNameTextField(page);
    await expect(nameField).toBeVisible();

    // Verify it's a text input
    await expect(nameField).toHaveAttribute("type", "text");

    // Verify the label
    const nameFieldLabel = page.locator('label:has-text("Name")');
    await expect(nameFieldLabel).toBeVisible();

    console.log(
      "✅ Name text field is present and properly labeled on shifts page"
    );
  });

  test("should close popup and add new column when name and type are properly filled", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    const propertyName = "Shift Location";

    // Fill in valid data
    await dimensionTestBase.fillNameField(page, propertyName);
    await dimensionTestBase.selectType(page, DimensionEntryType.STR);

    // Click add button
    await dimensionTestBase.clickAddButton(page);

    // Wait for popup to close
    await dimensionTestBase.waitForPopupHidden(page);

    // Verify popup is closed
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).not.toBeVisible();

    // Wait for new column to appear in the table
    await dimensionTestBase.waitForNewColumn(page, propertyName);

    // Verify the new column header exists in the table
    const columnExists = await dimensionTestBase.columnExists(
      page,
      propertyName
    );
    expect(columnExists).toBe(true);

    console.log(
      `✅ Popup closes and new column '${propertyName}' is added to the shifts table`
    );
  });

  test("should show tags section when type 'tags' is selected", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Select tags type
    await dimensionTestBase.selectType(page, DimensionEntryType.DIM_ENTRIES);

    // Verify tags section appears
    const tagsSection = dimensionTestBase.getTagsSection(page);
    await expect(tagsSection).toBeVisible();

    // Change to a different type
    await dimensionTestBase.selectType(page, DimensionEntryType.STR);

    // Verify tags section disappears
    await expect(tagsSection).not.toBeVisible();

    console.log(
      "✅ Tags section appears/disappears correctly based on type selection on shifts page"
    );
  });

  test("should create shift-specific dimension successfully", async ({
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

    // Verify column was added
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
});
