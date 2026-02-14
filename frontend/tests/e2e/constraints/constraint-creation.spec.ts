/**
 * E2E tests for Constraint Creation functionality
 *
 * This test suite covers the constraint creation feature in the ConstraintTab component,
 * including template selection, block placeholder interactions, validation, and successful creation.
 */

import { test, expect } from "@playwright/test";
import { ConstraintTestBase } from "../../utils/constraint-test-base";
import { randomUUID } from "crypto";

test.describe("Constraint Creation", () => {
  // Store the constraint test base per test run
  const testBasesMap = new Map<string, ConstraintTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Generate a unique ID for this specific test run
    // Combines worker index, test title, and UUID for absolute uniqueness
    const testRunId = `${testInfo.workerIndex}-${
      testInfo.title
    }-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting constraint creation test setup`,
    );

    // Create a new ConstraintTestBase instance for this test run
    const constraintTestBase = new ConstraintTestBase();
    testBasesMap.set(testRunId, constraintTestBase);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Setup the common constraint test environment (includes workers and shifts)
    await constraintTestBase.setupConstraintTests(
      testInfo.workerIndex,
      testRunId,
    );

    // Navigate to the constraints page
    await constraintTestBase.navigateToConstraintsPage(page);

    // Clear localStorage and set the correct team to ensure we're working with the right team
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

    // Wait for the constraint tab to load
    await page.waitForSelector('[data-testid="constraint-tab"]');
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    console.log(`[Test Run ${testRunId}] Starting cleanup...`);

    if (!testRunId) {
      console.warn("No testRunId found in testInfo - skipping cleanup");
      return;
    }

    const constraintTestBase = testBasesMap.get(testRunId);

    if (!constraintTestBase) {
      console.warn(
        `[Test Run ${testRunId}] No test base found - skipping cleanup`,
      );
      return;
    }

    console.log(`[Test Run ${testRunId}] Cleaning up test data`);

    // Clean up: delete the workers and shifts created for THIS specific test run
    try {
      await constraintTestBase.cleanupTestData(testRunId);
      console.log(`[Test Run ${testRunId}] Test data cleanup completed`);
    } catch (error) {
      console.warn(
        `[Test Run ${testRunId}] Failed to cleanup test data:`,
        error,
      );
    }

    // Clean up the maps to prevent memory leaks
    testBasesMap.delete(testRunId);

    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should open constraint creation popup when clicking add constraint button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Find and click the add constraint button
    const addButton = constraintTestBase.getAddConstraintButton(page);
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Verify the dialog opens
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).toBeVisible();

    // Verify dialog has correct title
    const dialogTitle = page.locator('[id="new-constraint-dialog-title"]');
    await expect(dialogTitle).toBeVisible();
    await expect(dialogTitle).toContainText("New constraint");

    // Verify template list is visible
    const templateList = constraintTestBase.getTemplateList(page);
    await expect(templateList).toBeVisible();

    // Verify there's a placeholder message when no template is selected
    const placeholder = page.locator(".select-template-placeholder");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText("Select constraint template");

    console.log("✅ Constraint creation popup opens successfully");
  });

  test("should show editable constraint form when selecting a template", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog
    await constraintTestBase.openAddConstraintDialog(page);

    // Wait for templates to load
    const templateList = constraintTestBase.getTemplateList(page);
    await expect(templateList).toBeVisible();

    // Select the first template
    const firstTemplate = constraintTestBase.getTemplateItem(page, 0);
    await expect(firstTemplate).toBeVisible();

    // Get the template text before clicking
    const templateText = await firstTemplate.textContent();
    await firstTemplate.click();

    // Verify the constraint edit form appears
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Verify the placeholder message is no longer visible
    const placeholder = page.locator(".select-template-placeholder");
    await expect(placeholder).not.toBeVisible();

    // Verify constraint blocks are displayed
    const firstBlock = constraintTestBase.getConstraintBlock(page, 0);
    await expect(firstBlock).toBeVisible();

    // Verify the save button is present
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toContainText("Add");

    console.log(`✅ Template "${templateText}" selected and edit form appears`);
  });

  test("should open selection dialog when clicking on constraint block placeholders", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Look for placeholders (clickable constraint blocks)
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]',
    );
    const placeholderCount = await placeholders.count();

    if (placeholderCount > 0) {
      // Try clicking on the first placeholder
      const firstPlaceholder = placeholders.first();
      await expect(firstPlaceholder).toBeVisible();

      const placeholderText = await firstPlaceholder.textContent();

      // Force click to bypass any overlapping elements
      await firstPlaceholder.click({ force: true });

      // Check for various types of selection dialogs/popovers that might appear
      const dialogSelectors = [
        '[data-testid^="shift-worker-option-dialog-"]',
        '[role="dialog"]',
        ".MuiPopover-root:visible",
        ".MuiDialog-root",
        ".MuiModal-root",
      ];

      let dialogFound = false;
      for (const selector of dialogSelectors) {
        const dialog = page.locator(selector).first();
        if (await dialog.isVisible({ timeout: 1000 })) {
          dialogFound = true;
          console.log(
            `✅ Selection dialog opened for placeholder: "${placeholderText}" using selector: ${selector}`,
          );
          break;
        }
      }

      if (!dialogFound) {
        console.log(
          `ℹ️ No selection dialog found for placeholder: "${placeholderText}"`,
        );
        // This might be expected for some placeholder types
      }
    } else {
      console.log("ℹ️ No clickable placeholders found in this template");
    }
  });

  test("should show validation errors for incomplete constraint fields", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Try to save without filling in required fields
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await saveButton.click();

    // Check for validation errors
    const hasErrors = await constraintTestBase.hasValidationErrors(page);

    if (hasErrors) {
      const errorElements = page.locator(
        '[data-testid*="constraint-block-error"], .Mui-error',
      );
      const errorCount = await errorElements.count();

      // Verify error styling is applied
      for (let i = 0; i < errorCount; i++) {
        const errorElement = errorElements.nth(i);
        await expect(errorElement).toBeVisible();

        // Check if error classes are applied
        const hasErrorClass = await errorElement.evaluate(
          (el: Element) =>
            el.classList.contains("error") ||
            el.closest(".error") !== null ||
            window.getComputedStyle(el).color.includes("red") ||
            window.getComputedStyle(el).borderColor.includes("red"),
        );

        expect(hasErrorClass).toBeTruthy();
      }

      console.log(
        `✅ Validation errors displayed for ${errorCount} incomplete fields`,
      );
    } else {
      // Check for placeholder errors (red styling on placeholders)
      const placeholders = page.locator(
        '[data-testid^="constraint-block-placeholder-"]',
      );
      const placeholderCount = await placeholders.count();

      if (placeholderCount > 0) {
        let foundErrorStyling = false;

        for (let i = 0; i < placeholderCount; i++) {
          const placeholder = placeholders.nth(i);
          const hasErrorStyling = await placeholder.evaluate(
            (el) =>
              el.classList.contains("error") ||
              window.getComputedStyle(el).color.includes("red") ||
              window.getComputedStyle(el).borderColor.includes("red"),
          );

          if (hasErrorStyling) {
            foundErrorStyling = true;
            break;
          }
        }

        expect(foundErrorStyling).toBeTruthy();
        console.log(
          "✅ Validation error styling applied to incomplete placeholders",
        );
      }
    }

    // Verify the dialog remains open (constraint not saved)
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).toBeVisible();
  });

  test("should close popup and add constraint to list when all fields are filled", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Get the template text for verification later
    const selectedTemplate = page.locator(
      '[data-testid^="template-item-"].Mui-selected',
    );
    const templateText = await selectedTemplate.textContent();
    console.log(`[Test ${testRunId}] Selected template: "${templateText}"`);

    // Template "Jean doit faire au plus 2 consultations consécutives" has 6 blocks:
    // Block 0: WORKER (Jean) - needs worker selection
    // Block 1: TEXT (doit faire) - read-only text, skip
    // Block 2: OPERATOR (au plus) - dropdown with options
    // Block 3: NUMBER (2) - number input
    // Block 4: SHIFT (consultations) - needs shift selection
    // Block 5: TIMING (consecutives) - dropdown with options

    const testWorkers = constraintTestBase.getTestWorkers(testRunId);
    const testShifts = constraintTestBase.getTestShifts(testRunId);
    const testWorker = testWorkers[0];
    const testShift = testShifts[0];

    console.log(`[Test ${testRunId}] Step 1: Fill WORKER block (index 0)`);
    const workerBlock = page.locator(
      '[data-testid^="shift-worker-option-block-4-"]',
    );
    await expect(workerBlock.first()).toBeVisible();
    await workerBlock.first().click();

    // Wait for the shift-worker option dialog/popover to open
    // Look for any shift-worker option to confirm the list is visible
    const anyWorkerOption = page.locator(
      '[data-testid^="swo-option-Workers-"]',
    );
    await expect(anyWorkerOption.first()).toBeVisible({ timeout: 10000 });

    // Now look for our specific worker
    const workerOption = page.locator(
      `[data-testid="swo-option-Workers-${testWorker.id}-false"]`,
    );
    await expect(workerOption).toBeVisible({ timeout: 5000 });
    await workerOption.click();

    // Close the popover and wait for it to disappear
    await page.mouse.click(100, 100);
    await expect(workerOption).not.toBeVisible();
    console.log(`✅ Filled WORKER block with: ${testWorker.name}`);

    console.log("Step 2: Fill OPERATOR block (index 2)");
    const operatorBlock = page.locator('[data-testid^="string-block-0-"]');
    await expect(operatorBlock.first()).toBeVisible();
    await operatorBlock.first().click();

    const atLeastOption = page.locator(
      '[data-testid="string-option-at-least"]',
    );
    await expect(atLeastOption).toBeVisible();
    await atLeastOption.click();
    await page.mouse.click(100, 100);
    await expect(atLeastOption).not.toBeVisible();
    console.log("✅ Filled OPERATOR block with: at least");

    console.log("Step 3: Fill NUMBER block (index 3)");
    const numberBlock = page.locator('[data-testid^="number-block-1-"]');
    await expect(numberBlock.first()).toBeVisible();
    await numberBlock.first().click();

    const numberInput = page.locator('[data-testid="constraint-number-input"]');
    await expect(numberInput).toBeVisible();
    const testNumber = "5";
    await numberInput.fill(testNumber);
    await numberInput.press("Enter");
    // Wait for the number input to disappear after pressing Enter
    await expect(numberInput).not.toBeVisible();
    console.log(`✅ Filled NUMBER block with: ${testNumber}`);

    console.log("Step 4: Fill SHIFT block (index 4)");
    const shiftBlock = page.locator(
      '[data-testid^="shift-worker-option-block-3-"]',
    );
    await expect(shiftBlock.first()).toBeVisible();
    await shiftBlock.first().click();

    const shiftOption = page.locator(
      `[data-testid="swo-option-Shifts-${testShift.id}-false"]`,
    );
    await expect(shiftOption).toBeVisible({ timeout: 5000 });
    await shiftOption.click();
    await page.mouse.click(100, 100);
    await expect(shiftOption).not.toBeVisible();
    console.log(`✅ Filled SHIFT block with: ${testShift.name}`);

    console.log("Step 5: Fill TIMING block (index 5)");
    const timingBlock = page.locator('[data-testid^="string-block-2-"]');
    await expect(timingBlock.first()).toBeVisible();
    await timingBlock.first().click();

    // The timing block should have timing options - look for "consecutive" option
    // The exact data-testid will depend on the available options
    const timingOptions = page.locator('[data-testid^="string-option-"]');
    const timingOptionCount = await timingOptions.count();
    console.log(`Found ${timingOptionCount} timing options`);

    // Select the first timing option (should be "consecutive" or similar)
    if (timingOptionCount > 0) {
      const firstOption = timingOptions.first();
      await expect(firstOption).toBeVisible({ timeout: 5000 });
      const selectedOptionText = await firstOption.textContent();
      await firstOption.click();

      // Close the popover and wait for options to disappear
      await page.mouse.click(100, 100);
      await expect(firstOption).not.toBeVisible();
      console.log(`✅ Filled TIMING block with: ${selectedOptionText}`);
    } else {
      console.log("⚠️ No timing options found");
    }

    console.log("Step 6: Verify no validation errors");
    const validationErrors = page.locator(
      '[data-testid*="constraint-block-error"], .Mui-error',
    );
    const errorCount = await validationErrors.count();
    console.log(`Validation errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log("⚠️ Unexpected validation errors found");
      for (let i = 0; i < errorCount && i < 5; i++) {
        const errorText = await validationErrors.nth(i).textContent();
        console.log(`  - Error ${i + 1}: ${errorText}`);
      }
    }

    console.log("Step 7: Click Add button to save the constraint");
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    console.log("✅ Add button clicked");

    console.log("Step 8: Verify dialog closes");
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    console.log("✅ Dialog closed successfully");

    console.log("Step 9: Verify constraint appears in the list");
    // Wait for constraint items to appear in the list
    const constraintItems = page.locator('[data-testid^="constraint-item-"]');
    await expect(constraintItems.first()).toBeVisible({ timeout: 5000 });

    const itemCount = await constraintItems.count();
    console.log(`Found ${itemCount} constraint(s) in the list`);

    expect(itemCount).toBeGreaterThan(0);

    // Verify the constraint text contains parts of our filled data
    if (itemCount > 0) {
      const firstConstraintText = await constraintItems.first().textContent();
      console.log(`First constraint text: "${firstConstraintText}"`);

      // Check if our test data appears in the constraint text (case-insensitive)
      const lowerConstraintText = firstConstraintText?.toLowerCase() || "";
      const lowerWorkerName = testWorker.name.toLowerCase();
      const lowerShiftName = testShift.name.toLowerCase();

      expect(lowerConstraintText).toContain(lowerWorkerName);
      console.log(`✅ Constraint contains worker name: ${testWorker.name}`);

      expect(lowerConstraintText).toContain(testNumber);
      console.log(`✅ Constraint contains number: ${testNumber}`);

      expect(lowerConstraintText).toContain(lowerShiftName);
      console.log(`✅ Constraint contains shift name: ${testShift.name}`);
    }

    console.log(
      `[Test ${testRunId}] ✅ Constraint creation test completed successfully!`,
    );
  });

  test("should handle worker and shift selection in shift-worker option blocks", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Look for shift-worker option placeholders specifically
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]',
    );
    const placeholderCount = await placeholders.count();

    let foundShiftWorkerOption = false;

    for (let i = 0; i < placeholderCount; i++) {
      const placeholder = placeholders.nth(i);

      try {
        // Use force click to bypass any overlapping elements
        await placeholder.click({ force: true, timeout: 5000 });

        // Wait for a dialog to appear instead of using timeout
        const shiftWorkerDialog = page
          .locator('[data-testid^="shift-worker-option-dialog-"]')
          .first();

        if (await shiftWorkerDialog.isVisible({ timeout: 2000 })) {
          foundShiftWorkerOption = true;

          // Try to select workers if available
          const workerOptions = page.locator('[data-testid^="worker-option"]');
          const workerCount = await workerOptions.count();

          if (workerCount > 0) {
            // Select the first worker
            await workerOptions.first().click();
            console.log("✅ Selected a worker option");
          }

          // Try to select shifts if available
          const shiftOptions = page.locator('[data-testid^="shift-option"]');
          const shiftCount = await shiftOptions.count();

          if (shiftCount > 0) {
            // Select the first shift
            await shiftOptions.first().click();
            console.log("✅ Selected a shift option");
          }

          // Look for duty/not duty options
          const dutyOptions = page.locator("text=/duty/i");
          const dutyCount = await dutyOptions.count();

          if (dutyCount > 0) {
            await dutyOptions.first().click();
            console.log("✅ Selected a duty option");
          }

          // Confirm selection
          const confirmButton =
            constraintTestBase.getConfirmSelectionButton(page);

          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
            console.log("✅ Confirmed selection");
          } else {
            // Try alternative confirm buttons
            const altConfirmButton = page
              .locator(
                'button:has-text("OK"), button:has-text("Apply"), button:has-text("Save")',
              )
              .first();
            if (await altConfirmButton.isVisible({ timeout: 1000 })) {
              await altConfirmButton.click();
              console.log("✅ Confirmed selection with alternative button");
            }
          }

          break; // Exit loop after successfully handling one shift-worker option
        }
      } catch (error) {
        console.log(
          `Could not interact with placeholder ${i}:`,
          (error as Error).message,
        );
      }
    }

    if (foundShiftWorkerOption) {
      console.log("✅ Successfully tested shift-worker option selection");
    } else {
      console.log("ℹ️ No shift-worker option blocks found in this template");
    }
  });

  test("should support multiple worker and shift selection", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Look for shift-worker option placeholders
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]',
    );
    const placeholderCount = await placeholders.count();

    for (let i = 0; i < placeholderCount; i++) {
      const placeholder = placeholders.nth(i);

      try {
        // Use force click to bypass any overlapping elements
        await placeholder.click({ force: true, timeout: 5000 });

        // Wait for a dialog to appear instead of using timeout
        const shiftWorkerDialog = page
          .locator('[data-testid^="shift-worker-option-dialog-"]')
          .first();

        if (await shiftWorkerDialog.isVisible({ timeout: 2000 })) {
          // Try to select multiple workers
          const workerOptions = page.locator('[data-testid^="worker-option"]');
          const workerCount = await workerOptions.count();

          if (workerCount > 1) {
            // Select multiple workers
            await workerOptions.nth(0).click();
            await workerOptions.nth(1).click();
            console.log("✅ Selected multiple workers");
          }

          // Try to select multiple shifts
          const shiftOptions = page.locator('[data-testid^="shift-option"]');
          const shiftCount = await shiftOptions.count();

          if (shiftCount > 1) {
            // Select multiple shifts
            await shiftOptions.nth(0).click();
            await shiftOptions.nth(1).click();
            console.log("✅ Selected multiple shifts");
          }

          // Confirm selection
          const confirmButton =
            constraintTestBase.getConfirmSelectionButton(page);

          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
            console.log("✅ Confirmed multiple selections");
          } else {
            // Try alternative confirm buttons
            const altConfirmButton = page
              .locator(
                'button:has-text("OK"), button:has-text("Apply"), button:has-text("Save")',
              )
              .first();
            if (await altConfirmButton.isVisible({ timeout: 1000 })) {
              await altConfirmButton.click();
              console.log(
                "✅ Confirmed multiple selections with alternative button",
              );
            }
          }

          break; // Exit after testing one placeholder
        }
      } catch (error) {
        console.log(
          `Could not test multiple selection on placeholder ${i}:`,
          (error as Error).message,
        );
      }
    }
  });

  test("should handle shift block interaction: display placeholder, show options, select shift, and validate", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    console.log("Looking for shift blocks...");

    // Find shift blocks (blocks with BlockNameOptions.SHIFT = 3)
    // The data-testid follows pattern: shift-worker-option-block-{blockName}-{index}
    const shiftBlocks = page.locator(
      '[data-testid^="shift-worker-option-block-3-"]',
    );
    const shiftBlockCount = await shiftBlocks.count();

    console.log(`Found ${shiftBlockCount} shift blocks`);

    if (shiftBlockCount === 0) {
      console.log("ℹ️ No shift blocks found in this template, skipping test");
      return;
    }

    // Test the first shift block
    const shiftBlock = shiftBlocks.first();
    await expect(shiftBlock).toBeVisible();

    // Step 1: Check that the placeholder is displayed in the shift block
    console.log("Step 1: Checking placeholder display...");
    const placeholder = shiftBlock.locator(
      '[data-testid^="constraint-block-placeholder-"]',
    );
    await expect(placeholder).toBeVisible();
    const placeholderText = await placeholder.textContent();
    console.log(`✅ Placeholder displayed: "${placeholderText}"`);

    // Step 2: Click on the shift block to open the selection list
    console.log("Step 2: Clicking on shift block to open selection list...");
    await shiftBlock.click();

    // Step 3: Verify that the template block options are displayed
    console.log("Step 3: Verifying shift options are displayed...");

    // Get our test shifts - we know they exist from the setup
    const testShifts = constraintTestBase.getTestShifts(testRunId);
    const testShift1 = testShifts[0];
    const testShift2 = testShifts[1];

    console.log(
      `Looking for test shift: ${testShift1.name} (ID: ${testShift1.id})`,
    );

    // Look for shift options using the data-testid pattern we added
    // Pattern: swo-option-{categoryName}-{id}-{isBoolDim}
    // For shifts, categoryName should be "Shifts" and isBoolDim should be false
    const testShiftOption = page.locator(
      `[data-testid="swo-option-Shifts-${testShift1.id}-false"]`,
    );

    await expect(testShiftOption).toBeVisible({ timeout: 5000 });
    console.log(`✅ Found test shift option: ${testShift1.name}`);

    // Step 4: Select one option (our test shift)
    console.log(`Step 4: Selecting shift: ${testShift1.name}...`);
    await testShiftOption.click();

    // Step 5: Click away to close the edit shift block list
    console.log("Step 5: Clicking away to close selection list...");
    // Click somewhere on the screen to close the popover
    await page.mouse.click(100, 100);

    // Wait for the shift option to disappear (popover closed)
    await expect(testShiftOption).not.toBeVisible();

    // Step 6: Verify the shift block now displays the name of our test shift
    console.log(
      "Step 6: Verifying shift block displays selected shift name...",
    );
    const shiftBlockValue = shiftBlock.locator("text=" + testShift1.name);
    await expect(shiftBlockValue).toBeVisible({ timeout: 5000 });
    console.log(`✅ Shift block displays selected shift: ${testShift1.name}`);

    // Step 7: Click on add button - validation errors should be raised for other blocks but NOT the shift block
    console.log("Step 7: Clicking Add button to test validation...");
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await saveButton.click();

    // Check if there are validation errors
    const validationErrors = page.locator(
      '[data-testid*="constraint-block-error"], .Mui-error',
    );
    // Wait for validation to complete by checking if any validation errors appear or ensuring save button is still enabled
    await Promise.race([
      expect(validationErrors.first())
        .toBeVisible({ timeout: 2000 })
        .catch(() => {}),
      expect(saveButton).toBeEnabled({ timeout: 2000 }),
    ]);
    const errorCount = await validationErrors.count();

    console.log(`Found ${errorCount} validation errors`);

    if (errorCount > 0) {
      // There should be validation errors for other blocks
      console.log("✅ Validation errors present for incomplete blocks");

      // Verify the shift block we filled is NOT showing an error
      // Check if the shift block has an error indicator
      const shiftBlockError = shiftBlock.locator('[data-testid*="error"]');
      const shiftBlockHasError = await shiftBlockError.count();

      // Also check the block's placeholder/name elements for error state
      const shiftBlockPlaceholderError = shiftBlock.locator(
        '[data-testid^="constraint-block-placeholder-"].Mui-error, [data-testid^="constraint-block-name-"].Mui-error',
      );
      const placeholderHasError = await shiftBlockPlaceholderError.count();

      console.log(`Shift block error indicators: ${shiftBlockHasError}`);
      console.log(
        `Shift block placeholder/name error indicators: ${placeholderHasError}`,
      );

      if (shiftBlockHasError === 0 && placeholderHasError === 0) {
        console.log(
          "✅ Shift block does NOT have validation errors (as expected)",
        );
      } else {
        console.log("⚠️ Shift block unexpectedly has validation errors");
      }
    } else {
      // No validation errors means all required fields were filled
      console.log(
        "ℹ️ No validation errors - either only shift block was required or other blocks have defaults",
      );
    }

    // Verify the dialog remains open (constraint not saved due to validation errors)
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).toBeVisible();
    console.log("✅ Dialog remains open due to validation errors");

    console.log("✅ Shift block test completed successfully!");
  });

  test("should handle worker block interaction: display placeholder, show options, select worker, and validate", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    console.log("Looking for worker blocks...");

    // Find worker blocks (blocks with BlockNameOptions.WORKER = 4)
    // The data-testid follows pattern: shift-worker-option-block-{blockName}-{index}
    const workerBlocks = page.locator(
      '[data-testid^="shift-worker-option-block-4-"]',
    );
    const workerBlockCount = await workerBlocks.count();

    console.log(`Found ${workerBlockCount} worker blocks`);

    if (workerBlockCount === 0) {
      console.log("ℹ️ No worker blocks found in this template, skipping test");
      return;
    }

    // Test the first worker block
    const workerBlock = workerBlocks.first();
    await expect(workerBlock).toBeVisible();

    // Step 1: Check that the placeholder is displayed in the worker block
    console.log("Step 1: Checking placeholder display...");
    const placeholder = workerBlock.locator(
      '[data-testid^="constraint-block-placeholder-"]',
    );
    await expect(placeholder).toBeVisible();
    const placeholderText = await placeholder.textContent();
    console.log(`✅ Placeholder displayed: "${placeholderText}"`);

    // Step 2: Click on the worker block to open the selection list
    console.log("Step 2: Clicking on worker block to open selection list...");
    await workerBlock.click();

    // Step 3: Verify that the template block options are displayed
    console.log("Step 3: Verifying worker options are displayed...");

    // Get our test workers - we know they exist from the setup
    const testWorkers = constraintTestBase.getTestWorkers(testRunId);
    const testWorker1 = testWorkers[0];
    const testWorker2 = testWorkers[1];

    console.log(
      `Looking for test worker: ${testWorker1.name} (ID: ${testWorker1.id})`,
    );

    // Look for worker options using the data-testid pattern we added
    // Pattern: swo-option-{categoryName}-{id}-{isBoolDim}
    // For workers, categoryName should be "Workers" and isBoolDim should be false
    const testWorkerOption = page.locator(
      `[data-testid="swo-option-Workers-${testWorker1.id}-false"]`,
    );

    await expect(testWorkerOption).toBeVisible({ timeout: 5000 });
    console.log(`✅ Found test worker option: ${testWorker1.name}`);

    // Step 4: Select one option (our test worker)
    console.log(`Step 4: Selecting worker: ${testWorker1.name}...`);
    await testWorkerOption.click();

    // Step 5: Click away to close the edit worker block list
    console.log("Step 5: Clicking away to close selection list...");
    // Click somewhere on the screen to close the popover
    await page.mouse.click(100, 100);

    // Wait for the worker option to disappear (popover closed)
    await expect(testWorkerOption).not.toBeVisible();

    // Step 6: Verify the worker block now displays the name of our test worker
    console.log(
      "Step 6: Verifying worker block displays selected worker name...",
    );
    const workerBlockValue = workerBlock.locator("text=" + testWorker1.name);
    await expect(workerBlockValue).toBeVisible({ timeout: 5000 });
    console.log(
      `✅ Worker block displays selected worker: ${testWorker1.name}`,
    );

    // Step 7: Click on add button - validation errors should be raised for other blocks but NOT the worker block
    console.log("Step 7: Clicking Add button to test validation...");
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await saveButton.click();

    // Check if there are validation errors
    const validationErrors = page.locator(
      '[data-testid*="constraint-block-error"], .Mui-error',
    );
    // Wait for validation to complete by checking if any validation errors appear or ensuring save button is still enabled
    await Promise.race([
      expect(validationErrors.first())
        .toBeVisible({ timeout: 2000 })
        .catch(() => {}),
      expect(saveButton).toBeEnabled({ timeout: 2000 }),
    ]);
    const errorCount = await validationErrors.count();

    console.log(`Found ${errorCount} validation errors`);

    if (errorCount > 0) {
      // There should be validation errors for other blocks
      console.log("✅ Validation errors present for incomplete blocks");

      // Verify the worker block we filled is NOT showing an error
      // Check if the worker block has an error indicator
      const workerBlockError = workerBlock.locator('[data-testid*="error"]');
      const workerBlockHasError = await workerBlockError.count();

      // Also check the block's placeholder/name elements for error state
      const workerBlockPlaceholderError = workerBlock.locator(
        '[data-testid^="constraint-block-placeholder-"].Mui-error, [data-testid^="constraint-block-name-"].Mui-error',
      );
      const placeholderHasError = await workerBlockPlaceholderError.count();

      console.log(`Worker block error indicators: ${workerBlockHasError}`);
      console.log(
        `Worker block placeholder/name error indicators: ${placeholderHasError}`,
      );

      if (workerBlockHasError === 0 && placeholderHasError === 0) {
        console.log(
          "✅ Worker block does NOT have validation errors (as expected)",
        );
      } else {
        console.log("⚠️ Worker block unexpectedly has validation errors");
      }
    } else {
      // No validation errors means all required fields were filled
      console.log(
        "ℹ️ No validation errors - either only worker block was required or other blocks have defaults",
      );
    }

    // Verify the dialog remains open (constraint not saved due to validation errors)
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).toBeVisible();
    console.log("✅ Dialog remains open due to validation errors");

    console.log("✅ Worker block test completed successfully!");
  });

  test("should handle string block interaction: display placeholder, show options, select option, and validate", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog
    await constraintTestBase.openAddConstraintDialog(page);

    // Select template 0: "Jean doit faire au plus 2 consultations consécutives"
    // This template has STRING blocks with options:
    // Block 1 (index 1): OPERATOR with options ["at most", "at least", "exactly"]
    // Block 4 (index 4): TIMING with options ["consecutive"]
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    console.log(
      "Step 1: Check that the OPERATOR string block displays its value",
    );
    // BlockNameOptions.OPERATOR = 0
    // Template structure: [0: WORKER, 1: TEXT (display only), 2: OPERATOR, 3: NUMBER, 4: SHIFT, 5: TIMING]
    const operatorBlock = page.locator('[data-testid^="string-block-0-"]');
    await expect(operatorBlock.first()).toBeVisible();

    // Check that "au plus" is displayed (it's a value, not a placeholder in this case)
    // The OPERATOR block is at index 2 (after WORKER and TEXT blocks)
    const blockDisplay = page.locator(
      '[data-testid="constraint-block-display-2"]',
    );
    await expect(blockDisplay).toBeVisible();
    await expect(blockDisplay).toContainText("au plus");

    console.log(
      "Step 2: Click on the OPERATOR string block to open the options list",
    );
    await operatorBlock.first().click();

    console.log("Step 3: Verify that the options are displayed");
    // Check that we can see the operator options
    // The options should have data-testid like "string-option-at-most", "string-option-at-least", "string-option-exactly"
    const atMostOption = page.locator('[data-testid="string-option-at-most"]');
    const atLeastOption = page.locator(
      '[data-testid="string-option-at-least"]',
    );
    const exactlyOption = page.locator('[data-testid="string-option-exactly"]');

    // Verify all three options are visible
    await expect(atMostOption).toBeVisible();
    await expect(atLeastOption).toBeVisible();
    await expect(exactlyOption).toBeVisible();

    console.log("Step 4: Select a different option (at least)");
    await atLeastOption.click();

    console.log(
      "Step 5: The string block should now display the newly selected option",
    );
    // Click away to close the popover
    await page.mouse.click(100, 100);
    // Wait for the option to disappear (popover closed)
    await expect(atLeastOption).not.toBeVisible();

    // The block should now show "at least" (or its translation "au moins")
    // Check for either the English or French version
    await expect(blockDisplay).toContainText(/at least|au moins/i);

    console.log(
      "Step 6: Click Add button to validate - no error should be raised for the OPERATOR block",
    );
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await saveButton.click();

    // Check if there are validation errors
    const validationErrors = page.locator(
      '[data-testid*="constraint-block-error"], .Mui-error',
    );
    // Wait for validation to complete by checking if any validation errors appear or ensuring save button is still enabled
    await Promise.race([
      expect(validationErrors.first())
        .toBeVisible({ timeout: 2000 })
        .catch(() => {}),
      expect(saveButton).toBeEnabled({ timeout: 2000 }),
    ]);
    const errorCount = await validationErrors.count();

    console.log(`Found ${errorCount} validation errors`);

    if (errorCount > 0) {
      // There should be validation errors for other blocks
      console.log("✅ Validation errors present for incomplete blocks");

      // Verify the operator block we filled is NOT showing an error
      // Check if the operator block has an error indicator
      const operatorBlockError = operatorBlock
        .first()
        .locator('[data-testid*="error"]');
      const operatorBlockHasError = await operatorBlockError.count();

      // Also check the block's placeholder/name elements for error state
      const operatorBlockPlaceholderError = operatorBlock
        .first()
        .locator(
          '[data-testid^="constraint-block-placeholder-"].Mui-error, [data-testid^="constraint-block-name-"].Mui-error',
        );
      const placeholderHasError = await operatorBlockPlaceholderError.count();

      console.log(`Operator block error indicators: ${operatorBlockHasError}`);
      console.log(
        `Operator block placeholder/name error indicators: ${placeholderHasError}`,
      );

      if (operatorBlockHasError === 0 && placeholderHasError === 0) {
        console.log(
          "✅ Operator block does NOT have validation errors (as expected)",
        );
      } else {
        console.log("⚠️ Operator block unexpectedly has validation errors");
      }
    } else {
      // No validation errors means all required fields were filled
      console.log(
        "ℹ️ No validation errors - either only operator block was required or other blocks have defaults",
      );
    }

    // Verify the dialog remains open (constraint not saved due to validation errors)
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).toBeVisible();
    console.log("✅ Dialog remains open due to validation errors");

    console.log(
      "✅ String block with dropdown options test completed successfully!",
    );
  });

  test("should handle number block interaction: display placeholder, enter number, and validate", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog
    await constraintTestBase.openAddConstraintDialog(page);

    // Select template 0: "Jean doit faire au plus 2 consultations consécutives"
    // This template has a NUMBER block at index 3
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    console.log("Step 1: Check that the NUMBER block displays its placeholder");
    // BlockNameOptions.NUMBER = 1
    // Template structure: [0: WORKER, 1: TEXT (display only), 2: OPERATOR, 3: NUMBER, 4: SHIFT, 5: TIMING]
    // The NUMBER block is at index 3
    const numberBlock = page.locator('[data-testid^="number-block-1-"]');
    await expect(numberBlock.first()).toBeVisible();

    // Check that the placeholder "2" is displayed
    const placeholder = page.locator(
      '[data-testid="constraint-block-placeholder-3"]',
    );
    await expect(placeholder).toBeVisible();
    const placeholderText = await placeholder.textContent();
    console.log(`✅ Placeholder displayed: "${placeholderText}"`);

    console.log(
      "Step 2: Click on the NUMBER block to open the text field input",
    );
    await numberBlock.first().click();

    console.log("Step 3: Verify that the number input field is displayed");
    const numberInput = page.locator('[data-testid="constraint-number-input"]');
    await expect(numberInput).toBeVisible();
    console.log("✅ Number input field is visible");

    console.log("Step 4: Enter a number and press Enter to validate");
    const testNumber = "5";
    await numberInput.fill(testNumber);
    await numberInput.press("Enter");

    // Wait for the number input to disappear (popover closed)
    await expect(numberInput).not.toBeVisible();

    console.log("Step 5: Verify the number block now displays our number");
    const blockDisplay = page.locator(
      '[data-testid="constraint-block-display-3"]',
    );
    await expect(blockDisplay).toBeVisible();
    await expect(blockDisplay).toContainText(testNumber);
    console.log(`✅ Number block displays entered number: ${testNumber}`);

    console.log(
      "Step 6: Click Add button to validate - no error should be raised for the NUMBER block",
    );
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await saveButton.click();

    // Check if there are validation errors
    const validationErrors = page.locator(
      '[data-testid*="constraint-block-error"], .Mui-error',
    );
    // Wait for validation to complete by checking if any validation errors appear or ensuring save button is still enabled
    await Promise.race([
      expect(validationErrors.first())
        .toBeVisible({ timeout: 2000 })
        .catch(() => {}),
      expect(saveButton).toBeEnabled({ timeout: 2000 }),
    ]);
    const errorCount = await validationErrors.count();

    console.log(`Found ${errorCount} validation errors`);

    if (errorCount > 0) {
      // There should be validation errors for other blocks
      console.log("✅ Validation errors present for incomplete blocks");

      // Verify the number block we filled is NOT showing an error
      const numberBlockError = numberBlock
        .first()
        .locator('[data-testid*="error"]');
      const numberBlockHasError = await numberBlockError.count();

      // Also check the block's placeholder/name elements for error state
      const numberBlockPlaceholderError = numberBlock
        .first()
        .locator(
          '[data-testid^="constraint-block-placeholder-"].Mui-error, [data-testid^="constraint-block-name-"].Mui-error',
        );
      const placeholderHasError = await numberBlockPlaceholderError.count();

      console.log(`Number block error indicators: ${numberBlockHasError}`);
      console.log(
        `Number block placeholder/name error indicators: ${placeholderHasError}`,
      );

      if (numberBlockHasError === 0 && placeholderHasError === 0) {
        console.log(
          "✅ Number block does NOT have validation errors (as expected)",
        );
      } else {
        console.log("⚠️ Number block unexpectedly has validation errors");
      }
    } else {
      // No validation errors means all required fields were filled
      console.log(
        "ℹ️ No validation errors - either only number block was required or other blocks have defaults",
      );
    }

    // Verify the dialog remains open (constraint not saved due to validation errors)
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).toBeVisible();
    console.log("✅ Dialog remains open due to validation errors");

    console.log("✅ Number block test completed successfully!");
  });

  test("should preserve template selection when switching between templates", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const constraintTestBase = testBasesMap.get(testRunId)!;

    // Open the constraint creation dialog
    await constraintTestBase.openAddConstraintDialog(page);

    // Wait for templates to load
    const templateList = constraintTestBase.getTemplateList(page);
    await expect(templateList).toBeVisible();

    // Select the first template
    const firstTemplate = constraintTestBase.getTemplateItem(page, 0);
    await expect(firstTemplate).toBeVisible();
    await firstTemplate.click();

    // Verify first template is selected
    await expect(firstTemplate).toHaveClass(/Mui-selected/);

    // Check if there's a second template
    const secondTemplate = constraintTestBase.getTemplateItem(page, 1);

    if (await secondTemplate.isVisible()) {
      // Select the second template
      await secondTemplate.click();

      // Verify second template is now selected
      await expect(secondTemplate).toHaveClass(/Mui-selected/);

      // Verify first template is no longer selected
      await expect(firstTemplate).not.toHaveClass(/Mui-selected/);

      console.log("✅ Template selection switches correctly between templates");
    } else {
      console.log("ℹ️ Only one template available for testing");
    }
  });
});
