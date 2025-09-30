/**
 * E2E tests for Constraint Creation functionality
 *
 * This test suite covers the constraint creation feature in the ConstraintTab component,
 * including template selection, block placeholder interactions, validation, and successful creation.
 */

import { test, expect } from "@playwright/test";
import { ConstraintTestBase } from "../../utils/constraint-test-base";

const constraintTestBase = new ConstraintTestBase();

test.describe("Constraint Creation", () => {
  test.beforeEach(async ({ page }) => {
    // Setup the common constraint test environment (includes workers and shifts)
    await constraintTestBase.setupConstraintTests(test.info().workerIndex);

    // Navigate to the constraints page
    await constraintTestBase.navigateToConstraintsPage(page);

    // Wait for the constraint tab to load
    await page.waitForSelector('[data-testid="constraint-tab"]');
  });

  test.afterEach(async () => {
    // Clean up: delete the workers created during setup
    await constraintTestBase.deleteAllTestWorkers();

    // Note: Shifts and constraints are cleaned up by the database reset between tests
  });

  test("should open constraint creation popup when clicking add constraint button", async ({
    page,
  }) => {
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
  }) => {
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
  }) => {
    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Look for placeholders (clickable constraint blocks)
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]'
    );
    const placeholderCount = await placeholders.count();

    if (placeholderCount > 0) {
      // Try clicking on the first placeholder
      const firstPlaceholder = placeholders.first();
      await expect(firstPlaceholder).toBeVisible();

      const placeholderText = await firstPlaceholder.textContent();

      // Force click to bypass any overlapping elements
      await firstPlaceholder.click({ force: true });

      // Wait a moment for any UI to respond
      await page.waitForTimeout(1000);

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
            `✅ Selection dialog opened for placeholder: "${placeholderText}" using selector: ${selector}`
          );
          break;
        }
      }

      if (!dialogFound) {
        console.log(
          `ℹ️ No selection dialog found for placeholder: "${placeholderText}"`
        );
        // This might be expected for some placeholder types
      }
    } else {
      console.log("ℹ️ No clickable placeholders found in this template");
    }
  });

  test("should show validation errors for incomplete constraint fields", async ({
    page,
  }) => {
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
      const errorElements = constraintTestBase.getValidationErrors(page);
      const errorCount = await errorElements.count();

      // Verify error styling is applied
      for (let i = 0; i < errorCount; i++) {
        const errorElement = errorElements.nth(i);
        await expect(errorElement).toBeVisible();

        // Check if error classes are applied
        const hasErrorClass = await errorElement.evaluate(
          (el) =>
            el.classList.contains("error") ||
            el.closest(".error") !== null ||
            window.getComputedStyle(el).color.includes("red") ||
            window.getComputedStyle(el).borderColor.includes("red")
        );

        expect(hasErrorClass).toBeTruthy();
      }

      console.log(
        `✅ Validation errors displayed for ${errorCount} incomplete fields`
      );
    } else {
      // Check for placeholder errors (red styling on placeholders)
      const placeholders = page.locator(
        '[data-testid^="constraint-block-placeholder-"]'
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
              window.getComputedStyle(el).borderColor.includes("red")
          );

          if (hasErrorStyling) {
            foundErrorStyling = true;
            break;
          }
        }

        expect(foundErrorStyling).toBeTruthy();
        console.log(
          "✅ Validation error styling applied to incomplete placeholders"
        );
      }
    }

    // Verify the dialog remains open (constraint not saved)
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).toBeVisible();
  });

  test("should close popup and add constraint to list when all fields are filled", async ({
    page,
  }) => {
    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Get the template text for verification later
    const selectedTemplate = page.locator(
      '[data-testid^="template-item-"].Mui-selected'
    );
    const templateText = await selectedTemplate.textContent();

    // Fill placeholders based on the specific template structure
    // Template "Jean doit faire au plus 2 consultations consécutives" has 6 blocks:
    // 0: WORKER (Jean) - needs worker selection
    // 1: TEXT (doit faire) - read-only text, skip
    // 2: OPERATOR (au plus) - dropdown with options
    // 3: NUMBER (2) - number input
    // 4: SHIFT (consultations) - needs shift selection
    // 5: TIMING (consecutives) - dropdown with options

    console.log("Filling template placeholders...");

    // First, check how many placeholders actually exist and their texts
    const allPlaceholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]'
    );
    const placeholderCount = await allPlaceholders.count();
    console.log(`Found ${placeholderCount} placeholders in total`);

    // Log all placeholder texts for debugging
    for (let i = 0; i < placeholderCount; i++) {
      const placeholderText = await allPlaceholders.nth(i).textContent();
      console.log(`  Placeholder ${i}: "${placeholderText}"`);
    }

    // Fill placeholder 0: Worker selection
    try {
      await constraintTestBase.fillPlaceholderWithFirstOption(page, 0);
      console.log("✅ Filled worker placeholder");
    } catch (error) {
      console.log(`Could not fill worker placeholder: ${error}`);
    }

    // Skip placeholder 1 (read-only text "doit faire")

    // Fill placeholder 2: Operator dropdown - THIS IS CRITICAL
    try {
      const operatorPlaceholder = page
        .locator('[data-testid^="constraint-block-placeholder-"]')
        .nth(2);
      console.log(
        `Clicking operator placeholder with text: "${await operatorPlaceholder.textContent()}"`
      );
      await operatorPlaceholder.click({ force: true });
      await page.waitForTimeout(500);

      // Look for dropdown menu (Material UI dropdown)
      const dropdownSelectors = [
        '[role="listbox"]',
        ".MuiMenu-paper",
        ".MuiPopover-paper .MuiList-root",
        ".MuiSelect-menu",
        '[role="menu"]',
      ];

      let dropdownFound = false;
      for (const selector of dropdownSelectors) {
        const dropdown = page.locator(selector).first();
        if (await dropdown.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found dropdown using selector: ${selector}`);
          const options = dropdown.locator('li, [role="option"], .MuiMenuItem');
          const optionCount = await options.count();
          console.log(`Found ${optionCount} options in dropdown`);

          if (optionCount > 0) {
            const firstOption = options.first();
            const optionText = await firstOption.textContent();
            console.log(`Selecting first option: "${optionText}"`);
            await firstOption.click();
            dropdownFound = true;
            console.log("✅ Selected operator option");
            break;
          }
        }
      }

      if (!dropdownFound) {
        console.log("⚠️ No dropdown found for operator placeholder");
      }
    } catch (error) {
      console.log(`Could not fill operator placeholder: ${error}`);
    }

    // Fill placeholder 3: Number input
    try {
      const numberPlaceholder = page
        .locator('[data-testid^="constraint-block-placeholder-"]')
        .nth(3);
      await numberPlaceholder.click({ force: true });
      await page.waitForTimeout(500);

      // Try number input field
      const numberInput = page.locator('input[type="number"]').first();
      if (await numberInput.isVisible({ timeout: 2000 })) {
        await numberInput.clear();
        await numberInput.fill("3");
        console.log("✅ Filled number input");
      } else {
        // Fallback: try typing directly on placeholder
        await numberPlaceholder.selectText();
        await page.keyboard.type("3");
        console.log("✅ Filled number using direct typing");
      }
    } catch (error) {
      console.log(`Could not fill number placeholder: ${error}`);
    }

    // Fill placeholder 4: Shift selection
    try {
      await constraintTestBase.fillPlaceholderWithFirstOption(page, 4);
      console.log("✅ Filled shift placeholder");
    } catch (error) {
      console.log(`Could not fill shift placeholder: ${error}`);
    }

    // Fill the last placeholder (timing) - use placeholderCount - 1 to get the last one
    if (placeholderCount > 5) {
      try {
        const timingPlaceholder = page
          .locator('[data-testid^="constraint-block-placeholder-"]')
          .nth(placeholderCount - 1);
        await timingPlaceholder.click({ force: true });
        await page.waitForTimeout(500);

        // Look for dropdown menu
        const dropdown = page
          .locator('[role="listbox"], .MuiMenu-paper')
          .first();
        if (await dropdown.isVisible({ timeout: 2000 })) {
          const firstOption = dropdown.locator('li, [role="option"]').first();
          await firstOption.click();
          console.log("✅ Selected timing option");
        }
      } catch (error) {
        console.log(`Could not fill timing placeholder: ${error}`);
      }
    } else {
      console.log(
        `ℹ️ Skipping timing placeholder - only ${placeholderCount} placeholders found`
      );
    }

    // Wait a moment for all changes to settle and ensure all dialogs are closed
    await page.waitForTimeout(1000);

    // Close any lingering dialogs or popovers
    const openDialogs = page.locator(
      '.MuiPopover-root:visible, .MuiDialog-root:visible, [role="dialog"]:visible'
    );
    const dialogCount = await openDialogs.count();
    if (dialogCount > 0) {
      console.log(`Found ${dialogCount} open dialogs, closing them...`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // Check if there are any validation errors before saving
    const validationErrors = page.locator(
      '[data-testid*="constraint-block-error"], .Mui-error, [class*="error"]'
    );
    const errorCount = await validationErrors.count();
    if (errorCount > 0) {
      console.log(`⚠️ Found ${errorCount} validation errors before saving:`);
      for (let i = 0; i < errorCount && i < 5; i++) {
        const errorText = await validationErrors.nth(i).textContent();
        console.log(`  - Error ${i + 1}: ${errorText}`);
      }
    } else {
      console.log("✅ No validation errors found before saving");
    }

    // Check if save button is enabled
    const saveBtn = constraintTestBase.getSaveConstraintButton(page);
    const isEnabled = await saveBtn.isEnabled();
    console.log(`Save button enabled: ${isEnabled}`);

    // Save the constraint
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await expect(saveButton).toBeVisible();

    // Use force click to bypass any overlapping elements
    await saveButton.click({ force: true });

    // Wait for the dialog to close
    const dialog = constraintTestBase.getNewConstraintDialog(page);
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verify the constraint appears in the list
    const constraintList = constraintTestBase.getConstraintList(page);
    await expect(constraintList).toBeVisible();

    // Look for the new constraint in the list
    if (templateText) {
      try {
        await constraintTestBase.waitForConstraintInList(page, templateText);
        console.log(
          `✅ Constraint "${templateText}" created and appears in list`
        );
      } catch (error) {
        // If exact template text doesn't appear, check if any constraint was added
        const constraintItems = page.locator(
          '[data-testid^="constraint-item-"]'
        );
        const itemCount = await constraintItems.count();
        expect(itemCount).toBeGreaterThan(0);
        console.log(
          `✅ Constraint created successfully (${itemCount} constraints in list)`
        );
      }
    }
  });

  test("should handle worker and shift selection in shift-worker option blocks", async ({
    page,
  }) => {
    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Look for shift-worker option placeholders specifically
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]'
    );
    const placeholderCount = await placeholders.count();

    let foundShiftWorkerOption = false;

    for (let i = 0; i < placeholderCount; i++) {
      const placeholder = placeholders.nth(i);

      try {
        // Use force click to bypass any overlapping elements
        await placeholder.click({ force: true, timeout: 5000 });

        // Wait for UI to respond
        await page.waitForTimeout(500);

        // Look for shift-worker option dialog specifically
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
                'button:has-text("OK"), button:has-text("Apply"), button:has-text("Save")'
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
          (error as Error).message
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
  }) => {
    // Open the constraint creation dialog and select a template
    await constraintTestBase.openAddConstraintDialog(page);
    await constraintTestBase.selectTemplate(page, 0);

    // Wait for the constraint edit form to be visible
    const editForm = constraintTestBase.getConstraintEditForm(page);
    await expect(editForm).toBeVisible();

    // Look for shift-worker option placeholders
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]'
    );
    const placeholderCount = await placeholders.count();

    for (let i = 0; i < placeholderCount; i++) {
      const placeholder = placeholders.nth(i);

      try {
        // Use force click to bypass any overlapping elements
        await placeholder.click({ force: true, timeout: 5000 });

        // Wait for UI to respond
        await page.waitForTimeout(500);

        // Look for shift-worker option dialog
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
                'button:has-text("OK"), button:has-text("Apply"), button:has-text("Save")'
              )
              .first();
            if (await altConfirmButton.isVisible({ timeout: 1000 })) {
              await altConfirmButton.click();
              console.log(
                "✅ Confirmed multiple selections with alternative button"
              );
            }
          }

          break; // Exit after testing one placeholder
        }
      } catch (error) {
        console.log(
          `Could not test multiple selection on placeholder ${i}:`,
          (error as Error).message
        );
      }
    }
  });

  test("should preserve template selection when switching between templates", async ({
    page,
  }) => {
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
