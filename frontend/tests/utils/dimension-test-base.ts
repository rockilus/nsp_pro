/**
 * Shared base functionality for dimension E2E tests
 *
 * This module provides common setup and navigation utilities for dimension tests,
 * reducing duplication across multiple dimension test files.
 */

import { Page } from '@playwright/test';
import { WorkerTestBase } from './worker-test-base';
import { testConfig } from './test-config';
import { DimensionT, DimensionType, DimensionEntryType } from '../../src/types/dimension';
import { DimEntryT } from '../../src/types/dim-entry';

export class DimensionTestBase extends WorkerTestBase {
  constructor() {
    super();
  }

  /**
   * Performs the common setup for dimension tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Creates a test team
   */
  async setupDimensionTests(workerIndex: number): Promise<void> {
    // Use the parent class setup, but customize the team name for dimension tests
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error('Test utilities are not available - check environment configuration');
    }

    // Create a test team for dimension tests
    const uniqueTeamName = `Dimension Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(`Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`);
  }

  /**
   * Creates a test dimension using the API
   */
  async createTestDimension(dimensionData: {
    name: string;
    entryType: DimensionEntryType;
    dimensionType: DimensionType;
    dimEntries?: DimEntryT[];
  }): Promise<DimensionT> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupDimensionTests() first.');
    }

    const result = await this.dbUtils.createDimension({
      teamId: this.testTeam.teamId,
      name: dimensionData.name,
      entryType: dimensionData.entryType,
      dimensionType: [dimensionData.dimensionType],
      dimEntries: dimensionData.dimEntries || [],
    });
    return result.newDimension;
  }

  /**
   * Updates a test dimension using the API
   */
  async updateTestDimension(
    dimensionId: string,
    updates: {
      name?: string;
      entryType?: DimensionEntryType;
    },
  ): Promise<{ dimensionId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupDimensionTests() first.');
    }

    return this.dbUtils.updateDimension(dimensionId, {
      teamId: this.testTeam.teamId,
      ...updates,
    });
  }

  /**
   * Deletes a test dimension using the API
   */
  async deleteTestDimension(dimensionId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupDimensionTests() first.');
    }

    return this.dbUtils.deleteDimension(dimensionId, this.testTeam.teamId);
  }

  /**
   * Gets all dimensions for the test team using the API
   */
  async getTestDimensions(dimensionType?: DimensionType): Promise<DimensionT[]> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupDimensionTests() first.');
    }

    return this.dbUtils.getDimensions(this.testTeam.teamId, dimensionType);
  }

  /**
   * Sets the selected team directly in localStorage and navigates to shifts page
   * This bypasses the UI navigation for faster test execution
   */
  async navigateToShiftsPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupDimensionTests() first.');
    }

    // Set authentication headers before any navigation
    await this.dbUtils.authenticatePageAsTestUser(page);

    // Navigate to the application first to establish a valid document context
    await page.goto(`${testConfig.frontendUrl}/en/plan/shifts/`);

    // Now set the selected team in localStorage with proper document context
    await page.evaluate((teamId) => {
      localStorage.setItem('selectedTeamId', teamId);
    }, this.testTeam.teamId);

    // Reload the page to apply the localStorage changes
    await page.reload();

    // Wait for the page to load and the team context to initialize
    await page.waitForLoadState('networkidle');

    // Verify we're on the shifts page and the correct team is selected
    await page.waitForSelector('h1:has-text("Shifts")');

    const currentUrl = page.url();
    if (currentUrl.includes('/plan/settings/teams')) {
      throw new Error(
        'Navigation failed: redirected to teams page. Team context may not have initialized properly.',
      );
    }
  }

  //////////////////////////
  // UI Interaction Methods
  //////////////////////////

  /**
   * Gets the Add Property button
   */
  getAddPropertyButton(page: Page) {
    return page.locator('[data-testid="add-property-button"]');
  }

  /**
   * Gets the popup dialog
   */
  getNewDimensionPopup(page: Page) {
    return page.locator('[data-testid="new-dimension-dialog"]');
  }

  /**
   * Gets the popup title
   */
  getPopupTitle(page: Page) {
    return page.locator('[data-testid="new-dimension-dialog-title"]');
  }

  /**
   * Gets the popup close button
   */
  getPopupCloseButton(page: Page) {
    return page.locator('[data-testid="new-dimension-dialog-close"]');
  }

  /**
   * Gets the name text field
   */
  getNameTextField(page: Page) {
    return page.locator('[data-testid="new-dimension-name-field"]');
  }

  /**
   * Gets the type select field
   */
  getTypeSelect(page: Page) {
    return page.locator('[data-testid="new-dimension-type-select"]');
  }

  /**
   * Gets the type select dropdown
   */
  getTypeSelectDropdown(page: Page) {
    return page.locator('[data-testid="new-dimension-type-select"] .MuiSelect-select');
  }

  /**
   * Gets a specific type option
   */
  getTypeOption(page: Page, entryType: DimensionEntryType) {
    return page.locator(`[data-testid="new-dimension-type-option-${entryType}"]`);
  }

  /**
   * Gets the add button
   */
  getAddButton(page: Page) {
    return page.locator('[data-testid="new-dimension-add-button"]');
  }

  /**
   * Gets the name error message
   */
  getNameErrorMessage(page: Page) {
    return page.locator('[data-testid="new-dimension-name-error"]');
  }

  /**
   * Gets the type error message
   */
  getTypeErrorMessage(page: Page) {
    return page.locator('[data-testid="new-dimension-type-error"]');
  }

  /**
   * Gets the tags section (when type is tags)
   */
  getTagsSection(page: Page) {
    return page.locator('[data-testid="new-dimension-tags-section"]');
  }

  /**
   * Opens the popup by clicking the Add Property button
   */
  async openNewDimensionPopup(page: Page): Promise<void> {
    const addButton = this.getAddPropertyButton(page);
    await addButton.click();
  }

  /**
   * Closes the popup by clicking the close button
   */
  async closePopupViaCloseButton(page: Page): Promise<void> {
    const closeButton = this.getPopupCloseButton(page);
    await closeButton.click();
  }

  /**
   * Closes the popup by pressing Escape
   */
  async closePopupViaEscape(page: Page): Promise<void> {
    await page.keyboard.press('Escape');
  }

  /**
   * Closes the popup by clicking away
   */
  async closePopupViaClickAway(page: Page): Promise<void> {
    // Click outside the popup
    await page.click('body', { position: { x: 50, y: 50 } });
  }

  /**
   * Fills the name field
   */
  async fillNameField(page: Page, name: string): Promise<void> {
    const nameField = this.getNameTextField(page);
    const nameInput = nameField.locator('input');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(name);
  }

  /**
   * Selects a type from the dropdown
   */
  async selectType(page: Page, entryType: DimensionEntryType): Promise<void> {
    const typeSelect = this.getTypeSelectDropdown(page);
    await typeSelect.click();

    const option = this.getTypeOption(page, entryType);
    await option.click();
  }

  /**
   * Clicks the add button
   */
  async clickAddButton(page: Page): Promise<void> {
    const addButton = this.getAddButton(page);
    await addButton.click();
  }

  /**
   * Waits for popup to be visible
   */
  async waitForPopupVisible(page: Page): Promise<void> {
    const popup = this.getNewDimensionPopup(page);
    await popup.waitFor({ state: 'visible' });
  }

  /**
   * Waits for popup to be hidden
   */
  async waitForPopupHidden(page: Page): Promise<void> {
    const popup = this.getNewDimensionPopup(page);
    await popup.waitFor({ state: 'hidden' });
  }

  /**
   * Gets a table column header by name - looks for worker dimension headers
   */
  getTableColumnHeader(page: Page, columnName: string) {
    // Use a more flexible selector that finds the dimension header by its text content
    // since the data-testid uses the dimension ID which we don't know
    return page
      .locator(`[data-testid*="worker-dimension-"][data-testid*="header-cell"]`)
      .filter({ hasText: columnName });
  }

  /**
   * Waits for a new column to appear in the table
   */
  async waitForNewColumn(page: Page, columnName: string): Promise<void> {
    const columnHeader = this.getTableColumnHeader(page, columnName);
    await columnHeader.waitFor({ state: 'visible' });
  }

  /**
   * Checks if a column exists in the table
   */
  async columnExists(page: Page, columnName: string): Promise<boolean> {
    const columnHeader = this.getTableColumnHeader(page, columnName);
    try {
      await columnHeader.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  //////////////////////////
  // Link Dimension List Methods
  //////////////////////////

  /**
   * Gets the link dimension list section
   */
  getLinkDimensionList(page: Page) {
    return page.locator('.link-dimension-list-item').first().locator('..');
  }

  /**
   * Gets all dimension items in the link dimension list
   */
  getLinkDimensionItems(page: Page) {
    return page.locator('.link-dimension-list-item');
  }

  /**
   * Gets a specific dimension item in the link dimension list by name
   */
  getLinkDimensionItem(page: Page, dimensionName: string) {
    return page.locator(
      `.link-dimension-list-item:has(.link-dimension-item-name:text("${dimensionName}"))`,
    );
  }

  /**
   * Gets the add button for a specific dimension in the link list
   */
  getLinkDimensionAddButton(page: Page, dimensionName: string) {
    return this.getLinkDimensionItem(page, dimensionName).locator('button');
  }

  /**
   * Checks if a dimension appears in the link dimension list
   */
  async isDimensionInLinkList(page: Page, dimensionName: string): Promise<boolean> {
    const dimensionItem = this.getLinkDimensionItem(page, dimensionName);
    try {
      await dimensionItem.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clicks on a dimension in the link dimension list to select it
   */
  async selectLinkDimension(page: Page, dimensionName: string): Promise<void> {
    const dimensionItem = this.getLinkDimensionItem(page, dimensionName);
    await dimensionItem.click();
  }

  /**
   * Clicks the add button for a dimension in the link list to link it
   */
  async linkDimension(page: Page, dimensionName: string): Promise<void> {
    const addButton = this.getLinkDimensionAddButton(page, dimensionName);
    await addButton.click();
  }

  /**
   * Gets the dimension chips (tags) for a selected dimension
   */
  getDimensionChips(page: Page, dimensionName: string) {
    return this.getLinkDimensionItem(page, dimensionName).locator(
      '.link-dimension-list-dim-entries .MuiChip-root',
    );
  }

  /**
   * Checks if a dimension item shows the add button (is selected)
   */
  async isDimensionSelected(page: Page, dimensionName: string): Promise<boolean> {
    const addButton = this.getLinkDimensionAddButton(page, dimensionName);
    try {
      await addButton.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  //////////////////////////
  // Dimension Cell Methods
  //////////////////////////

  /**
   * Gets a dimension cell by dimension ID
   */
  getDimensionCell(page: Page, dimensionId: string) {
    return page.locator(`[data-testid="worker-dimension-${dimensionId}-header-cell"]`);
  }

  /**
   * Gets a dimension cell by dimension name (searches for the name in the cell)
   */
  getDimensionCellByName(page: Page, dimensionName: string) {
    return page.locator(
      `[data-testid*="worker-dimension-"][data-testid*="header-cell"]:has([data-testid*="dimension-name-"]:text("${dimensionName}"))`,
    );
  }

  /**
   * Clicks on a dimension cell to open its popup
   */
  async clickDimensionCell(page: Page, dimensionId: string): Promise<void> {
    const dimensionCell = this.getDimensionCell(page, dimensionId);
    await dimensionCell.click();
  }

  /**
   * Clicks on a dimension cell by name to open its popup
   */
  async clickDimensionCellByName(page: Page, dimensionName: string): Promise<void> {
    const dimensionCell = this.getDimensionCellByName(page, dimensionName);
    await dimensionCell.click();
  }

  /**
   * Gets the dimension popup for a specific dimension
   */
  getDimensionPopup(page: Page, dimensionId: string) {
    return page.locator(`[data-testid="dimension-popup-${dimensionId}-popover"]`);
  }

  /**
   * Gets the dimension update form for a specific dimension
   */
  getDimensionUpdateForm(page: Page, dimensionId: string) {
    return page.locator(`[data-testid="update-dimension-form-${dimensionId}"]`);
  }

  /**
   * Gets the dimension name field in the update form
   */
  getDimensionNameField(page: Page, dimensionId: string) {
    return page.locator(`[data-testid="dimension-name-field-${dimensionId}"]`);
  }

  /**
   * Gets the dimension save button in the update form
   */
  getDimensionSaveButton(page: Page, dimensionId: string) {
    return page.locator(`[data-testid="dimension-save-button-${dimensionId}"]`);
  }

  /**
   * Gets the dimension delete button in the update form
   */
  getDimensionDeleteButton(page: Page, dimensionId: string) {
    return page.locator(`[data-testid="dimension-delete-button-${dimensionId}"]`);
  }

  /**
   * Gets the dimension entries section (for DIM_ENTRIES type dimensions)
   */
  getDimensionEntriesSection(page: Page, dimensionId: string) {
    return page.locator(`[data-testid="dimension-entries-section-${dimensionId}"]`);
  }

  /**
   * Gets the dimension entry items list
   */
  getDimensionEntryItems(page: Page, dimensionId: string) {
    return page.locator(
      `[data-testid="dim-entries-list-${dimensionId}"] [data-testid*="dim-entry-item-"]`,
    );
  }

  /**
   * Gets a specific dimension entry item
   */
  getDimensionEntryItem(page: Page, entryId: string) {
    return page.locator(`[data-testid="dim-entry-item-${entryId}"]`);
  }

  /**
   * Gets the edit button for a dimension entry
   */
  getDimensionEntryEditButton(page: Page, entryId: string) {
    return page.locator(`[data-testid="dim-entry-edit-button-${entryId}"]`);
  }

  /**
   * Gets the delete button for a dimension entry
   */
  getDimensionEntryDeleteButton(page: Page, entryId: string) {
    return page.locator(`[data-testid="dim-entry-delete-button-${entryId}"]`);
  }

  /**
   * Gets the edit field for a dimension entry when in edit mode
   */
  getDimensionEntryEditField(page: Page, entryId: string) {
    return page.locator(`[data-testid="dim-entry-edit-field-${entryId}"]`);
  }

  /**
   * Gets the confirm edit button for a dimension entry
   */
  getDimensionEntryConfirmEditButton(page: Page, entryId: string) {
    return page.locator(`[data-testid="dim-entry-confirm-edit-${entryId}"]`);
  }

  /**
   * Gets the cancel edit button for a dimension entry
   */
  getDimensionEntryCancelEditButton(page: Page, entryId: string) {
    return page.locator(`[data-testid="dim-entry-cancel-edit-${entryId}"]`);
  }

  /**
   * Waits for dimension popup to be visible
   */
  async waitForDimensionPopupVisible(page: Page, dimensionId: string): Promise<void> {
    const popup = this.getDimensionPopup(page, dimensionId);
    await popup.waitFor({ state: 'visible' });
  }

  /**
   * Waits for dimension popup to be hidden
   */
  async waitForDimensionPopupHidden(page: Page, dimensionId: string): Promise<void> {
    const popup = this.getDimensionPopup(page, dimensionId);
    await popup.waitFor({ state: 'hidden' });
  }

  /**
   * Fills the dimension name field in the update form
   */
  async fillDimensionNameField(page: Page, dimensionId: string, name: string): Promise<void> {
    const nameField = this.getDimensionNameField(page, dimensionId);
    const nameInput = nameField.locator('input');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(name);
  }

  /**
   * Clicks the save button in the dimension update form
   */
  async clickDimensionSaveButton(page: Page, dimensionId: string): Promise<void> {
    const saveButton = this.getDimensionSaveButton(page, dimensionId);
    await saveButton.click();
  }

  /**
   * Clicks the delete button in the dimension update form
   */
  async clickDimensionDeleteButton(page: Page, dimensionId: string): Promise<void> {
    const deleteButton = this.getDimensionDeleteButton(page, dimensionId);
    await deleteButton.click();
  }

  /**
   * Closes dimension popup by clicking away
   */
  async closeDimensionPopupViaClickAway(page: Page): Promise<void> {
    // Click outside the popup
    await page.click('body', { position: { x: 50, y: 50 } });
  }

  /**
   * Closes dimension popup by pressing Escape
   */
  async closeDimensionPopupViaEscape(page: Page): Promise<void> {
    await page.keyboard.press('Escape');
  }

  /**
   * Edits a dimension entry name
   */
  async editDimensionEntryName(page: Page, entryId: string, newName: string): Promise<void> {
    const editButton = this.getDimensionEntryEditButton(page, entryId);
    await editButton.click();

    const editField = this.getDimensionEntryEditField(page, entryId);
    const input = editField.locator('input');
    await input.waitFor({ state: 'visible' });
    await input.fill(newName);

    const confirmButton = this.getDimensionEntryConfirmEditButton(page, entryId);
    await confirmButton.click();
  }

  /**
   * Cancels editing a dimension entry
   */
  async cancelEditDimensionEntry(page: Page, entryId: string): Promise<void> {
    const editButton = this.getDimensionEntryEditButton(page, entryId);
    await editButton.click();

    const cancelButton = this.getDimensionEntryCancelEditButton(page, entryId);
    await cancelButton.click();
  }

  /**
   * Deletes a dimension entry
   */
  async deleteDimensionEntry(page: Page, entryId: string): Promise<void> {
    const deleteButton = this.getDimensionEntryDeleteButton(page, entryId);
    await deleteButton.click();
  }

  /**
   * Gets the dimension name displayed in the cell
   */
  async getDimensionNameInCell(page: Page, dimensionId: string): Promise<string> {
    const nameElement = page.locator(`[data-testid="dimension-name-${dimensionId}"]`);
    return (await nameElement.textContent()) || '';
  }
}
