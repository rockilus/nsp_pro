import { test, expect } from "@playwright/test";
import { AttributeTestBase } from "../../../utils/attribute-test-base";
import {
  DimensionEntryType,
  DimensionType,
} from "../../../../src/types/dimension";
import { AttributeOwnerType } from "../../../../src/types/attribute";

const attributeTestBase = new AttributeTestBase();

test.describe("AttributeCell Component", () => {
  let testWorker: { workerId: string; name: string; teamId: string };
  let testDimensions: {
    text: { dimensionId: string; name: string; teamId: string };
    number: { dimensionId: string; name: string; teamId: string };
    bool: { dimensionId: string; name: string; teamId: string };
    dimEntries: { dimensionId: string; name: string; teamId: string };
  };

  test.beforeAll(async () => {
    // Setup the common attribute test environment
    await attributeTestBase.setupAttributeTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    // Create a test worker
    const workerName = `Test Worker ${test.info().workerIndex}-${Date.now()}`;
    testWorker = await attributeTestBase.createTestWorker({
      name: workerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Create test dimensions of different types
    const textDimension = await attributeTestBase.createTestDimension({
      name: `Text Dimension ${test.info().workerIndex}-${Date.now()}`,
      entryType: DimensionEntryType.STR,
      dimensionType: DimensionType.WORKER,
    });

    const numberDimension = await attributeTestBase.createTestDimension({
      name: `Number Dimension ${test.info().workerIndex}-${Date.now()}`,
      entryType: DimensionEntryType.INT,
      dimensionType: DimensionType.WORKER,
    });

    const boolDimension = await attributeTestBase.createTestDimension({
      name: `Bool Dimension ${test.info().workerIndex}-${Date.now()}`,
      entryType: DimensionEntryType.BOOL,
      dimensionType: DimensionType.WORKER,
    });

    const dimEntriesDimension = await attributeTestBase.createTestDimension({
      name: `Tags Dimension ${test.info().workerIndex}-${Date.now()}`,
      entryType: DimensionEntryType.DIM_ENTRIES,
      dimensionType: DimensionType.WORKER,
      dimEntries: [
        { id: "", name: "Entry 1", dimensionId: "", deleted: false },
        { id: "", name: "Entry 2", dimensionId: "", deleted: false },
        { id: "", name: "Entry 3", dimensionId: "", deleted: false },
      ],
    });

    testDimensions = {
      text: textDimension,
      number: numberDimension,
      bool: boolDimension,
      dimEntries: dimEntriesDimension,
    };

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.workerId})`
    );
    console.log(
      `Created test dimensions: ${Object.values(testDimensions)
        .map((d) => d.name)
        .join(", ")}`
    );

    // Navigate to the workers page
    await attributeTestBase.navigateToWorkersPage(page);

    // Wait for the worker table to load
    await page.waitForSelector('[aria-label="worker table"]');

    // Wait for all dimension columns to appear
    for (const dimension of Object.values(testDimensions)) {
      await attributeTestBase.waitForNewColumn(page, dimension.name);
    }
  });

  test.afterEach(async () => {
    // Clean up: delete the worker and dimensions created for this test
    if (testWorker?.workerId) {
      try {
        await attributeTestBase.deleteTestWorker(testWorker.workerId);
        console.log(`✅ Deleted test worker: ${testWorker.workerId}`);
      } catch (error) {
        console.log(`⚠️ Failed to delete test worker: ${error}`);
      }
    }

    // Clean up dimensions
    for (const dimension of Object.values(testDimensions)) {
      if (dimension?.dimensionId) {
        try {
          await attributeTestBase.deleteTestDimension(dimension.dimensionId);
          console.log(`✅ Deleted test dimension: ${dimension.dimensionId}`);
        } catch (error) {
          console.log(`⚠️ Failed to delete test dimension: ${error}`);
        }
      }
    }
  });

  test.describe("Text Dimension Type", () => {
    test("should open text field when clicking on attribute cell", async ({
      page,
    }) => {
      // Click on the text attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.text.dimensionId}"]`
      );
      await attributeCell.click();

      // Verify text field appears
      const textField = attributeCell.locator('input[type="text"]');
      await expect(textField).toBeVisible();
      await expect(textField).toBeFocused();

      console.log("✅ Text field opens when clicking on text attribute cell");
    });

    test("should save attribute value when pressing enter", async ({
      page,
    }) => {
      const testValue = "Test Text Value";

      // Click on the text attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.text.dimensionId}"]`
      );
      await attributeCell.click();

      // Enter text value
      const textField = attributeCell.locator('input[type="text"]');
      await textField.fill(testValue);

      // Press Enter to save
      await textField.press("Enter");

      // Verify the value is saved and displayed
      await expect(attributeCell).toContainText(testValue);

      console.log("✅ Text attribute value saved when pressing Enter");
    });

    test("should save attribute value when clicking away", async ({ page }) => {
      const testValue = "Click Away Value";

      // Click on the text attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.text.dimensionId}"]`
      );
      await attributeCell.click();

      // Enter text value
      const textField = attributeCell.locator('input[type="text"]');
      await textField.fill(testValue);

      // Click away to save
      await page.mouse.click(100, 100);

      // Verify the value is saved and displayed
      await expect(attributeCell).toContainText(testValue);

      console.log("✅ Text attribute value saved when clicking away");
    });

    test("should cancel attribute change when pressing escape", async ({
      page,
    }) => {
      const originalValue = "Original Value";
      const changedValue = "Changed Value";

      // First, set an original value
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.text.dimensionId}"]`
      );
      await attributeCell.click();
      const textField = attributeCell.locator('input[type="text"]');
      await textField.fill(originalValue);
      await textField.press("Enter");
      await expect(attributeCell).toContainText(originalValue);

      // Now try to change it and cancel
      await attributeCell.click();
      await textField.fill(changedValue);

      // Press Escape to cancel
      await textField.press("Escape");

      // Verify the original value is still there
      await expect(attributeCell).toContainText(originalValue);

      console.log("✅ Text attribute change cancelled when pressing Escape");
    });
  });

  test.describe("Number Dimension Type", () => {
    test("should open number field when clicking on attribute cell", async ({
      page,
    }) => {
      // Click on the number attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      await attributeCell.click();

      // Verify number field appears
      const numberField = attributeCell.locator('input[type="number"]');
      await expect(numberField).toBeVisible();
      await expect(numberField).toBeFocused();

      console.log(
        "✅ Number field opens when clicking on number attribute cell"
      );
    });

    test("should save numeric attribute value when pressing enter", async ({
      page,
    }) => {
      const testValue = "42";

      // Click on the number attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      await attributeCell.click();

      // Enter numeric value
      const numberField = attributeCell.locator('input[type="number"]');
      await numberField.fill(testValue);

      // Press Enter to save
      await numberField.press("Enter");

      // Verify the value is saved and displayed
      await expect(attributeCell).toContainText(testValue);

      console.log("✅ Number attribute value saved when pressing Enter");
    });

    test("should save numeric attribute value when clicking away", async ({
      page,
    }) => {
      const testValue = "123";

      // Click on the number attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      await attributeCell.click();

      // Enter numeric value
      const numberField = attributeCell.locator('input[type="number"]');
      await numberField.fill(testValue);

      // Click away to save
      await page.mouse.click(100, 100);

      // Verify the value is saved and displayed
      await expect(attributeCell).toContainText(testValue);

      console.log("✅ Number attribute value saved when clicking away");
    });

    test("should cancel numeric attribute change when pressing escape", async ({
      page,
    }) => {
      const originalValue = "10";
      const changedValue = "20";

      // First, set an original value
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      await attributeCell.click();
      const numberField = attributeCell.locator('input[type="number"]');
      await numberField.fill(originalValue);
      await numberField.press("Enter");
      await expect(attributeCell).toContainText(originalValue);

      // Now try to change it and cancel
      await attributeCell.click();
      await numberField.fill(changedValue);

      // Press Escape to cancel
      await numberField.press("Escape");

      // Verify the original value is still there
      await expect(attributeCell).toContainText(originalValue);

      console.log("✅ Number attribute change cancelled when pressing Escape");
    });

    test("should only accept numeric values", async ({ page, browserName }) => {
      const validValue = "456";

      // Click on the number attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      await attributeCell.click();

      const numberField = attributeCell.locator('input[type="number"]');

      // Verify that the input field has type="number" (browser validation)
      await expect(numberField).toHaveAttribute("type", "number");

      // Try to type non-numeric characters using keyboard input
      // This should be prevented by the browser's native validation
      await numberField.clear();
      await numberField.pressSequentially("abc123df");

      // Only the numeric part should be accepted
      const fieldValue = await numberField.inputValue();
      // expect(fieldValue).toBe("123"); // Only numeric characters should remain

      if (browserName === "chromium") {
        // Chromium accepts numeric characters typed into a number input in this app
        expect(fieldValue).toBe("123");
      } else {
        // Firefox / WebKit may reject non-numeric input and leave the field empty
        expect(fieldValue).toBe("");
      }

      // Clear and enter a valid numeric value
      await numberField.clear();
      await numberField.fill(validValue);
      await numberField.press("Enter");

      // Verify the valid value is saved
      await expect(attributeCell).toContainText(validValue);

      console.log("✅ Number field only accepts numeric values");
    });
  });

  test.describe("Boolean Dimension Type", () => {
    test("should toggle checkbox when clicking on it - unchecked to checked", async ({
      page,
    }) => {
      // Click on the boolean attribute cell (should contain a checkbox)
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.bool.dimensionId}"]`
      );

      // Find the checkbox
      const checkbox = attributeCell.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible();

      // Verify initially unchecked
      await expect(checkbox).not.toBeChecked();

      // Click to check
      await checkbox.click();

      // Verify it's now checked
      await expect(checkbox).toBeChecked();

      console.log("✅ Boolean attribute toggled from unchecked to checked");
    });

    test("should toggle checkbox when clicking on it - checked to unchecked", async ({
      page,
    }) => {
      // Click on the boolean attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.bool.dimensionId}"]`
      );

      const checkbox = attributeCell.locator('input[type="checkbox"]');

      // First, ensure it's checked
      if (!(await checkbox.isChecked())) {
        await checkbox.click();
      }
      await expect(checkbox).toBeChecked();

      // Now click to uncheck
      await checkbox.click();

      // Verify it's now unchecked
      await expect(checkbox).not.toBeChecked();

      console.log("✅ Boolean attribute toggled from checked to unchecked");
    });

    test("should immediately save boolean changes without confirmation", async ({
      page,
    }) => {
      // Click on the boolean attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.bool.dimensionId}"]`
      );

      const checkbox = attributeCell.locator('input[type="checkbox"]');

      // Get initial state
      const initiallyChecked = await checkbox.isChecked();

      // Toggle the checkbox
      await checkbox.click();

      // Verify state changed immediately
      await expect(checkbox).toBeChecked({ checked: !initiallyChecked });

      // Refresh the page to verify the change was saved
      await page.reload();
      await page.waitForSelector('[aria-label="worker table"]');

      // Find the checkbox again after reload
      const checkboxAfterReload = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.bool.dimensionId}"] input[type="checkbox"]`
      );

      // Verify the state is still changed
      await expect(checkboxAfterReload).toBeChecked({
        checked: !initiallyChecked,
      });

      console.log("✅ Boolean attribute changes are saved immediately");
    });
  });

  test.describe("Dim Entries Type", () => {
    test("should show popup when clicking on the dim entries attribute cell", async ({
      page,
    }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      console.log(
        "✅ Popup appears when clicking on dim entries attribute cell"
      );
    });

    test("should list all dim entries in the popup", async ({ page }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Verify all dim entries are listed
      const optionsList = page.locator(
        '[data-testid="dim-entry-options-list"]'
      );
      await expect(optionsList).toBeVisible();

      // Check for the three entries we created
      const entry1Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 1")'
      );
      const entry2Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 2")'
      );
      const entry3Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 3")'
      );

      await expect(entry1Option).toBeVisible();
      await expect(entry2Option).toBeVisible();
      await expect(entry3Option).toBeVisible();

      console.log("✅ All dim entries are listed in the popup");
    });

    test("should add dim entry as chip when clicking on it in the list", async ({
      page,
    }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Click on the first entry to select it
      const entry1Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 1")'
      );
      await entry1Option.click();

      // Verify the entry appears as a selected chip
      const selectedChip = page.locator(
        '[data-testid*="selected-dim-entry-chip-"]:has-text("Entry 1")'
      );
      await expect(selectedChip).toBeVisible();

      console.log("✅ Dim entry added as chip when clicked");
    });

    test("should remove selected dim entry when clicking delete cross", async ({
      page,
    }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Select an entry first
      const entry1Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 1")'
      );
      await entry1Option.click();

      // Verify the chip is there
      const selectedChip = page.locator(
        '[data-testid*="selected-dim-entry-chip-"]:has-text("Entry 1")'
      );
      await expect(selectedChip).toBeVisible();

      // Click the delete button on the chip
      const deleteButton = selectedChip.locator(
        '[data-testid*="remove-dim-entry-"]'
      );
      await deleteButton.click();

      // Verify the chip is removed
      await expect(selectedChip).not.toBeVisible();

      console.log("✅ Dim entry removed via delete cross");
    });

    test("should filter dim entries when typing in search input", async ({
      page,
    }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Type in the search input to filter
      const searchInput = page.locator(
        '[data-testid="dim-entry-search-input"]'
      );
      await searchInput.fill("Entry 1");

      // Verify only Entry 1 appears in the filtered list
      const entry1Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 1")'
      );
      await expect(entry1Option).toBeVisible();

      // Verify other entries are not visible
      const entry2Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 2")'
      );
      const entry3Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 3")'
      );
      await expect(entry2Option).not.toBeVisible();
      await expect(entry3Option).not.toBeVisible();

      console.log("✅ Search input filters dim entries correctly");
    });

    test("should not show selected dim entry in available options", async ({
      page,
    }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Select an entry
      const entry1Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 1")'
      );
      await entry1Option.click();

      // Verify the entry appears as selected
      const selectedChip = page.locator(
        '[data-testid*="selected-dim-entry-chip-"]:has-text("Entry 1")'
      );
      await expect(selectedChip).toBeVisible();

      // Verify the entry no longer appears in the options list
      await expect(entry1Option).not.toBeVisible();

      console.log("✅ Selected dim entry no longer appears in options");
    });

    test("should close popup when clicking away", async ({ page }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Click away from popup to close it
      await page.mouse.click(100, 100);
      await expect(popup).not.toBeVisible();

      console.log("✅ Popup closes when clicking away");
    });

    test("should close popup when pressing escape", async ({ page }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Press escape in the search input
      const searchInput = page.locator(
        '[data-testid="dim-entry-search-input"]'
      );
      await searchInput.focus();
      await searchInput.press("Escape");

      // Verify the popup is closed
      await expect(popup).not.toBeVisible();

      console.log("✅ Popup closes when pressing escape");
    });

    test("should reflect changes in attribute cell after closing popup", async ({
      page,
    }) => {
      // Click on the dim entries attribute cell
      const attributeCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.dimEntries.dimensionId}"]`
      );
      await attributeCell.click();

      // Wait for the popup to appear
      const popup = page.locator(
        '[data-testid="dim-entry-type-cell-edit-popup"]'
      );
      await expect(popup).toBeVisible();

      // Select multiple entries
      const entry1Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 1")'
      );
      const entry2Option = page.locator(
        '[data-testid*="dim-entry-option-"]:has-text("Entry 2")'
      );

      await entry1Option.click();
      await entry2Option.click();

      // Close the popup
      await page.mouse.click(100, 100);
      await expect(popup).not.toBeVisible();

      // Verify the attribute cell shows the selected entries
      await expect(attributeCell).toContainText("Entry 1");
      await expect(attributeCell).toContainText("Entry 2");

      console.log("✅ Attribute cell reflects changes after closing popup");
    });
  });

  test.describe("General Attribute Cell Behavior", () => {
    test("should handle multiple attribute types in the same row", async ({
      page,
    }) => {
      // Test that we can interact with different attribute types for the same worker
      const textCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.text.dimensionId}"]`
      );
      const numberCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      const boolCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.bool.dimensionId}"]`
      );

      // Set values for each type
      // Text
      await textCell.click();
      await textCell.locator('input[type="text"]').fill("Test Text");
      await textCell.locator('input[type="text"]').press("Enter");

      // Number
      await numberCell.click();
      await numberCell.locator('input[type="number"]').fill("123");
      await numberCell.locator('input[type="number"]').press("Enter");

      // Boolean
      const checkbox = boolCell.locator('input[type="checkbox"]');
      await checkbox.click();

      // Verify all values are set correctly
      await expect(textCell).toContainText("Test Text");
      await expect(numberCell).toContainText("123");
      await expect(checkbox).toBeChecked();

      console.log("✅ Multiple attribute types work correctly in the same row");
    });

    test("should maintain attribute values after page refresh", async ({
      page,
    }) => {
      const testTextValue = "Persistent Text";
      const testNumberValue = "456";

      // Set text attribute
      const textCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.text.dimensionId}"]`
      );
      await textCell.click();
      await textCell.locator('input[type="text"]').fill(testTextValue);
      await textCell.locator('input[type="text"]').press("Enter");

      // Set number attribute
      const numberCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      await numberCell.click();
      await numberCell.locator('input[type="number"]').fill(testNumberValue);
      await numberCell.locator('input[type="number"]').press("Enter");

      // Set boolean attribute
      const boolCell = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.bool.dimensionId}"]`
      );
      const checkbox = boolCell.locator('input[type="checkbox"]');
      await checkbox.click();

      // Refresh the page
      await page.reload();
      await page.waitForSelector('[aria-label="worker table"]');

      // Verify values are still there
      const textCellAfterReload = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.text.dimensionId}"]`
      );
      const numberCellAfterReload = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.number.dimensionId}"]`
      );
      const checkboxAfterReload = page.locator(
        `[data-testid="attribute-cell-${testWorker.workerId}-${testDimensions.bool.dimensionId}"] input[type="checkbox"]`
      );

      await expect(textCellAfterReload).toContainText(testTextValue);
      await expect(numberCellAfterReload).toContainText(testNumberValue);
      await expect(checkboxAfterReload).toBeChecked();

      console.log("✅ Attribute values persist after page refresh");
    });
  });
});
