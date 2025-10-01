/**
 * E2E tests for the ConstraintTab component - Constraint List functionality
 *
 * This test suite focuses on testing the constraint list display and interactions:
 * - Displaying existing constraints
 * - Toggling hard/soft constraint status
 * - Opening edit constraint popup
 * - Deleting constraints
 */

import { test, expect } from "@playwright/test";
import { ConstraintTestBase } from "../../utils/constraint-test-base";

const constraintTestBase = new ConstraintTestBase();

test.describe("Constraint List", () => {
  let testConstraints: { constraintId: string; teamId: string }[] = [];

  test.beforeEach(async ({ page }) => {
    // Setup the common constraint test environment
    await constraintTestBase.setupConstraintTests(test.info().workerIndex);

    // Get available constraint templates
    const templates = await constraintTestBase.getTestConstraintTemplates();
    console.log(`Available templates: ${templates.length}`);

    if (templates.length === 0) {
      console.warn("No constraint templates available - some tests may fail");
    }

    // Create test constraints for the list tests
    // Use the first available template if any exist
    if (templates.length > 0) {
      const template = templates[0];

      // Constraint Template example:
      // {
      //     "id": "0",
      //     "constraintType": 1,
      //     "text": "Jean doit faire au plus 2 consultations consécutives",
      //     "language": "fr",
      //     "blocks": [
      //         {
      //             "name": 4,
      //             "type": 3,
      //             "options": [
      //                 {
      //                     "name": "all workers",
      //                     "id": "",
      //                     "idType": 0,
      //                     "isBoolDim": false,
      //                     "categoryName": "All"
      //                 },
      //                 {
      //                     "name": "Test Worker 1 0-1759274296632",
      //                     "id": "68dc654024a1121753d06372",
      //                     "idType": 1,
      //                     "isBoolDim": false,
      //                     "categoryName": "Workers"
      //                 },
      //                 {
      //                     "name": "Test Worker 2 0-1759274304276",
      //                     "id": "68dc654024a1121753d06376",
      //                     "idType": 1,
      //                     "isBoolDim": false,
      //                     "categoryName": "Workers"
      //                 }
      //             ],
      //             "placeholder": "Jean"
      //         },
      //         {
      //             "name": 5,
      //             "type": 0,
      //             "options": [],
      //             "placeholder": "doit faire"
      //         },
      //         {
      //             "name": 0,
      //             "type": 0,
      //             "options": [
      //                 "at most",
      //                 "at least",
      //                 "exactly"
      //             ],
      //             "placeholder": "au plus"
      //         },
      //         {
      //             "name": 1,
      //             "type": 1,
      //             "options": [],
      //             "placeholder": 2
      //         },
      //         {
      //             "name": 3,
      //             "type": 3,
      //             "options": [
      //                 {
      //                     "name": "all shifts",
      //                     "id": "",
      //                     "idType": 0,
      //                     "isBoolDim": false,
      //                     "categoryName": "All"
      //                 },
      //                 {
      //                     "name": "",
      //                     "id": "68dcf47d65ffcac9f8fef46e",
      //                     "idType": 2,
      //                     "isBoolDim": false,
      //                     "categoryName": "Shifts"
      //                 },
      //                 {
      //                     "name": "",
      //                     "id": "",
      //                     "idType": 5,
      //                     "isBoolDim": true,
      //                     "categoryName": "Duties"
      //                 }
      //             ],
      //             "placeholder": "consultations"
      //         },
      //         {
      //             "name": 2,
      //             "type": 0,
      //             "options": [
      //                 "consecutive"
      //             ],
      //             "placeholder": "consecutives"
      //         }
      //     ]
      // }

      // Constraint example:
      // {
      //     "id": "",
      //     "teamId": "68dc653724a1121753d0631c",
      //     "constraintType": 1,
      //     "templateId": "0",
      //     "language": "fr",
      //     "blocks": [
      //         {
      //             "name": 4,
      //             "type": 3,
      //             "value": [
      //                 {
      //                     "name": "Test Worker 1 0-1759274296632",
      //                     "id": "68dc654024a1121753d06372",
      //                     "idType": 1,
      //                     "isBoolDim": false,
      //                     "categoryName": "Workers"
      //                 }
      //             ]
      //         },
      //         {
      //             "name": 5,
      //             "type": 0,
      //             "value": "doit faire"
      //         },
      //         {
      //             "name": 0,
      //             "type": 0,
      //             "value": "at most"
      //         },
      //         {
      //             "name": 1,
      //             "type": 1,
      //             "value": 3
      //         },
      //         {
      //             "name": 3,
      //             "type": 3,
      //             "value": [
      //                 {
      //                     "name": "",
      //                     "id": "68dcf47d65ffcac9f8fef46e",
      //                     "idType": 2,
      //                     "isBoolDim": false,
      //                     "categoryName": "Shifts"
      //                 }
      //             ]
      //         },
      //         {
      //             "name": 2,
      //             "type": 0,
      //             "value": "consecutive"
      //         }
      //     ],
      //     "text": "",
      //     "hard": true,
      //     "priority": "medium",
      //     "active": true,
      //     "missingAttributes": []
      // }

      // Create a hard constraint using template-based block generation
      const hardConstraint =
        await constraintTestBase.createTestConstraintFromTemplate(template, {
          workerIndex: 0,
          shiftIndex: 0,
          numberValue: 2,
          stringOverrides: {
            5: "must work", // TEXT block
            0: "at least", // OPERATOR block
            2: "per week", // TIMING block
          },
          hard: true,
          priority: "high",
        });
      testConstraints.push(hardConstraint);

      // Create a soft constraint using template-based block generation
      const softConstraint =
        await constraintTestBase.createTestConstraintFromTemplate(template, {
          workerIndex: 1, // Use second worker
          shiftIndex: 0,
          numberValue: 3,
          stringOverrides: {
            5: "prefers", // TEXT block
            0: "at most", // OPERATOR block
            2: "consecutive", // TIMING block
          },
          hard: false,
          priority: "medium",
        });
      testConstraints.push(softConstraint);
      console.log(`Created ${testConstraints.length} test constraints`);
    }

    // Navigate to the constraints page
    await constraintTestBase.navigateToConstraintsPage(page);

    // Wait for the constraint list to load
    await constraintTestBase.waitForConstraintListLoad(page);
  });

  test.afterEach(async () => {
    // Clean up: delete the constraints created for this test
    for (const constraint of testConstraints) {
      try {
        await constraintTestBase.deleteTestConstraint(constraint.constraintId);
      } catch (error) {
        console.warn(
          `Failed to delete constraint ${constraint.constraintId}:`,
          error
        );
      }
    }
    testConstraints = [];
  });

  test("should display existing constraints in the constraint list", async ({
    page,
  }) => {
    // Check if constraints are displayed when we have test constraints
    const constraintList = constraintTestBase.getConstraintList(page);
    await expect(constraintList).toBeVisible();

    if (testConstraints.length > 0) {
      // Verify constraints are displayed
      // Since the text is generated by the backend based on the blocks,
      // we check for the presence of constraint items with the expected IDs
      const constraintItems = page.locator('[data-testid^="constraint-item-"]');
      const itemCount = await constraintItems.count();

      // We should have at least our test constraints
      expect(itemCount).toBeGreaterThanOrEqual(testConstraints.length);

      // Check that constraints contain worker and shift names from our test data
      const constraintList = constraintTestBase.getConstraintList(page);
      const testWorkers = constraintTestBase.getTestWorkers();
      const testShifts = constraintTestBase.getTestShifts();

      // The generated text should contain our test worker and shift names
      await expect(constraintList).toContainText(testWorkers[0].name);
      await expect(constraintList).toContainText(testShifts[0].name);

      console.log("✅ Both test constraints are visible in the list");
    } else {
      // If no test constraints were created due to missing templates,
      // verify the "no constraints" message
      await expect(constraintList).toContainText("no_constraints");
      console.log("✅ No constraints message displayed when list is empty");
    }
  });

  test("should toggle constraint from hard to soft when clicking hard/soft button", async ({
    page,
  }) => {
    // Skip this test if no constraints were created
    if (testConstraints.length === 0) {
      test.skip(
        true,
        "No test constraints available - skipping hard/soft toggle test"
      );
      return;
    }

    const hardConstraint = testConstraints[0]; // First constraint should be hard

    // Find the hard/soft button for the hard constraint
    const hardSoftButton = constraintTestBase.getConstraintHardSoftButton(
      page,
      hardConstraint.constraintId
    );

    // Initially should show "Hard" (or localized equivalent)
    await expect(hardSoftButton).toBeVisible();
    const initialText = await hardSoftButton.textContent();
    console.log(`Initial button text: ${initialText}`);

    // Click the button to toggle to soft
    await hardSoftButton.click();

    // Wait a moment for the update to process
    await page.waitForTimeout(1000);

    // Button should now show "Soft" (or localized equivalent)
    const updatedText = await hardSoftButton.textContent();
    console.log(`Updated button text: ${updatedText}`);

    // Verify the text changed (exact text depends on localization)
    expect(updatedText).not.toBe(initialText);

    console.log("✅ Hard/soft constraint toggle works correctly");
  });

  test("should toggle constraint from soft to hard when clicking hard/soft button", async ({
    page,
  }) => {
    // Skip this test if we don't have enough constraints
    if (testConstraints.length < 2) {
      test.skip(
        true,
        "Not enough test constraints available - skipping soft to hard toggle test"
      );
      return;
    }

    const softConstraint = testConstraints[1]; // Second constraint should be soft

    // Find the hard/soft button for the soft constraint
    const hardSoftButton = constraintTestBase.getConstraintHardSoftButton(
      page,
      softConstraint.constraintId
    );

    // Initially should show "Soft" (or localized equivalent)
    await expect(hardSoftButton).toBeVisible();
    const initialText = await hardSoftButton.textContent();
    console.log(`Initial button text: ${initialText}`);

    // Click the button to toggle to hard
    await hardSoftButton.click();

    // Wait a moment for the update to process
    await page.waitForTimeout(1000);

    // Button should now show "Hard" (or localized equivalent)
    const updatedText = await hardSoftButton.textContent();
    console.log(`Updated button text: ${updatedText}`);

    // Verify the text changed
    expect(updatedText).not.toBe(initialText);

    console.log("✅ Soft to hard constraint toggle works correctly");
  });

  test("should open edit constraint popup when clicking edit button", async ({
    page,
  }) => {
    // Skip this test if no constraints were created
    if (testConstraints.length === 0) {
      test.skip(
        true,
        "No test constraints available - skipping edit popup test"
      );
      return;
    }

    const testConstraint = testConstraints[0];

    // Find and click the edit button for the constraint
    const editButton = constraintTestBase.getConstraintEditButton(
      page,
      testConstraint.constraintId
    );

    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for the edit popup to appear
    const editPopup = constraintTestBase.getConstraintEditPopup(page);
    await expect(editPopup).toBeVisible();

    // Verify the edit form is present within the popup
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Verify the save button is present
    const saveButton = constraintTestBase.getConstraintSaveButton(page);
    await expect(saveButton).toBeVisible();

    console.log("✅ Edit constraint popup opens correctly with edit form");
  });

  test("should show same template content in edit popup as used for constraint creation", async ({
    page,
  }) => {
    // Skip this test if no constraints were created
    if (testConstraints.length === 0) {
      test.skip(
        true,
        "No test constraints available - skipping template content test"
      );
      return;
    }

    const testConstraint = testConstraints[0];

    // Click the edit button to open the popup
    const editButton = constraintTestBase.getConstraintEditButton(
      page,
      testConstraint.constraintId
    );
    await editButton.click();

    // Wait for the edit popup and form to appear
    const editPopup = constraintTestBase.getConstraintEditPopup(page);
    await expect(editPopup).toBeVisible();

    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Verify that constraint blocks are present (this indicates the template is loaded)
    const constraintBlocks = page.locator('[data-testid^="constraint-block-"]');
    const blockCount = await constraintBlocks.count();

    // There should be at least one block (the template content)
    expect(blockCount).toBeGreaterThan(0);

    // Verify the save button shows "Save" (for editing) not "Add" (for creation)
    const saveButton = constraintTestBase.getConstraintSaveButton(page);
    const buttonText = await saveButton.textContent();

    // Button should contain save-related text (depends on localization)
    expect(buttonText?.toLowerCase()).toMatch(/(save|update)/);

    console.log(
      `✅ Edit form contains ${blockCount} constraint blocks and shows save button`
    );
  });

  test("should delete constraint when clicking delete button", async ({
    page,
  }) => {
    // Skip this test if no constraints were created
    if (testConstraints.length === 0) {
      test.skip(true, "No test constraints available - skipping delete test");
      return;
    }

    const constraintToDelete = testConstraints[0];

    // Get initial constraint count to verify deletion
    const constraintItems = page.locator('[data-testid^="constraint-item-"]');
    const initialCount = await constraintItems.count();

    // Verify the constraint is initially visible by checking the delete button exists
    const deleteButton = constraintTestBase.getConstraintDeleteButton(
      page,
      constraintToDelete.constraintId
    );
    await expect(deleteButton).toBeVisible();
    // Click the delete button
    await deleteButton.click();

    // Wait for the constraint to be removed from the list
    await page.waitForTimeout(2000);

    // Verify the constraint count decreased or the specific constraint item is gone
    const finalCount = await constraintItems.count();
    expect(finalCount).toBe(initialCount - 1);

    // Verify the specific constraint item is no longer present
    const deletedConstraintItem = constraintTestBase.getConstraintItemById(
      page,
      constraintToDelete.constraintId
    );
    await expect(deletedConstraintItem).not.toBeVisible();

    // Remove from our test constraints array since it's been deleted
    testConstraints = testConstraints.filter(
      (c) => c.constraintId !== constraintToDelete.constraintId
    );

    console.log("✅ Constraint successfully deleted from the list");
  });

  test("should handle empty constraint list gracefully", async ({ page }) => {
    // Delete all constraints if any exist
    for (const constraint of testConstraints) {
      try {
        await constraintTestBase.deleteTestConstraint(constraint.constraintId);
      } catch (error) {
        console.warn(
          `Failed to delete constraint ${constraint.constraintId}:`,
          error
        );
      }
    }
    testConstraints = [];

    // Refresh the page to see the empty state
    await page.reload();
    await constraintTestBase.waitForConstraintListLoad(page);

    // Verify the constraint list shows appropriate empty state
    const constraintList = constraintTestBase.getConstraintList(page);
    await expect(constraintList).toBeVisible();

    // Should show a "no constraints" message
    await expect(constraintList).toContainText("no_constraints");

    console.log("✅ Empty constraint list displays appropriate message");
  });

  test("should maintain list state after constraint operations", async ({
    page,
  }) => {
    // Skip this test if we don't have multiple constraints
    if (testConstraints.length < 2) {
      test.skip(
        true,
        "Not enough test constraints available - skipping list state test"
      );
      return;
    }

    const constraint1 = testConstraints[0];
    const constraint2 = testConstraints[1];

    // Perform operations on constraints and verify list remains consistent

    // 1. Toggle first constraint hard/soft
    const hardSoftButton1 = constraintTestBase.getConstraintHardSoftButton(
      page,
      constraint1.constraintId
    );
    await hardSoftButton1.click();
    await page.waitForTimeout(1000);

    // 2. Open and close edit popup for second constraint
    const editButton2 = constraintTestBase.getConstraintEditButton(
      page,
      constraint2.constraintId
    );
    await editButton2.click();

    const editPopup = constraintTestBase.getConstraintEditPopup(page);
    await expect(editPopup).toBeVisible();

    // Close popup by clicking outside or pressing escape
    await page.keyboard.press("Escape");
    await expect(editPopup).not.toBeVisible();

    // 3. Verify both constraints are still visible in the list
    const constraintItems = page.locator('[data-testid^="constraint-item-"]');
    const finalCount = await constraintItems.count();

    // Should still have our test constraints
    expect(finalCount).toBeGreaterThanOrEqual(testConstraints.length);

    // Verify the constraint items still exist by checking their delete buttons
    const constraint1DeleteButton =
      constraintTestBase.getConstraintDeleteButton(
        page,
        constraint1.constraintId
      );
    const constraint2DeleteButton =
      constraintTestBase.getConstraintDeleteButton(
        page,
        constraint2.constraintId
      );

    await expect(constraint1DeleteButton).toBeVisible();
    await expect(constraint2DeleteButton).toBeVisible();

    console.log(
      "✅ Constraint list maintains state correctly after operations"
    );
  });
});
