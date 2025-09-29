/**
 * Shared base functionality for Template E2E tests
 */

import { Page, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import utc from "dayjs/plugin/utc";
import isBetween from "dayjs/plugin/isBetween";
import { testConfig } from "./test-config";
import { ShiftType } from "../../src/types/shift";

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(isBetween);

export class TemplateTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs common setup for template tests:
   * - Resets relevant database collections
   * - Creates a test team with shifts
   */
  async setupTemplateTests(): Promise<void> {
    console.log("🚀 Setting up template tests...");

    // Create a test team
    this.testTeam = await this.dbUtils.createTeam({
      name: "Template Test Team",
    });

    if (this.testTeam) {
      console.log(`✅ Test team created: ${this.testTeam.name}`);

      // Create shifts for the tests - using same shifts as shift demand tests for consistency
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Morning Shift",
        startTime: dayjs.utc("2023-01-01T08:00:00"),
        endTime: dayjs.utc("2023-01-01T12:00:00"),
        shiftType: ShiftType.NORMAL,
      });
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Afternoon Shift",
        startTime: dayjs.utc("2023-01-01T14:00:00"),
        endTime: dayjs.utc("2023-01-01T18:00:00"),
        shiftType: ShiftType.NORMAL,
      });
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Duty 1",
        startTime: dayjs.utc("2023-01-01T08:00:00"),
        endTime: dayjs.utc("2023-01-02T08:00:00"),
        shiftType: ShiftType.DUTY,
      });
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Duty 2",
        startTime: dayjs.utc("2023-01-01T08:00:00"),
        endTime: dayjs.utc("2023-01-02T08:00:00"),
        shiftType: ShiftType.DUTY,
      });

      console.log("✅ Test shifts created");
    }
  }

  /**
   * Navigates to the shift demands page for the test team
   */
  async navigateToShiftDemandsPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Navigate to the application first to establish a valid document context
    await page.goto(`${testConfig.frontendUrl}/en/plan/shift-demands`);

    // Now set the selected team in localStorage with proper document context
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam.teamId);

    // Reload the page to apply the localStorage changes
    await page.reload();

    // Wait for the page to load and the team context to initialize
    await page.waitForLoadState("networkidle");

    // Wait for the main content to be visible using the data-testid attribute
    // Add a longer timeout for webkit compatibility
    await expect(page.locator('[data-testid="shift-demand-tab"]')).toBeVisible({
      timeout: 10000,
    });
    console.log("✅ Navigated to shift demands page");
  }

  /**
   * Gets the template button in the ShiftDemandToolbar
   */
  getTemplateButton(page: Page) {
    return page.locator('[data-testid="shift-demand-template-button"]');
  }

  /**
   * Gets the TemplateManagementWindow dialog
   */
  getTemplateManagementWindow(page: Page) {
    return page.locator('[data-testid="template-management-window"]');
  }

  /**
   * Gets the close button in the TemplateManagementWindow
   */
  getTemplateManagementCloseButton(page: Page) {
    return page.locator('[data-testid="template-management-close-button"]');
  }

  /**
   * Gets the create template button in the TemplateList
   */
  getCreateTemplateButton(page: Page) {
    return page.locator('[data-testid="template-list-create-button"]');
  }

  /**
   * Gets the TemplateCreationDialog
   */
  getTemplateCreationDialog(page: Page) {
    return page.locator('[data-testid="template-creation-dialog"]');
  }

  /**
   * Gets form elements in the TemplateCreationDialog
   */
  getTemplateCreationFormElements(page: Page) {
    return {
      nameInput: page.locator('[data-testid="template-name-input"] input'),
      descriptionInput: page.locator(
        '[data-testid="template-description-input"] textarea:not([readonly])'
      ),
      createButton: page.locator(
        '[data-testid="template-creation-create-button"]'
      ),
      cancelButton: page.locator(
        '[data-testid="template-creation-cancel-button"]'
      ),
    };
  }

  /**
   * Gets template list item by template ID
   */
  getTemplateListItem(page: Page, templateId: string) {
    return page.locator(`[data-testid="template-list-item-${templateId}"]`);
  }

  /**
   * Gets template action buttons by template ID
   */
  getTemplateActionButtons(page: Page, templateId: string) {
    return {
      apply: page.locator(
        `[data-testid="template-apply-button-${templateId}"]`
      ),
      delete: page.locator(
        `[data-testid="template-delete-button-${templateId}"]`
      ),
    };
  }

  /**
   * Gets the template delete confirmation dialog
   */
  getTemplateDeleteConfirmationDialog(page: Page) {
    return page.locator('[data-testid="template-delete-confirmation-dialog"]');
  }

  /**
   * Gets buttons in the delete confirmation dialog
   */
  getDeleteConfirmationButtons(page: Page) {
    return {
      confirm: page.locator(
        '[data-testid="template-delete-confirmation-dialog-confirm-button"]'
      ),
      cancel: page.locator(
        '[data-testid="template-delete-confirmation-dialog-cancel-button"]'
      ),
    };
  }

  /**
   * Creates a test template via API for testing
   */
  async createTemplateViaAPI(templateData: {
    name: string;
    description?: string;
  }): Promise<string> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Use the database utils to create a template
    const template = await this.dbUtils.createShiftDemandTemplate({
      teamId: this.testTeam.teamId,
      name: templateData.name,
      description: templateData.description || "",
    });

    return template.templateId;
  }

  /**
   * Helper method to wait for template list to load
   */
  async waitForTemplateListLoaded(page: Page) {
    // Wait for either templates to appear or the empty state
    await Promise.race([
      page
        .waitForSelector('[data-testid^="template-list-item-"]', {
          timeout: 5000,
        })
        .catch(() => null),
      page
        .waitForSelector(".template-list-empty", { timeout: 5000 })
        .catch(() => null),
    ]);
  }

  /**
   * Helper method to open the template management window
   */
  async openTemplateManagementWindow(page: Page) {
    const templateButton = this.getTemplateButton(page);
    await templateButton.click();

    const templateWindow = this.getTemplateManagementWindow(page);
    await expect(templateWindow).toBeVisible();

    return templateWindow;
  }

  /**
   * Helper method to open the template creation dialog
   */
  async openTemplateCreationDialog(page: Page) {
    // First open the template management window
    await this.openTemplateManagementWindow(page);

    // Click the create template button
    const createButton = this.getCreateTemplateButton(page);
    await createButton.click();

    const creationDialog = this.getTemplateCreationDialog(page);
    await expect(creationDialog).toBeVisible();

    return creationDialog;
  }

  /**
   * Helper method to create a template through the UI
   */
  async createTemplateViaUI(
    page: Page,
    templateData: {
      name: string;
      description?: string;
    }
  ) {
    await this.openTemplateCreationDialog(page);

    const formElements = this.getTemplateCreationFormElements(page);

    // Fill in the form
    await formElements.nameInput.fill(templateData.name);
    if (templateData.description) {
      await formElements.descriptionInput.fill(templateData.description);
    }

    // Submit the form
    await formElements.createButton.click();

    // Wait for the dialog to close
    const creationDialog = this.getTemplateCreationDialog(page);
    await expect(creationDialog).not.toBeVisible();

    // Wait for template list to update
    await this.waitForTemplateListLoaded(page);
  }

  //////////////////////////
  // Template Toolbar Testing Methods
  //////////////////////////

  /**
   * Gets the template toolbar elements
   */
  getTemplateToolbarElements(page: Page) {
    return {
      addWeekButton: page.locator(
        '[data-testid="template-toolbar-add-week-button"]'
      ),
      removeWeekButton: page.locator(
        '[data-testid="template-toolbar-remove-week-button"]'
      ),
      previousWeekButton: page.locator(
        '[data-testid="template-toolbar-previous-week-button"]'
      ),
      nextWeekButton: page.locator(
        '[data-testid="template-toolbar-next-week-button"]'
      ),
      weekDisplay: page.locator(
        '[data-testid="template-toolbar-week-display"]'
      ),
      typeToggle: page.locator('[data-testid="template-toolbar-type-toggle"]'),
      standardTypeButton: page.locator(
        '[data-testid="template-toolbar-standard-type-button"]'
      ),
      evenOddTypeButton: page.locator(
        '[data-testid="template-toolbar-even-odd-type-button"]'
      ),
      fromDemandsButton: page.locator(
        '[data-testid="template-toolbar-from-demands-button"]'
      ),
      selectButton: page.locator(
        '[data-testid="template-toolbar-select-button"]'
      ),
    };
  }

  /**
   * Gets the delete week confirmation dialog elements
   */
  getDeleteWeekDialogElements(page: Page) {
    return {
      dialog: page.locator(
        '[data-testid="template-toolbar-delete-week-dialog"]'
      ),
      cancelButton: page.locator(
        '[data-testid="template-toolbar-delete-week-cancel-button"]'
      ),
      confirmButton: page.locator(
        '[data-testid="template-toolbar-delete-week-confirm-button"]'
      ),
    };
  }

  /**
   * Gets the even/odd conversion dialog elements
   */
  getEvenOddConversionDialogElements(page: Page) {
    return {
      dialog: page.locator(
        '[data-testid="template-toolbar-even-odd-conversion-dialog"]'
      ),
      cancelButton: page.locator(
        '[data-testid="template-toolbar-even-odd-cancel-button"]'
      ),
      confirmButton: page.locator(
        '[data-testid="template-toolbar-even-odd-confirm-button"]'
      ),
    };
  }

  /**
   * Helper method to get template table week headers (to count weeks)
   */
  getTemplateTableWeeks(page: Page) {
    return page.locator('[data-testid^="template-table-week-header-"]');
  }

  /**
   * Helper method to select a template in the viewer
   */
  async selectTemplateInViewer(page: Page, templateId: string) {
    // Click on the template list item to select it and view it
    const templateItem = this.getTemplateListItem(page, templateId);
    await templateItem.click();

    // Wait for the toolbar to become visible
    const toolbar = page.locator(
      '[data-testid="template-toolbar-add-week-button"]'
    );
    await expect(toolbar).toBeVisible();
  }

  /**
   * Helper method to create a template with specific number of weeks via API
   * For now, just creates a basic template and relies on UI interactions to add weeks
   */
  async createTemplateWithWeeks(templateData: {
    name: string;
    description?: string;
    weekCount?: number;
  }): Promise<string> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Create the template first
    const templateId = await this.createTemplateViaAPI({
      name: templateData.name,
      description: templateData.description,
    });

    // Note: For now, we only create a basic template
    // Week management is handled through UI interactions in the tests
    // This could be extended to create templates with specific demands if the API supports it

    return templateId;
  }

  /**
   * Helper method to create a template with some pre-filled demands for testing
   */
  async createTemplateWithDemands(templateData: {
    name: string;
    description?: string;
    demands?: {
      weekNumber: number;
      dayIndex: number;
      shiftId: string;
      value: number;
    }[];
  }): Promise<string> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Create the basic template first
    const templateId = await this.createTemplateViaAPI({
      name: templateData.name,
      description: templateData.description,
    });

    // Note: This would need API support to pre-populate demands
    // For now, demands would need to be created through UI interactions

    return templateId;
  }

  //////////////////////////
  // Template Table Testing Methods
  //////////////////////////

  /**
   * Gets the template table element
   */
  getTemplateTable(page: Page) {
    return page.locator('[data-testid="template-table"]');
  }

  /**
   * Gets template row header elements
   */
  getTemplateRowHeaders(page: Page) {
    return page.locator('[data-testid^="template-row-header-"]');
  }

  /**
   * Gets a specific template row header by shift ID
   */
  getTemplateRowHeader(page: Page, shiftId: string) {
    return page.locator(`[data-testid="template-row-header-${shiftId}"]`);
  }

  /**
   * Gets template cell by coordinates
   */
  getTemplateCell(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-cell-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template cell checkbox for bulk selection
   */
  getTemplateCellCheckbox(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-cell-checkbox-${shiftId}-${weekNumber}-${dayIndex}"] input`
    );
  }

  /**
   * Gets template row checkbox for bulk selection
   */
  getTemplateRowCheckbox(page: Page, shiftId: string) {
    return page.locator(
      `[data-testid="template-row-checkbox-${shiftId}"] input`
    );
  }

  /**
   * Gets template column checkbox for bulk selection
   */
  getTemplateColumnCheckbox(page: Page, weekNumber: number, dayIndex: number) {
    return page.locator(
      `[data-testid="template-column-checkbox-${weekNumber}-${dayIndex}"] input`
    );
  }

  /**
   * Gets template select all checkbox
   */
  getTemplateSelectAllCheckbox(page: Page) {
    return page.locator('[data-testid="template-select-all-checkbox"]');
  }

  /**
   * Gets template empty state element
   */
  getTemplateEmptyState(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-empty-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template value element
   */
  getTemplateValue(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-value-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template increment button
   */
  getTemplateIncrementButton(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-increment-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template decrement button
   */
  getTemplateDecrementButton(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-decrement-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template shift name element
   */
  getTemplateShiftName(page: Page, shiftId: string) {
    return page.locator(`[data-testid="template-shift-name-${shiftId}"]`);
  }

  /**
   * Gets week header elements
   */
  getTemplateWeekHeaders(page: Page) {
    return page.locator('[data-testid^="template-table-week-header-"]');
  }

  /**
   * Gets a specific week header
   */
  getTemplateWeekHeader(page: Page, weekNumber: number) {
    return page.locator(
      `[data-testid="template-table-week-header-${weekNumber}"]`
    );
  }

  /**
   * Helper method to wait for template table to load
   */
  async waitForTemplateTableLoaded(page: Page) {
    await page.waitForSelector('[data-testid="template-table"]');
    await page.waitForSelector('[data-testid^="template-row-header-"]');
  }

  /**
   * Helper method to select a template and wait for it to load in the viewer
   */
  async selectTemplateAndWaitForTable(page: Page, templateId: string) {
    await this.selectTemplateInViewer(page, templateId);
    await this.waitForTemplateTableLoaded(page);
  }

  /**
   * Gets the template select button (bulk mode toggle)
   */
  getTemplateSelectButton(page: Page) {
    // This should be the bulk mode toggle button in the template toolbar
    return page.locator('[data-testid="template-toolbar-select-button"]');
  }

  /**
   * Gets the template action toolbar
   */
  getTemplateActionToolbar(page: Page) {
    return page.locator('[data-testid="template-action-toolbar"]');
  }

  /**
   * Helper method to wait for template table to update after toolbar actions
   * Note: The template table may only display 2 weeks at a time, so we need to check the toolbar display
   */
  async waitForTemplateTableUpdate(page: Page, expectedWeekCount?: number) {
    if (expectedWeekCount !== undefined) {
      // Check the week display in the toolbar which shows actual total count
      await page.waitForFunction(
        (count) => {
          const weekDisplay = document.querySelector(
            '[data-testid="template-toolbar-week-display"]'
          );
          if (!weekDisplay) return false;
          const text = weekDisplay.textContent || "";
          // Look for pattern like "/3" or "/4" to indicate total weeks
          const match = text.match(/\/(\d+)/);
          if (match) {
            return parseInt(match[1]) === count;
          }
          // Fallback to counting visible week headers
          const weeks = document.querySelectorAll(
            '[data-testid^="template-table-week-header-"]'
          );
          return weeks.length === count;
        },
        expectedWeekCount,
        { timeout: 10000 }
      );
    } else {
      // If no expected count provided, just wait for the table to be stable
      await page.waitForFunction(
        () => {
          const weekDisplay = document.querySelector(
            '[data-testid="template-toolbar-week-display"]'
          );
          return weekDisplay !== null && weekDisplay.textContent !== "";
        },
        { timeout: 10000 }
      );
    }
  }

  /**
   * Helper method to get the actual total week count from the toolbar display
   */
  async getTotalWeekCount(page: Page): Promise<number> {
    const weekDisplayText = await page
      .locator('[data-testid="template-toolbar-week-display"]')
      .textContent();
    const match = weekDisplayText?.match(/\/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    // Fallback to counting visible headers
    const visibleWeeks = this.getTemplateTableWeeks(page);
    return await visibleWeeks.count();
  }

  /**
   * Helper method to add a week via toolbar with proper waiting
   */
  async addWeekViaToolbar(page: Page) {
    const toolbarElements = this.getTemplateToolbarElements(page);

    // Get the current week count before adding
    const currentWeekCount = await this.getTotalWeekCount(page);

    // Wait for button to be enabled
    await expect(toolbarElements.addWeekButton).not.toBeDisabled();

    // Click the button
    await toolbarElements.addWeekButton.click();

    // Wait for the week count to increase by 1
    await this.waitForTemplateTableUpdate(page, currentWeekCount + 1);
  }

  /**
   * Helper method to remove a week via toolbar with confirmation
   */
  async removeWeekViaToolbar(page: Page, confirmAction: boolean = true) {
    const toolbarElements = this.getTemplateToolbarElements(page);

    // Get the current week count before removing (only if we're confirming)
    const currentWeekCount = confirmAction
      ? await this.getTotalWeekCount(page)
      : undefined;

    // Wait for button to be enabled
    await expect(toolbarElements.removeWeekButton).not.toBeDisabled();

    // Click the remove button
    await toolbarElements.removeWeekButton.click();

    // Handle the confirmation dialog
    const deleteDialogElements = this.getDeleteWeekDialogElements(page);
    await expect(deleteDialogElements.dialog).toBeVisible();

    if (confirmAction) {
      await deleteDialogElements.confirmButton.click();
      await expect(deleteDialogElements.dialog).not.toBeVisible();

      // Wait for the week count to decrease by 1
      if (currentWeekCount !== undefined && currentWeekCount > 1) {
        await this.waitForTemplateTableUpdate(page, currentWeekCount - 1);
      }
    } else {
      await deleteDialogElements.cancelButton.click();
      await expect(deleteDialogElements.dialog).not.toBeVisible();
      // No need to wait for count change since we cancelled
    }
  }

  //////////////////////////
  // Template Viewer Select Testing Methods
  //////////////////////////

  /**
   * Gets bulk selection elements in the template context
   */
  getTemplateBulkSelectionElements(page: Page) {
    return {
      input: page.locator('[data-testid="bulk-selection-input"] input'),
      deleteButton: page.locator(
        '[data-testid="bulk-selection-delete-button"]'
      ),
      confirmButton: page.locator(
        '[data-testid="bulk-selection-confirm-button"]'
      ),
      cancelButton: page.locator(
        '[data-testid="bulk-selection-cancel-button"]'
      ),
    };
  }

  /**
   * Gets template selection checkboxes
   */
  getTemplateSelectionCheckboxes(page: Page) {
    return {
      selectAll: page.locator(
        '[data-testid="template-select-all-checkbox"] input'
      ),
    };
  }

  /**
   * Helper method to activate template select mode
   */
  async activateTemplateSelectMode(page: Page) {
    const selectButton = this.getTemplateSelectButton(page);
    await selectButton.click();

    // Wait for action toolbar to appear
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).toBeVisible();
  }

  /**
   * Helper method to deactivate template select mode
   */
  async deactivateTemplateSelectMode(page: Page) {
    const bulkElements = this.getTemplateBulkSelectionElements(page);
    await bulkElements.cancelButton.click();

    // Wait for action toolbar to disappear
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).not.toBeVisible();
  }

  /**
   * Helper method to apply bulk changes in template context
   */
  async applyTemplateBulkChange(page: Page, value: string) {
    const bulkElements = this.getTemplateBulkSelectionElements(page);

    // Enter the value
    await bulkElements.input.fill(value);

    // Apply the change
    await bulkElements.confirmButton.click();

    // Wait for the action to complete (action toolbar should disappear)
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).not.toBeVisible();
  }

  /**
   * Helper method to delete selected template cells
   */
  async deleteSelectedTemplateCells(page: Page) {
    const bulkElements = this.getTemplateBulkSelectionElements(page);

    await bulkElements.deleteButton.click();

    // Handle confirmation dialog if it appears
    const deleteConfirmButton = page.locator(
      '[data-testid="bulk-selection-delete-confirm-button"]'
    );
    if (await deleteConfirmButton.isVisible()) {
      await deleteConfirmButton.click();
    }

    // Wait for operation to complete and select mode to exit
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).not.toBeVisible();
  }

  //////////////////////////
  // Build From Demands Testing Methods
  //////////////////////////

  /**
   * Gets the build from demands button in the template toolbar
   */
  getBuildFromDemandsButton(page: Page) {
    return page.locator('[data-testid="template-toolbar-from-demands-button"]');
  }

  /**
   * Gets the build from demands dialog
   */
  getBuildFromDemandsDialog(page: Page) {
    return page.locator('[data-testid="build-from-demands-dialog"]');
  }

  /**
   * Gets form elements in the build from demands dialog
   */
  getBuildFromDemandsFormElements(page: Page) {
    return {
      dialog: page.locator('[data-testid="build-from-demands-dialog"]'),
      sourceWeekDatePicker: page.locator(
        '[data-testid="source-week-date-picker"]'
      ),
      sourceWeekDateInput: page.locator(
        '[data-testid="source-week-date-input"]'
      ),
      targetWeekSelect: page.locator('[data-testid="target-week-select"]'),
      applyButton: page.locator(
        '[data-testid="build-from-demands-apply-button"]'
      ),
      cancelButton: page.locator(
        '[data-testid="build-from-demands-cancel-button"]'
      ),
    };
  }

  /**
   * Gets target week option by week number
   */
  getTargetWeekOption(page: Page, weekNumber: number) {
    return page.locator(`[data-testid="target-week-option-${weekNumber}"]`);
  }

  /**
   * Helper method to open the build from demands dialog
   */
  async openBuildFromDemandsDialog(page: Page) {
    const buildButton = this.getBuildFromDemandsButton(page);
    await buildButton.click();

    const dialog = this.getBuildFromDemandsDialog(page);
    await expect(dialog).toBeVisible();
  }

  /**
   * Helper method to close the build from demands dialog
   */
  async closeBuildFromDemandsDialog(page: Page) {
    const formElements = this.getBuildFromDemandsFormElements(page);
    await formElements.cancelButton.click();

    const dialog = this.getBuildFromDemandsDialog(page);
    await expect(dialog).not.toBeVisible();
  }

  /**
   * Helper method to select a source week date
   */
  async selectSourceWeekDate(page: Page, date: string) {
    const formElements = this.getBuildFromDemandsFormElements(page);

    // Try to find the actual input element within the DatePicker
    const dateInput = page
      .locator('[data-testid="source-week-date-picker"] input')
      .first();

    // Click on the date input to focus it
    await dateInput.click();

    // Clear the input and type the new date
    await dateInput.fill("");
    await dateInput.fill(date);

    // Press Tab to trigger validation and lose focus
    await dateInput.press("Tab");

    // Wait a moment for the date to be processed
    await page.waitForTimeout(500);
  }

  /**
   * Helper method to select a target week
   */
  async selectTargetWeek(page: Page, weekNumber: number) {
    const formElements = this.getBuildFromDemandsFormElements(page);

    // Click on the select to open dropdown
    await formElements.targetWeekSelect.click();

    // Click on the specific week option
    const weekOption = this.getTargetWeekOption(page, weekNumber);
    await weekOption.click();
  }

  /**
   * Helper method to apply demands from source to target week
   */
  async applyDemandsFromSourceToTarget(
    page: Page,
    sourceDate: string,
    targetWeekNumber: number
  ) {
    // Open the dialog
    await this.openBuildFromDemandsDialog(page);

    // Select source week date
    await this.selectSourceWeekDate(page, sourceDate);

    // Select target week
    await this.selectTargetWeek(page, targetWeekNumber);

    // Apply the changes
    const formElements = this.getBuildFromDemandsFormElements(page);
    await formElements.applyButton.click();

    // Wait for dialog to close (indicating successful operation)
    const dialog = this.getBuildFromDemandsDialog(page);
    await expect(dialog).not.toBeVisible();
  }

  /**
   * Helper method to create shift demands via API for a specific week
   * This creates demands that can be used as source data for building templates
   */
  async createShiftDemandsForWeek(
    weekStartDate: string,
    demands: { shiftId: string; value: number }[]
  ) {
    // This would use the API to create shift demands for testing
    // Implementation would depend on the API structure
    console.log(
      "Creating shift demands for week starting:",
      weekStartDate,
      "with demands:",
      demands
    );
  }

  /**
   * Helper method to verify template data matches expected demands
   */
  async verifyTemplateWeekData(
    page: Page,
    weekNumber: number,
    expectedDemands: { shiftId: string; dayIndex: number; value: number }[]
  ) {
    // Wait for template table to be visible
    await expect(page.locator('[data-testid="template-table"]')).toBeVisible();

    // Verify each expected demand value in the template
    for (const demand of expectedDemands) {
      const cellLocator = page.locator(
        `[data-testid="template-cell-${demand.shiftId}-${weekNumber}-${demand.dayIndex}"] input`
      );
      await expect(cellLocator).toHaveValue(demand.value.toString());
    }
  }
}
