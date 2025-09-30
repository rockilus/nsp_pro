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

      // Create a hard constraint
      const hardConstraint = await constraintTestBase.createTestConstraint({
        constraintType: template.constraintType,
        templateId: template.id,
        language: "en",
        blocks: [], // Empty blocks for now - can be populated based on template
        text: "Test Hard Constraint - Worker must work at least 2 shifts per week",
        hard: true,
        priority: "high",
        active: true,
      });
      testConstraints.push(hardConstraint);

      // Create a soft constraint
      const softConstraint = await constraintTestBase.createTestConstraint({
        constraintType: template.constraintType,
        templateId: template.id,
        language: "en",
        blocks: [], // Empty blocks for now
        text: "Test Soft Constraint - Worker prefers morning shifts",
        hard: false,
        priority: "medium",
        active: true,
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
      // Verify hard constraint is displayed
      const hardConstraintText =
        "Test Hard Constraint - Worker must work at least 2 shifts per week";
      await constraintTestBase.waitForConstraintInList(
        page,
        hardConstraintText
      );

      // Verify soft constraint is displayed
      const softConstraintText =
        "Test Soft Constraint - Worker prefers morning shifts";
      await constraintTestBase.waitForConstraintInList(
        page,
        softConstraintText
      );

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
    const constraintText =
      "Test Hard Constraint - Worker must work at least 2 shifts per week";

    // Verify the constraint is initially visible
    await constraintTestBase.waitForConstraintInList(page, constraintText);

    // Find and click the delete button
    const deleteButton = constraintTestBase.getConstraintDeleteButton(
      page,
      constraintToDelete.constraintId
    );

    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for the constraint to be removed from the list
    await page.waitForTimeout(2000);

    // Verify the constraint is no longer visible in the list
    const constraintList = constraintTestBase.getConstraintList(page);
    await expect(constraintList).not.toContainText(constraintText);

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
    const constraintList = constraintTestBase.getConstraintList(page);
    await expect(constraintList).toContainText("Test Hard Constraint");
    await expect(constraintList).toContainText("Test Soft Constraint");

    console.log(
      "✅ Constraint list maintains state correctly after operations"
    );
  });
});
