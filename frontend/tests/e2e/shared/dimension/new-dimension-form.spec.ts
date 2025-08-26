import { test, expect } from "@playwright/test";
import { DimensionTestBase } from "../../../utils/dimension-test-base";
import { DimensionEntryType } from "../../../../src/types/dimension";

const dimensionTestBase = new DimensionTestBase();

test.describe("NewDimensionForm Component", () => {
  test.beforeAll(async () => {
    // Setup the common dimension test environment
    await dimensionTestBase.setupDimensionTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the workers page for each test
    await dimensionTestBase.navigateToWorkersPage(page);
  });

  test("should show popup with title 'New property' when clicking add button", async ({
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
      "✅ Popup appears with correct title when clicking Add Property button"
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

    console.log("✅ Popup closes when clicking close icon");
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

    console.log("✅ Name text field is present and properly labeled");
  });

  test("should contain a type select with correct options", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Verify type select exists
    const typeSelect = dimensionTestBase.getTypeSelect(page);
    await expect(typeSelect).toBeVisible();

    // Click to open the dropdown
    const typeSelectDropdown = dimensionTestBase.getTypeSelectDropdown(page);
    await typeSelectDropdown.click();

    // Verify all expected options are present
    const textOption = dimensionTestBase.getTypeOption(
      page,
      DimensionEntryType.STR
    );
    const numberOption = dimensionTestBase.getTypeOption(
      page,
      DimensionEntryType.INT
    );
    const boolOption = dimensionTestBase.getTypeOption(
      page,
      DimensionEntryType.BOOL
    );
    const tagsOption = dimensionTestBase.getTypeOption(
      page,
      DimensionEntryType.DIM_ENTRIES
    );

    await expect(textOption).toBeVisible();
    await expect(numberOption).toBeVisible();
    await expect(boolOption).toBeVisible();
    await expect(tagsOption).toBeVisible();

    // Verify option text content
    await expect(textOption).toContainText("Text");
    await expect(numberOption).toContainText("Number");
    await expect(boolOption).toContainText("True/False");
    await expect(tagsOption).toContainText("Tags");

    console.log(
      "✅ Type select contains all expected options with correct labels"
    );
  });

  test("should return error when clicking add button with empty name", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Leave name field empty, select a type
    await dimensionTestBase.selectType(page, DimensionEntryType.STR);

    // Click add button
    await dimensionTestBase.clickAddButton(page);

    // Verify error appears for name field
    const nameField = dimensionTestBase.getNameTextField(page);
    await expect(nameField).toHaveAttribute("aria-invalid", "true");

    // Verify helper text contains error message
    const helperText = page.locator(
      '.MuiFormHelperText-root.Mui-error:has-text("Please enter a name")'
    );
    await expect(helperText).toBeVisible();

    // Verify popup is still open (didn't close due to error)
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).toBeVisible();

    console.log("✅ Error message appears when name is empty");
  });

  test("should return error when clicking add button with empty type", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Fill name field, leave type empty
    await dimensionTestBase.fillNameField(page, "Test Property");

    // Click add button without selecting a type
    await dimensionTestBase.clickAddButton(page);

    // Verify error appears for type field
    const typeSelect = dimensionTestBase.getTypeSelect(page);
    await expect(typeSelect.locator(".MuiOutlinedInput-root")).toHaveClass(
      /Mui-error/
    );

    // Verify type error message appears
    const typeErrorMessage = dimensionTestBase.getTypeErrorMessage(page);
    await expect(typeErrorMessage).toBeVisible();

    // Verify popup is still open (didn't close due to error)
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).toBeVisible();

    console.log("✅ Error message appears when type is not selected");
  });

  test("should return error when clicking add button with both name and type empty", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Click add button without filling anything
    await dimensionTestBase.clickAddButton(page);

    // Verify both fields show errors
    const nameField = dimensionTestBase.getNameTextField(page);
    await expect(nameField).toHaveAttribute("aria-invalid", "true");

    const typeSelect = dimensionTestBase.getTypeSelect(page);
    await expect(typeSelect.locator(".MuiOutlinedInput-root")).toHaveClass(
      /Mui-error/
    );

    // Verify both error messages appear
    const nameHelperText = page.locator(
      '.MuiFormHelperText-root.Mui-error:has-text("Please enter a name")'
    );
    await expect(nameHelperText).toBeVisible();

    const typeErrorMessage = dimensionTestBase.getTypeErrorMessage(page);
    await expect(typeErrorMessage).toBeVisible();

    // Verify popup is still open (didn't close due to errors)
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).toBeVisible();

    console.log("✅ Both error messages appear when both fields are empty");
  });

  test("should close popup when form is submitted with valid data", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    const propertyName = "Test Property";

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

    console.log("✅ Popup closes when form is submitted with valid data");
  });

  test("should close popup when pressing escape", async ({ page }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Verify popup is visible
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).toBeVisible();

    // Press Escape key
    await dimensionTestBase.closePopupViaEscape(page);

    // Wait for popup to close
    await dimensionTestBase.waitForPopupHidden(page);

    // Verify popup is no longer visible
    await expect(popup).not.toBeVisible();

    console.log("✅ Popup closes when pressing Escape");
  });

  test("should close popup when clicking away", async ({ page }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Verify popup is visible
    const popup = dimensionTestBase.getNewDimensionPopup(page);
    await expect(popup).toBeVisible();

    // Click away from the popup
    await dimensionTestBase.closePopupViaClickAway(page);

    // Wait for popup to close
    await dimensionTestBase.waitForPopupHidden(page);

    // Verify popup is no longer visible
    await expect(popup).not.toBeVisible();

    console.log("✅ Popup closes when clicking away");
  });

  test("should clear all fields when closing and reopening popup", async ({
    page,
  }) => {
    // Open the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Fill in some data
    await dimensionTestBase.fillNameField(page, "Test Property");
    await dimensionTestBase.selectType(page, DimensionEntryType.INT);

    // Verify fields have values
    const nameField = dimensionTestBase.getNameTextField(page);
    await expect(nameField).toHaveValue("Test Property");

    // Close the popup
    await dimensionTestBase.closePopupViaCloseButton(page);
    await dimensionTestBase.waitForPopupHidden(page);

    // Reopen the popup
    await dimensionTestBase.openNewDimensionPopup(page);
    await dimensionTestBase.waitForPopupVisible(page);

    // Verify fields are cleared
    const nameFieldAfterReopen = dimensionTestBase.getNameTextField(page);
    await expect(nameFieldAfterReopen).toHaveValue("");

    // Verify type select is cleared (should show placeholder)
    const typeSelectAfterReopen = dimensionTestBase.getTypeSelectDropdown(page);
    await expect(typeSelectAfterReopen).toHaveText("");

    console.log("✅ All fields are cleared when popup is reopened");
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
      "✅ Tags section appears/disappears correctly based on type selection"
    );
  });

  test("should handle different dimension types correctly", async ({
    page,
  }) => {
    const types = [
      { type: DimensionEntryType.STR, name: "Text Property" },
      { type: DimensionEntryType.INT, name: "Number Property" },
      { type: DimensionEntryType.BOOL, name: "Boolean Property" },
    ];

    for (const { type, name } of types) {
      // Open the popup
      await dimensionTestBase.openNewDimensionPopup(page);
      await dimensionTestBase.waitForPopupVisible(page);

      // Fill in the property data
      await dimensionTestBase.fillNameField(page, name);
      await dimensionTestBase.selectType(page, type);

      // Verify form accepts the type
      const typeSelect = dimensionTestBase.getTypeSelect(page);
      await expect(typeSelect).toBeVisible();

      // Close popup to test next type
      await dimensionTestBase.closePopupViaCloseButton(page);
      await dimensionTestBase.waitForPopupHidden(page);
    }

    console.log("✅ Form handles different dimension types correctly");
  });
});
