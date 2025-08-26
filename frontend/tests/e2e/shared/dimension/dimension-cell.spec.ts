import { test, expect } from "@playwright/test";
import { DimensionTestBase } from "../../../utils/dimension-test-base";
import {
  DimensionEntryType,
  DimensionType,
} from "../../../../src/types/dimension";

const dimensionTestBase = new DimensionTestBase();

test.describe("DimensionCell Component", () => {
  test.beforeAll(async () => {
    // Setup the common dimension test environment
    await dimensionTestBase.setupDimensionTests(test.info().workerIndex);
  });

  test.describe("Basic Popup Functionality", () => {
    let testDimension: { dimensionId: string; name: string; teamId: string };

    test.beforeEach(async ({ page }) => {
      // Create a test dimension before each test
      const dimensionName = `Test Dimension ${
        test.info().workerIndex
      }-${Date.now()}`;
      testDimension = await dimensionTestBase.createTestDimension({
        name: dimensionName,
        entryType: DimensionEntryType.STR,
        dimensionType: DimensionType.WORKER,
      });

      console.log(
        `Created test dimension: ${testDimension.name} (${testDimension.dimensionId})`
      );

      // Navigate to the workers page for the correct team
      await dimensionTestBase.navigateToWorkersPage(page);

      // Wait for the workers table to load and the dimension column to appear
      await dimensionTestBase.waitForNewColumn(page, testDimension.name);
    });

    test.afterEach(async () => {
      // Clean up: delete the dimension created for this test
      if (testDimension?.dimensionId) {
        try {
          await dimensionTestBase.deleteTestDimension(
            testDimension.dimensionId
          );
          console.log(`Deleted test dimension: ${testDimension.dimensionId}`);
        } catch (error) {
          console.warn(
            `Failed to delete test dimension ${testDimension.dimensionId}:`,
            error
          );
        }
      }
    });

    test("should open popup when clicking on the dimension cell", async ({
      page,
    }) => {
      // Click on the dimension cell
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );

      // Wait for popup to appear
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Verify popup is visible
      const popup = dimensionTestBase.getDimensionPopup(
        page,
        testDimension.dimensionId
      );
      await expect(popup).toBeVisible();

      // Verify the update form is visible
      const updateForm = dimensionTestBase.getDimensionUpdateForm(
        page,
        testDimension.dimensionId
      );
      await expect(updateForm).toBeVisible();

      console.log("✅ Popup opens when clicking on dimension cell");
    });

    test("should close popup when clicking away", async ({ page }) => {
      // Open the popup
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Verify popup is visible
      const popup = dimensionTestBase.getDimensionPopup(
        page,
        testDimension.dimensionId
      );
      await expect(popup).toBeVisible();

      // Click away from the popup
      await dimensionTestBase.closeDimensionPopupViaClickAway(page);

      // Wait for popup to close
      await dimensionTestBase.waitForDimensionPopupHidden(
        page,
        testDimension.dimensionId
      );

      // Verify popup is no longer visible
      await expect(popup).not.toBeVisible();

      console.log("✅ Popup closes when clicking away");
    });

    test("should close popup when pressing escape", async ({ page }) => {
      // Open the popup
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Verify popup is visible
      const popup = dimensionTestBase.getDimensionPopup(
        page,
        testDimension.dimensionId
      );
      await expect(popup).toBeVisible();

      // Press Escape key
      await dimensionTestBase.closeDimensionPopupViaEscape(page);

      // Wait for popup to close
      await dimensionTestBase.waitForDimensionPopupHidden(
        page,
        testDimension.dimensionId
      );

      // Verify popup is no longer visible
      await expect(popup).not.toBeVisible();

      console.log("✅ Popup closes when pressing Escape");
    });
  });

  test.describe("Text, Number, and Bool Dimension Types", () => {
    const dimensionTypes = [
      { type: DimensionEntryType.STR, name: "Text Dimension" },
      { type: DimensionEntryType.INT, name: "Number Dimension" },
      { type: DimensionEntryType.BOOL, name: "Bool Dimension" },
    ];

    for (const dimensionTypeConfig of dimensionTypes) {
      test.describe(`${dimensionTypeConfig.name}`, () => {
        let testDimension: {
          dimensionId: string;
          name: string;
          teamId: string;
        };

        test.beforeEach(async ({ page }) => {
          // Create a test dimension of the specific type
          const dimensionName = `${dimensionTypeConfig.name} ${
            test.info().workerIndex
          }-${Date.now()}`;
          testDimension = await dimensionTestBase.createTestDimension({
            name: dimensionName,
            entryType: dimensionTypeConfig.type,
            dimensionType: DimensionType.WORKER,
          });

          console.log(
            `Created test dimension: ${testDimension.name} (${testDimension.dimensionId})`
          );

          // Navigate to the workers page for the correct team
          await dimensionTestBase.navigateToWorkersPage(page);

          // Wait for the dimension column to appear
          await dimensionTestBase.waitForNewColumn(page, testDimension.name);
        });

        test.afterEach(async () => {
          // Clean up: delete the dimension created for this test
          if (testDimension?.dimensionId) {
            try {
              await dimensionTestBase.deleteTestDimension(
                testDimension.dimensionId
              );
              console.log(
                `Deleted test dimension: ${testDimension.dimensionId}`
              );
            } catch (error) {
              console.warn(
                `Failed to delete test dimension ${testDimension.dimensionId}:`,
                error
              );
            }
          }
        });

        test("should contain a name text field to rename the dimension", async ({
          page,
        }) => {
          // Open the popup
          await dimensionTestBase.clickDimensionCell(
            page,
            testDimension.dimensionId
          );
          await dimensionTestBase.waitForDimensionPopupVisible(
            page,
            testDimension.dimensionId
          );

          // Verify name text field exists and is visible
          const nameField = dimensionTestBase.getDimensionNameField(
            page,
            testDimension.dimensionId
          );
          await expect(nameField).toBeVisible();

          // Verify it contains the current dimension name
          const nameInput = nameField.locator("input");
          await expect(nameInput).toHaveValue(testDimension.name);

          console.log(
            `✅ Name text field is present for ${dimensionTypeConfig.name}`
          );
        });

        test("should update dimension name when changing name and clicking save", async ({
          page,
        }) => {
          const newName = `Updated ${dimensionTypeConfig.name} ${Date.now()}`;

          // Open the popup
          await dimensionTestBase.clickDimensionCell(
            page,
            testDimension.dimensionId
          );
          await dimensionTestBase.waitForDimensionPopupVisible(
            page,
            testDimension.dimensionId
          );

          // Fill the new name
          await dimensionTestBase.fillDimensionNameField(
            page,
            testDimension.dimensionId,
            newName
          );

          // Click save
          await dimensionTestBase.clickDimensionSaveButton(
            page,
            testDimension.dimensionId
          );

          // Wait for the update to complete - check if the name in the cell changes
          const nameElement = page.locator(
            `[data-testid="dimension-name-${testDimension.dimensionId}"]`
          );
          await expect(nameElement).toHaveText(newName, { timeout: 10000 });

          // The popup should close automatically after the update
          const popup = dimensionTestBase.getDimensionPopup(
            page,
            testDimension.dimensionId
          );
          await expect(popup).not.toBeVisible({ timeout: 10000 });

          console.log(
            `✅ Dimension name updated successfully for ${dimensionTypeConfig.name}`
          );
        });

        test("should show error when entering empty string and clicking save", async ({
          page,
        }) => {
          // Open the popup
          await dimensionTestBase.clickDimensionCell(
            page,
            testDimension.dimensionId
          );
          await dimensionTestBase.waitForDimensionPopupVisible(
            page,
            testDimension.dimensionId
          );

          // Clear the name field
          await dimensionTestBase.fillDimensionNameField(
            page,
            testDimension.dimensionId,
            ""
          );

          // Click save
          await dimensionTestBase.clickDimensionSaveButton(
            page,
            testDimension.dimensionId
          );

          // Verify error appears for name field
          const nameField = dimensionTestBase.getDimensionNameField(
            page,
            testDimension.dimensionId
          );
          const nameInput = nameField.locator("input");
          await expect(nameInput).toHaveAttribute("aria-invalid", "true");

          // Verify popup is still open (didn't close due to error)
          const popup = dimensionTestBase.getDimensionPopup(
            page,
            testDimension.dimensionId
          );
          await expect(popup).toBeVisible();

          console.log(
            `✅ Error message appears when name is empty for ${dimensionTypeConfig.name}`
          );
        });

        test("should not update dimension when clicking away without saving", async ({
          page,
        }) => {
          const originalName = testDimension.name;
          const newName = `Changed ${dimensionTypeConfig.name} ${Date.now()}`;

          // Open the popup
          await dimensionTestBase.clickDimensionCell(
            page,
            testDimension.dimensionId
          );
          await dimensionTestBase.waitForDimensionPopupVisible(
            page,
            testDimension.dimensionId
          );

          // Change the name but don't save
          await dimensionTestBase.fillDimensionNameField(
            page,
            testDimension.dimensionId,
            newName
          );

          // Click away to close popup without saving
          await dimensionTestBase.closeDimensionPopupViaClickAway(page);

          // Wait for popup to close
          await dimensionTestBase.waitForDimensionPopupHidden(
            page,
            testDimension.dimensionId
          );

          // Verify the dimension name remains unchanged in the table
          const displayedName = await dimensionTestBase.getDimensionNameInCell(
            page,
            testDimension.dimensionId
          );
          expect(displayedName).toBe(originalName);

          console.log(
            `✅ Dimension name unchanged when clicking away for ${dimensionTypeConfig.name}`
          );
        });

        test("should delete dimension when clicking delete button", async ({
          page,
        }) => {
          // Open the popup
          await dimensionTestBase.clickDimensionCell(
            page,
            testDimension.dimensionId
          );
          await dimensionTestBase.waitForDimensionPopupVisible(
            page,
            testDimension.dimensionId
          );

          // Click delete button
          await dimensionTestBase.clickDimensionDeleteButton(
            page,
            testDimension.dimensionId
          );

          // If it's a confirmation dialog, confirm the deletion
          try {
            const confirmButton = page.locator(
              `[data-testid="dimension-delete-confirm-${testDimension.dimensionId}"]`
            );
            await confirmButton.waitFor({ state: "visible", timeout: 2000 });
            await confirmButton.click();
          } catch {
            // No confirmation dialog, deletion was immediate
          }

          // Wait for popup to close
          await dimensionTestBase.waitForDimensionPopupHidden(
            page,
            testDimension.dimensionId
          );

          // Verify the dimension column is removed from the table
          const columnExists = await dimensionTestBase.columnExists(
            page,
            testDimension.name
          );
          expect(columnExists).toBe(false);

          // Mark dimension as deleted to avoid cleanup issues
          testDimension.dimensionId = "";

          console.log(
            `✅ Dimension deleted successfully for ${dimensionTypeConfig.name}`
          );
        });
      });
    }
  });

  test.describe("Dim Entries Type Dimensions", () => {
    let testDimension: { dimensionId: string; name: string; teamId: string };

    test.beforeEach(async ({ page }) => {
      // Create a test dimension of DIM_ENTRIES type with some entries
      const dimensionName = `Tags Dimension ${
        test.info().workerIndex
      }-${Date.now()}`;
      testDimension = await dimensionTestBase.createTestDimension({
        name: dimensionName,
        entryType: DimensionEntryType.DIM_ENTRIES,
        dimensionType: DimensionType.WORKER,
        dimEntries: [
          { id: "", name: "Entry 1", dimensionId: "", deleted: false },
          { id: "", name: "Entry 2", dimensionId: "", deleted: false },
          { id: "", name: "Entry 3", dimensionId: "", deleted: false },
        ],
      });

      console.log(
        `Created test dimension: ${testDimension.name} (${testDimension.dimensionId})`
      );

      // Navigate to the workers page for the correct team
      await dimensionTestBase.navigateToWorkersPage(page);

      // Wait for the dimension column to appear
      await dimensionTestBase.waitForNewColumn(page, testDimension.name);
    });

    test.afterEach(async () => {
      // Clean up: delete the dimension created for this test
      if (testDimension?.dimensionId) {
        try {
          await dimensionTestBase.deleteTestDimension(
            testDimension.dimensionId
          );
          console.log(`Deleted test dimension: ${testDimension.dimensionId}`);
        } catch (error) {
          console.warn(
            `Failed to delete test dimension ${testDimension.dimensionId}:`,
            error
          );
        }
      }
    });

    test("should contain name text field and list of dim entry options", async ({
      page,
    }) => {
      // Open the popup
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Verify name text field exists
      const nameField = dimensionTestBase.getDimensionNameField(
        page,
        testDimension.dimensionId
      );
      await expect(nameField).toBeVisible();

      // Verify dimension entries section exists
      const entriesSection = dimensionTestBase.getDimensionEntriesSection(
        page,
        testDimension.dimensionId
      );
      await expect(entriesSection).toBeVisible();

      // Verify dimension entry items are present
      const entryItems = dimensionTestBase.getDimensionEntryItems(
        page,
        testDimension.dimensionId
      );
      await expect(entryItems).toHaveCount(3); // We created 3 entries

      console.log(
        "✅ Name field and dim entries list are present for DIM_ENTRIES type"
      );
    });

    test("should allow editing dim entry when clicking edit button", async ({
      page,
    }) => {
      // Open the popup
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Get the first entry item
      const entryItems = dimensionTestBase.getDimensionEntryItems(
        page,
        testDimension.dimensionId
      );
      const firstItem = entryItems.first();

      // Get the entry ID from the test data attribute
      const entryId = await firstItem.getAttribute("data-testid");
      const extractedId = entryId?.replace("dim-entry-item-", "") || "";

      // Click the edit button for the first entry
      const editButton = dimensionTestBase.getDimensionEntryEditButton(
        page,
        extractedId
      );
      await editButton.click();

      // Verify edit field appears
      const editField = dimensionTestBase.getDimensionEntryEditField(
        page,
        extractedId
      );
      await expect(editField).toBeVisible();

      // Verify confirm and cancel buttons appear
      const confirmButton =
        dimensionTestBase.getDimensionEntryConfirmEditButton(page, extractedId);
      const cancelButton = dimensionTestBase.getDimensionEntryCancelEditButton(
        page,
        extractedId
      );
      await expect(confirmButton).toBeVisible();
      await expect(cancelButton).toBeVisible();

      console.log("✅ Edit mode activated for dim entry");
    });

    test("should update dim entry when editing and clicking confirm", async ({
      page,
    }) => {
      // Open the popup
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Get the first entry item
      const entryItems = dimensionTestBase.getDimensionEntryItems(
        page,
        testDimension.dimensionId
      );
      const firstItem = entryItems.first();

      // Get the entry ID from the test data attribute
      const entryId = await firstItem.getAttribute("data-testid");
      const extractedId = entryId?.replace("dim-entry-item-", "") || "";

      const newEntryName = `Updated Entry ${Date.now()}`;

      // Click edit button
      const editButton = dimensionTestBase.getDimensionEntryEditButton(
        page,
        extractedId
      );
      await editButton.click();

      // Change the entry name
      const editField = dimensionTestBase.getDimensionEntryEditField(
        page,
        extractedId
      );
      const input = editField.locator("input");
      await input.fill(newEntryName);

      // Click confirm
      const confirmButton =
        dimensionTestBase.getDimensionEntryConfirmEditButton(page, extractedId);
      await confirmButton.click();

      // Verify the entry name is updated
      const entryNameElement = page.locator(
        `[data-testid="dim-entry-name-${extractedId}"]`
      );
      await expect(entryNameElement).toHaveText(newEntryName);

      console.log("✅ Dim entry name updated successfully");
    });

    test("should cancel edit when clicking cancel button", async ({ page }) => {
      // Open the popup
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Get the first entry item and its original name
      const entryItems = dimensionTestBase.getDimensionEntryItems(
        page,
        testDimension.dimensionId
      );
      const firstItem = entryItems.first();

      // Get the entry ID from the test data attribute
      const entryId = await firstItem.getAttribute("data-testid");
      const extractedId = entryId?.replace("dim-entry-item-", "") || "";

      // Get original name
      const originalNameElement = page.locator(
        `[data-testid="dim-entry-name-${extractedId}"]`
      );
      const originalName = (await originalNameElement.textContent()) || "";

      // Click edit button
      const editButton = dimensionTestBase.getDimensionEntryEditButton(
        page,
        extractedId
      );
      await editButton.click();

      // Change the entry name
      const editField = dimensionTestBase.getDimensionEntryEditField(
        page,
        extractedId
      );
      const input = editField.locator("input");
      await input.fill("Changed Name");

      // Click cancel
      const cancelButton = dimensionTestBase.getDimensionEntryCancelEditButton(
        page,
        extractedId
      );
      await cancelButton.click();

      // Verify the entry name remains unchanged
      const entryNameElement = page.locator(
        `[data-testid="dim-entry-name-${extractedId}"]`
      );
      await expect(entryNameElement).toHaveText(originalName);

      console.log("✅ Edit cancelled successfully, name unchanged");
    });

    test("should delete dim entry when clicking delete button", async ({
      page,
    }) => {
      // Open the popup
      await dimensionTestBase.clickDimensionCell(
        page,
        testDimension.dimensionId
      );
      await dimensionTestBase.waitForDimensionPopupVisible(
        page,
        testDimension.dimensionId
      );

      // Get initial count of entries
      const entryItems = dimensionTestBase.getDimensionEntryItems(
        page,
        testDimension.dimensionId
      );
      const initialCount = await entryItems.count();

      // Get the first entry item
      const firstItem = entryItems.first();

      // Get the entry ID from the test data attribute
      const entryId = await firstItem.getAttribute("data-testid");
      const extractedId = entryId?.replace("dim-entry-item-", "") || "";

      // Click delete button
      const deleteButton = dimensionTestBase.getDimensionEntryDeleteButton(
        page,
        extractedId
      );
      await deleteButton.click();

      // Verify the entry is removed from the list
      const updatedEntryItems = dimensionTestBase.getDimensionEntryItems(
        page,
        testDimension.dimensionId
      );
      await expect(updatedEntryItems).toHaveCount(initialCount - 1);

      // Verify the specific entry is no longer present
      const deletedEntry = dimensionTestBase.getDimensionEntryItem(
        page,
        extractedId
      );
      await expect(deletedEntry).not.toBeVisible();

      console.log("✅ Dim entry deleted successfully");
    });
  });
});
