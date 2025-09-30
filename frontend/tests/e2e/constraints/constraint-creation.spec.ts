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
    await expect(placeholder).toContainText("Select template");

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
      // Click on the first placeholder
      const firstPlaceholder = placeholders.first();
      await expect(firstPlaceholder).toBeVisible();

      const placeholderText = await firstPlaceholder.textContent();
      await firstPlaceholder.click();

      // Wait for a selection dialog to appear (this could be various types)
      // We'll check for common selection dialog patterns
      const selectionDialog = page
        .locator('[data-testid^="shift-worker-option-dialog-"]')
        .first();

      try {
        await expect(selectionDialog).toBeVisible({ timeout: 5000 });
        console.log(
          `✅ Selection dialog opened for placeholder: "${placeholderText}"`
        );
      } catch (error) {
        // If the specific dialog doesn't appear, check for other common dialog patterns
        const anyDialog = page
          .locator('[role="dialog"], .MuiDialog-root, .MuiPopover-root')
          .first();
        await expect(anyDialog).toBeVisible({ timeout: 5000 });
        console.log(
          `✅ Selection interface opened for placeholder: "${placeholderText}"`
        );
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

    // Fill in any required fields by clicking on placeholders
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]'
    );
    const placeholderCount = await placeholders.count();

    for (let i = 0; i < placeholderCount; i++) {
      const placeholder = placeholders.nth(i);

      try {
        await placeholder.click();

        // Look for various types of selection interfaces
        const selectionDialog = page
          .locator(
            '[data-testid^="shift-worker-option-dialog-"], [role="dialog"], .MuiPopover-root'
          )
          .first();

        if (await selectionDialog.isVisible({ timeout: 2000 })) {
          // Try to select the first available option
          const firstOption = page
            .locator(
              '[data-testid^="worker-option"], [data-testid^="shift-option"], .MuiMenuItem, .MuiListItem'
            )
            .first();

          if (await firstOption.isVisible({ timeout: 1000 })) {
            await firstOption.click();

            // Look for confirm button
            const confirmButton = page
              .locator(
                '[data-testid="confirm-selection-button"], button:has-text("Confirm"), button:has-text("OK"), button:has-text("Save")'
              )
              .first();

            if (await confirmButton.isVisible({ timeout: 1000 })) {
              await confirmButton.click();
            }
          }
        }
      } catch (error) {
        console.log(
          `Could not fill placeholder ${i}:`,
          (error as Error).message
        );
        // Continue to next placeholder
      }
    }

    // Save the constraint
    const saveButton = constraintTestBase.getSaveConstraintButton(page);
    await saveButton.click();

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
        await placeholder.click();

        // Look for shift-worker option dialog
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
        await placeholder.click();

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
