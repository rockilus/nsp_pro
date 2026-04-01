/**
 * End-to-end tests for Template Management in Shift Demands page
 *
 * Tests cover:
 * - Opening and closing template management window
 * - Creating templates with validation
 * - Template list interaction and selection
 * - Template deletion with confirmation dialog
 */

import { test, expect } from "@playwright/test";
import { TemplateTestBase } from "../../utils/template-test-base";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("Template Management", () => {
  let templateTestBase: TemplateTestBase;

  test.beforeAll(async () => {
    // Setup once for all tests to avoid timeout issues
    templateTestBase = new TemplateTestBase();
    await templateTestBase.setupTemplateTests();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the page since setup is already done
    await templateTestBase.navigateToShiftDemandsPage(page);
  });

  test("should display template button in toolbar", async ({ page }) => {
    const templateButton = templateTestBase.getTemplateButton(page);
    await expect(templateButton).toBeVisible();
    await expect(templateButton).toContainText("Templates");
  });

  test("should open template management window when clicking template button", async ({
    page,
  }) => {
    const templateButton = templateTestBase.getTemplateButton(page);
    await templateButton.click();

    const templateWindow = templateTestBase.getTemplateManagementWindow(page);
    await expect(templateWindow).toBeVisible();

    // Verify window contains expected elements
    await expect(page.locator("text=Template Management")).toBeVisible();
    await expect(templateTestBase.getCreateTemplateButton(page)).toBeVisible();
  });

  test("should close template management window when clicking close button", async ({
    page,
  }) => {
    // Open the template window
    await templateTestBase.openTemplateManagementWindow(page);

    // Click the close button
    const closeButton = templateTestBase.getTemplateManagementCloseButton(page);
    await closeButton.click();

    // Verify window is closed
    const templateWindow = templateTestBase.getTemplateManagementWindow(page);
    await expect(templateWindow).not.toBeVisible();
  });

  test("should close template management window when pressing Escape key", async ({
    page,
  }) => {
    // Open the template window
    await templateTestBase.openTemplateManagementWindow(page);

    // Press Escape key
    await page.keyboard.press("Escape");

    // Verify window is closed
    const templateWindow = templateTestBase.getTemplateManagementWindow(page);
    await expect(templateWindow).not.toBeVisible();
  });

  test("should open template creation dialog when clicking create template button", async ({
    page,
  }) => {
    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);

    // Click create template button
    const createButton = templateTestBase.getCreateTemplateButton(page);
    await createButton.click();

    // Verify creation dialog is open
    const creationDialog = templateTestBase.getTemplateCreationDialog(page);
    await expect(creationDialog).toBeVisible();

    // Verify dialog contains expected elements
    await expect(page.locator("text=Create New Template")).toBeVisible();

    const formElements = templateTestBase.getTemplateCreationFormElements(page);
    await expect(formElements.nameInput).toBeVisible();
    await expect(formElements.descriptionInput).toBeVisible();
    await expect(formElements.createButton).toBeVisible();
    await expect(formElements.cancelButton).toBeVisible();
  });

  test("should disable create button when template name is empty", async ({
    page,
  }) => {
    await templateTestBase.openTemplateCreationDialog(page);

    const formElements = templateTestBase.getTemplateCreationFormElements(page);

    // Initially, the create button should be disabled (empty name)
    await expect(formElements.createButton).toBeDisabled();

    // Type something in name field - button should be enabled
    await formElements.nameInput.fill("Test Template");
    await expect(formElements.createButton).not.toBeDisabled();

    // Clear the name field - button should be disabled again
    await formElements.nameInput.clear();
    await expect(formElements.createButton).toBeDisabled();
  });

  test("should validate template name length requirements", async ({
    page,
  }) => {
    await templateTestBase.openTemplateCreationDialog(page);

    const formElements = templateTestBase.getTemplateCreationFormElements(page);

    // Test minimum length (empty string should be invalid, but single character should be valid)
    await formElements.nameInput.fill("");
    await expect(formElements.createButton).toBeDisabled();

    // Test valid length (minimum is 1 character)
    await formElements.nameInput.fill("A");
    await expect(formElements.createButton).not.toBeDisabled();
  });

  test("should create a new template and display it in the list", async ({
    page,
  }) => {
    const templateName = `Test Template ${Date.now()}`;
    const templateDescription = "This is a test template created by automation";

    await templateTestBase.createTemplateViaUI(page, {
      name: templateName,
      description: templateDescription,
    });

    // Wait for template list to update and verify the new template appears
    await templateTestBase.waitForTemplateListLoaded(page);

    // Wait for template list to refresh and check if template appears in the list
    await expect(
      page
        .locator(`[data-testid^="template-list-item-"]`)
        .filter({ hasText: templateName }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should cancel template creation when clicking cancel button", async ({
    page,
  }) => {
    await templateTestBase.openTemplateCreationDialog(page);

    const formElements = templateTestBase.getTemplateCreationFormElements(page);

    // Fill in some data
    await formElements.nameInput.fill("Test Template");
    await formElements.descriptionInput.fill("Test description");

    // Click cancel
    await formElements.cancelButton.click();

    // Verify dialog is closed
    const creationDialog = templateTestBase.getTemplateCreationDialog(page);
    await expect(creationDialog).not.toBeVisible();
  });

  test("should display created templates in the template list", async ({
    page,
  }) => {
    // Create a template via API for testing list display
    const templateName = `API Template ${Date.now()}`;
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: templateName,
      description: "Created via API for list testing",
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);

    // Wait for templates to load
    await templateTestBase.waitForTemplateListLoaded(page);

    // Verify template appears in list
    const templateItem = templateTestBase.getTemplateListItem(page, templateId);
    await expect(templateItem).toBeVisible();
    await expect(page.locator(`text=${templateName}`)).toBeVisible();
  });

  test("should select template when clicking on it (not on action buttons)", async ({
    page,
  }) => {
    // Create a template via API
    const templateName = `Selectable Template ${Date.now()}`;
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: templateName,
      description: "Template for selection testing",
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.waitForTemplateListLoaded(page);

    // Click on the template item (not on action buttons)
    const templateItem = templateTestBase.getTemplateListItem(page, templateId);
    await expect(templateItem).toBeVisible();
    await templateItem.click();

    // Verify template is selected (should have 'selected' class or visual indicator)
    await expect(templateItem).toHaveClass(/selected/);
  });

  test("should show apply and delete buttons for each template in the list", async ({
    page,
  }) => {
    // Create a template via API
    const templateName = `Template with Actions ${Date.now()}`;
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: templateName,
      description: "Template for action buttons testing",
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.waitForTemplateListLoaded(page);

    // Verify action buttons are present
    const actionButtons = templateTestBase.getTemplateActionButtons(
      page,
      templateId,
    );
    await expect(actionButtons.apply).toBeVisible();
    await expect(actionButtons.delete).toBeVisible();
  });

  test("should open confirmation dialog when clicking delete button", async ({
    page,
  }) => {
    // Create a template via API
    const templateName = `Template to Delete ${Date.now()}`;
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: templateName,
      description: "Template for deletion testing",
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.waitForTemplateListLoaded(page);

    // Click the delete button
    const actionButtons = templateTestBase.getTemplateActionButtons(
      page,
      templateId,
    );
    await actionButtons.delete.click();

    // Verify confirmation dialog opens
    const confirmDialog =
      templateTestBase.getTemplateDeleteConfirmationDialog(page);
    await expect(confirmDialog).toBeVisible();

    // Verify dialog content - check for template name within the dialog
    await expect(confirmDialog.locator(`text=${templateName}`)).toBeVisible(); // Template name should be in confirmation message

    // Verify dialog buttons
    const dialogButtons = templateTestBase.getDeleteConfirmationButtons(page);
    await expect(dialogButtons.confirm).toBeVisible();
    await expect(dialogButtons.cancel).toBeVisible();
  });

  test("should cancel deletion when clicking cancel in confirmation dialog", async ({
    page,
  }) => {
    // Create a template via API
    const templateName = `Template Cancel Delete ${Date.now()}`;
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: templateName,
      description: "Template for deletion cancellation testing",
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.waitForTemplateListLoaded(page);

    // Click the delete button
    const actionButtons = templateTestBase.getTemplateActionButtons(
      page,
      templateId,
    );
    await actionButtons.delete.click();

    // Click cancel in confirmation dialog
    const dialogButtons = templateTestBase.getDeleteConfirmationButtons(page);
    await dialogButtons.cancel.click();

    // Verify dialog is closed
    const confirmDialog =
      templateTestBase.getTemplateDeleteConfirmationDialog(page);
    await expect(confirmDialog).not.toBeVisible();

    // Verify template is still in the list
    const templateItem = templateTestBase.getTemplateListItem(page, templateId);
    await expect(templateItem).toBeVisible();
  });

  test("should delete template when confirming deletion in dialog", async ({
    page,
  }) => {
    // Create a template via API
    const templateName = `Template Confirm Delete ${Date.now()}`;
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: templateName,
      description: "Template for deletion confirmation testing",
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.waitForTemplateListLoaded(page);

    // Click the delete button
    const actionButtons = templateTestBase.getTemplateActionButtons(
      page,
      templateId,
    );
    await actionButtons.delete.click();

    // Click confirm in confirmation dialog
    const dialogButtons = templateTestBase.getDeleteConfirmationButtons(page);
    await dialogButtons.confirm.click();

    // Wait for dialog to close and template to be removed
    const confirmDialog =
      templateTestBase.getTemplateDeleteConfirmationDialog(page);
    await expect(confirmDialog).not.toBeVisible();

    // Verify template is no longer in the list
    const templateItem = templateTestBase.getTemplateListItem(page, templateId);
    await expect(templateItem).not.toBeVisible();
  });

  test("should handle multiple templates in the list correctly", async ({
    page,
  }) => {
    // Create multiple templates via API
    const template1Name = `First Template ${Date.now()}`;
    const template2Name = `Second Template ${Date.now() + 1}`;

    const template1Id = await templateTestBase.createTemplateViaAPI({
      name: template1Name,
      description: "First template for multiple template testing",
    });

    const template2Id = await templateTestBase.createTemplateViaAPI({
      name: template2Name,
      description: "Second template for multiple template testing",
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.waitForTemplateListLoaded(page);

    // Verify both templates appear
    const template1Item = templateTestBase.getTemplateListItem(
      page,
      template1Id,
    );
    const template2Item = templateTestBase.getTemplateListItem(
      page,
      template2Id,
    );

    await expect(template1Item).toBeVisible();
    await expect(template2Item).toBeVisible();

    // Select first template
    await template1Item.click();
    await expect(template1Item).toHaveClass(/selected/);
    await expect(template2Item).not.toHaveClass(/selected/);

    // Select second template
    await template2Item.click();
    await expect(template2Item).toHaveClass(/selected/);
    await expect(template1Item).not.toHaveClass(/selected/);
  });

  test("should use confirmation dialog instead of browser alert for deletion", async ({
    page,
  }) => {
    // Create a template via API
    const templateName = `Dialog Test Template ${Date.now()}`;
    const templateId = await templateTestBase.createTemplateViaAPI({
      name: templateName,
      description: "Template for dialog testing",
    });

    // Set up dialog listener to catch any browser alerts/confirms
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Open template management window
    await templateTestBase.openTemplateManagementWindow(page);
    await templateTestBase.waitForTemplateListLoaded(page);

    // Click the delete button
    const actionButtons = templateTestBase.getTemplateActionButtons(
      page,
      templateId,
    );
    await actionButtons.delete.click();

    // Verify no browser alert was fired and our custom confirmation dialog is shown instead
    expect(alertFired).toBe(false);

    // Verify our custom confirmation dialog is shown instead
    const confirmDialog =
      templateTestBase.getTemplateDeleteConfirmationDialog(page);
    await expect(confirmDialog).toBeVisible();
  });
});
