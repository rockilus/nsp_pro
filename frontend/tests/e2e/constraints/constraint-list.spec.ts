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
import { randomUUID } from "crypto";

test.describe("Constraint List", () => {
  // Map to store constraints by unique test run ID
  const testConstraintsMap = new Map<
    string,
    { constraintId: string; teamId: string }[]
  >();

  // Store the constraint test base per test run
  const testBasesMap = new Map<string, ConstraintTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Generate a unique ID for this specific test run
    // Combines worker index, test title, and UUID for absolute uniqueness
    const testRunId = `${testInfo.workerIndex}-${
      testInfo.title
    }-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting test setup`);

    // Create a new ConstraintTestBase instance for this test run
    const constraintTestBase = new ConstraintTestBase();
    testBasesMap.set(testRunId, constraintTestBase);

    // Initialize empty constraints array for this test run
    testConstraintsMap.set(testRunId, []);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Setup the common constraint test environment
    await constraintTestBase.setupConstraintTests(testInfo.workerIndex);

    // Navigate to constraints page first
    await constraintTestBase.navigateToConstraintsPageDirect(page);

    // Get available constraint templates
    const templates = await constraintTestBase.getTestConstraintTemplates();
    console.log(
      `[Test Run ${testRunId}] Available templates: ${templates.length}`
    );

    if (templates.length === 0) {
      console.warn(
        `[Test Run ${testRunId}] No constraint templates available - some tests may fail`
      );
      return;
    }

    // Create test constraints for the list tests AFTER navigation
    const template = templates[0];
    const testWorkers = constraintTestBase.getTestWorkers();
    const testShifts = constraintTestBase.getTestShifts();

    // Create a hard constraint using template-based block generation
    const hardConstraint =
      await constraintTestBase.createTestConstraintFromTemplate(template, {
        workerId: testWorkers[0].workerId,
        shiftId: testShifts[0].id,
        numberValue: 2,
        hard: true,
        priority: "high",
      });
    testConstraintsMap.get(testRunId)!.push(hardConstraint);

    // Create a soft constraint using template-based block generation
    const softConstraint =
      await constraintTestBase.createTestConstraintFromTemplate(template, {
        workerId: testWorkers[1].workerId,
        shiftId: testShifts[0].id,
        numberValue: 3,
        hard: false,
        priority: "medium",
      });
    testConstraintsMap.get(testRunId)!.push(softConstraint);

    const constraintCount = testConstraintsMap.get(testRunId)!.length;
    console.log(
      `[Test Run ${testRunId}] Created ${constraintCount} test constraints`
    );

    // Clear localStorage and set the correct team to ensure we're viewing the right constraints
    // This is crucial when multiple tests run in the same worker
    const testTeam = constraintTestBase.getTestTeam();
    await page.evaluate((teamData) => {
      localStorage.clear();
      // The app uses selectedTeamId, not selectedTeam
      if (teamData) {
        localStorage.setItem("selectedTeamId", teamData.teamId);
      }
    }, testTeam);

    // Reload the page to ensure the correct team is selected
    await page.reload();

    // Wait for the constraint list to load
    await constraintTestBase.waitForConstraintListLoad(page);

    // Wait for at least one constraint item to appear in the DOM by waiting for any constraint item
    // This ensures the constraint list has finished loading and rendering
    if (constraintCount > 0) {
      try {
        // Wait for any constraint item to appear (not a specific one, in case of rendering order issues)
        await page.waitForSelector('[data-testid^="constraint-item-"]', {
          state: "visible",
          timeout: 15000,
        });
        console.log(
          `[Test Run ${testRunId}] Constraint items loaded in the DOM`
        );
      } catch (error) {
        console.error(
          `[Test Run ${testRunId}] Failed to load constraint items:`,
          error
        );
        // Take a screenshot for debugging
        await page.screenshot({
          path: `test-results/constraint-load-error-${testRunId}.png`,
          fullPage: true,
        });
      }
    }
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    if (!testRunId) {
      console.warn("No testRunId found in testInfo - skipping cleanup");
      return;
    }

    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId);

    if (!constraintTestBase) {
      console.warn(
        `[Test Run ${testRunId}] No test base found - skipping cleanup`
      );
      return;
    }

    console.log(
      `[Test Run ${testRunId}] Cleaning up ${testConstraints.length} constraints`
    );

    // Clean up: delete the constraints created for THIS specific test run
    for (const constraint of testConstraints) {
      try {
        await constraintTestBase.deleteTestConstraint(constraint.constraintId);
        console.log(
          `[Test Run ${testRunId}] Deleted constraint ${constraint.constraintId}`
        );
      } catch (error) {
        console.warn(
          `[Test Run ${testRunId}] Failed to delete constraint ${constraint.constraintId}:`,
          error
        );
      }
    }

    // Clean up the maps to prevent memory leaks
    testConstraintsMap.delete(testRunId);
    testBasesMap.delete(testRunId);

    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should display existing constraints in the constraint list", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

    console.log(
      `[Test Run ${testRunId}] Running display test with ${testConstraints.length} constraints`
    );

    // Check if constraints are displayed when we have test constraints
    const constraintList = constraintTestBase.getConstraintList(page);
    await expect(constraintList).toBeVisible();

    if (testConstraints.length > 0) {
      // Check that each test constraint is displayed using its specific constraint item identifier
      for (const testConstraint of testConstraints) {
        const constraintItem = page.locator(
          `[data-testid="constraint-item-${testConstraint.constraintId}"]`
        );
        await expect(constraintItem).toBeVisible({ timeout: 10000 });
      }
    } else {
      // If no test constraints were created due to missing templates,
      // verify the "no constraints" message
      await expect(constraintList).toContainText("no_constraints");
      console.log(
        `[Test Run ${testRunId}] ✅ No constraints message displayed when list is empty`
      );
    }
  });

  test("should toggle constraint from hard to soft when clicking hard/soft button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

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

    // Click the button to toggle to soft
    await hardSoftButton.click();

    // Wait for the button text to change
    await expect(hardSoftButton).not.toHaveText(initialText || "", {
      timeout: 10000,
    });

    // Button should now show "Soft" (or localized equivalent)
    const updatedText = await hardSoftButton.textContent();

    // Verify the text changed (exact text depends on localization)
    expect(updatedText).not.toBe(initialText);
  });

  test("should toggle constraint from soft to hard when clicking hard/soft button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

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

    // Click the button to toggle to hard
    await hardSoftButton.click();

    // Wait for the button text to change
    await expect(hardSoftButton).not.toHaveText(initialText || "", {
      timeout: 10000,
    });

    // Button should now show "Hard" (or localized equivalent)
    const updatedText = await hardSoftButton.textContent();

    // Verify the text changed
    expect(updatedText).not.toBe(initialText);
  });

  test("should open edit constraint popup when clicking edit button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

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

    console.log(
      `[Test Run ${testRunId}] ✅ Edit constraint popup opens correctly with edit form`
    );
  });

  test("should show same template content in edit popup as used for constraint creation", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

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
      `[Test Run ${testRunId}] ✅ Edit form contains ${blockCount} constraint blocks and shows save button`
    );
  });

  test("should delete constraint when clicking delete button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

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

    // Wait for the specific constraint item to be removed from the DOM
    const deletedConstraintItem = constraintTestBase.getConstraintItemById(
      page,
      constraintToDelete.constraintId
    );
    await expect(deletedConstraintItem).not.toBeVisible({ timeout: 10000 });

    // Verify the constraint count decreased
    const finalCount = await constraintItems.count();
    expect(finalCount).toBe(initialCount - 1);

    // Remove from our test constraints map since it's been deleted
    const updatedConstraints = testConstraints.filter(
      (c) => c.constraintId !== constraintToDelete.constraintId
    );
    testConstraintsMap.set(testRunId, updatedConstraints);

    console.log(
      `[Test Run ${testRunId}] ✅ Constraint successfully deleted from the list`
    );
  });

  test("should handle empty constraint list gracefully", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Delete all constraints if any exist
    for (const constraint of testConstraints) {
      try {
        await constraintTestBase.deleteTestConstraint(constraint.constraintId);
      } catch (error) {
        console.warn(
          `[Test Run ${testRunId}] Failed to delete constraint ${constraint.constraintId}:`,
          error
        );
      }
    }
    testConstraintsMap.set(testRunId, []);

    // Refresh the page to see the empty state
    await page.reload();
    await constraintTestBase.waitForConstraintListLoad(page);

    // Verify the constraint list shows appropriate empty state
    const constraintList = constraintTestBase.getConstraintList(page);
    await expect(constraintList).toBeVisible();

    // Should show a "no constraints" message
    await expect(constraintList).toContainText("no_constraints");

    console.log(
      `[Test Run ${testRunId}] ✅ Empty constraint list displays appropriate message`
    );
  });

  test("should maintain list state after constraint operations", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testConstraints = testConstraintsMap.get(testRunId) || [];
    const constraintTestBase = testBasesMap.get(testRunId)!;

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
    const initialText1 = await hardSoftButton1.textContent();
    await hardSoftButton1.click();

    // Wait for the button text to change
    await expect(hardSoftButton1).not.toHaveText(initialText1 || "", {
      timeout: 10000,
    });

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
      `[Test Run ${testRunId}] ✅ Constraint list maintains state correctly after operations`
    );
  });
});
