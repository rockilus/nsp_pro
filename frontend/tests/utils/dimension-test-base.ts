/**
 * Shared base functionality for dimension E2E tests
 *
 * This module provides common setup and navigation utilities for dimension tests,
 * reducing duplication across multiple dimension test files.
 */

import { Page } from "@playwright/test";
import { WorkerTestBase } from "./worker-test-base";
import { testConfig } from "./test-config";
import {
  DimensionT,
  DimensionType,
  DimensionEntryType,
} from "../../src/types/dimension";
import { DimEntryT } from "../../src/types/dim-entry";

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
      throw new Error(
        "Test utilities are not available - check environment configuration"
      );
    }

    // Create a test team for dimension tests
    const uniqueTeamName = `Dimension Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`
    );
  }

  /**
   * Creates a test dimension using the API
   */
  async createTestDimension(dimensionData: {
    name: string;
    entryType: DimensionEntryType;
    dimensionType: DimensionType;
    dimEntries?: DimEntryT[];
  }): Promise<{ dimensionId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupDimensionTests() first."
      );
    }

    return this.dbUtils.createDimension({
      teamId: this.testTeam.teamId,
      name: dimensionData.name,
      entryType: dimensionData.entryType,
      dimensionType: dimensionData.dimensionType,
      dimEntries: dimensionData.dimEntries || [],
    });
  }

  /**
   * Updates a test dimension using the API
   */
  async updateTestDimension(
    dimensionId: string,
    updates: {
      name?: string;
      entryType?: DimensionEntryType;
    }
  ): Promise<{ dimensionId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupDimensionTests() first."
      );
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
      throw new Error(
        "Test team not created. Call setupDimensionTests() first."
      );
    }

    return this.dbUtils.deleteDimension(dimensionId, this.testTeam.teamId);
  }

  /**
   * Gets all dimensions for the test team using the API
   */
  async getTestDimensions(
    dimensionType?: DimensionType
  ): Promise<DimensionT[]> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupDimensionTests() first."
      );
    }

    return this.dbUtils.getDimensions(this.testTeam.teamId, dimensionType);
  }

  /**
   * Navigates to the shifts page for the test team
   * This should be called in beforeEach for consistent navigation
   */
  async navigateToShiftsPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupDimensionTests() first."
      );
    }

    // Step 1: Navigate to teams page
    await page.goto(`${testConfig.frontendUrl}/en/plan/settings/teams/`);
    await page.waitForSelector('h1:has-text("Teams")');

    // Step 2: Wait for our test team to appear in the UI
    const teamElement = page.getByText(this.testTeam.name, { exact: true });
    await teamElement.waitFor({ state: "visible" });

    // Step 3: Click on the team name to select it (this navigates to schedule page)
    await Promise.all([
      page.waitForURL(`${testConfig.frontendUrl}/en/plan/schedule/`),
      teamElement.click(),
    ]);

    // Wait a bit for the team context to be fully set
    await page.waitForTimeout(1000);

    // Step 4: Navigate to Shifts page
    const shiftsLink = page.getByText("Shifts").first();
    await shiftsLink.waitFor({ state: "visible" });
    await shiftsLink.click();

    // Wait for navigation to shifts page
    await page.waitForURL(`${testConfig.frontendUrl}/en/plan/shifts/`);

    // Wait for the shifts page to be loaded
    await page.waitForSelector('h1:has-text("Shifts")');
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
    return page.locator('[data-testid="new-dimension-popup"]');
  }

  /**
   * Gets the popup title
   */
  getPopupTitle(page: Page) {
    return page.locator('[data-testid="new-dimension-popup-title"]');
  }

  /**
   * Gets the popup close button
   */
  getPopupCloseButton(page: Page) {
    return page.locator('[data-testid="new-dimension-popup-close"]');
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
    return page.locator(
      '[data-testid="new-dimension-type-select"] .MuiSelect-select'
    );
  }

  /**
   * Gets a specific type option
   */
  getTypeOption(page: Page, entryType: DimensionEntryType) {
    return page.locator(
      `[data-testid="new-dimension-type-option-${entryType}"]`
    );
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
    await page.keyboard.press("Escape");
  }

  /**
   * Closes the popup by clicking away
   */
  async closePopupViaClickAway(page: Page): Promise<void> {
    // Click outside the popup
    await page.click("body", { position: { x: 50, y: 50 } });
  }

  /**
   * Fills the name field
   */
  async fillNameField(page: Page, name: string): Promise<void> {
    const nameField = this.getNameTextField(page);
    const nameInput = nameField.locator("input");
    await nameInput.waitFor({ state: "visible" });
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
    await popup.waitFor({ state: "visible" });
  }

  /**
   * Waits for popup to be hidden
   */
  async waitForPopupHidden(page: Page): Promise<void> {
    const popup = this.getNewDimensionPopup(page);
    await popup.waitFor({ state: "hidden" });
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
    await columnHeader.waitFor({ state: "visible" });
  }

  /**
   * Checks if a column exists in the table
   */
  async columnExists(page: Page, columnName: string): Promise<boolean> {
    const columnHeader = this.getTableColumnHeader(page, columnName);
    try {
      await columnHeader.waitFor({ state: "visible", timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }
}
