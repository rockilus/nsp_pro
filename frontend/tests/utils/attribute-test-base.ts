/**
 * Shared base functionality for attribute E2E tests
 *
 * This module provides common setup and navigation utilities for attribute tests,
 * reducing duplication across multiple attribute test files.
 */

import { Page } from "@playwright/test";
import { DimensionTestBase } from "./dimension-test-base";
import {
  DimensionT,
  DimensionType,
  DimensionEntryType,
} from "../../src/types/dimension";
import { AttributeT, AttributeOwnerType } from "../../src/types/attribute";

export class AttributeTestBase extends DimensionTestBase {
  constructor() {
    super();
  }

  /**
   * Performs the common setup for attribute tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Creates a test team
   */
  async setupAttributeTests(workerIndex: number): Promise<void> {
    // Use the parent class setup, but customize the team name for attribute tests
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error(
        "Test utilities are not available - check environment configuration"
      );
    }

    // Create a test team for attribute tests
    const uniqueTeamName = `Attribute Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`
    );
  }

  /**
   * Creates a test attribute using the API
   */
  async createTestAttribute(attributeData: {
    value: string | number | boolean;
    ownerType: AttributeOwnerType;
    ownerId: string;
    dimensionId: string;
    dimEntryIds?: string[];
  }): Promise<{
    attributeId: string;
    value: string | number | boolean;
    teamId: string;
  }> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupAttributeTests() first."
      );
    }

    return this.dbUtils.createAttribute({
      teamId: this.testTeam.teamId,
      value: attributeData.value,
      ownerType: attributeData.ownerType,
      ownerId: attributeData.ownerId,
      dimensionId: attributeData.dimensionId,
      dimEntryIds: attributeData.dimEntryIds || [],
    });
  }

  /**
   * Updates a test attribute using the API
   */
  async updateTestAttribute(
    attributeId: string,
    updates: {
      value?: string | number | boolean;
      dimEntryIds?: string[];
    }
  ): Promise<{
    attributeId: string;
    value: string | number | boolean;
    teamId: string;
  }> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupAttributeTests() first."
      );
    }

    return this.dbUtils.updateAttribute(
      attributeId,
      this.testTeam.teamId,
      updates
    );
  }

  /**
   * Deletes a test attribute using the API
   */
  async deleteTestAttribute(attributeId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupAttributeTests() first."
      );
    }

    return this.dbUtils.deleteAttribute(attributeId, this.testTeam.teamId);
  }

  /**
   * Gets attributes by owner using the API
   */
  async getTestAttributesByOwner(ownerId: string): Promise<AttributeT[]> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupAttributeTests() first."
      );
    }

    return this.dbUtils.getAttributesByOwner(ownerId, this.testTeam.teamId);
  }

  //////////////////////////
  // Page Element Selectors for AttributeCell Testing
  //////////////////////////

  /**
   * Get the attribute cell for a specific dimension and owner
   */
  getAttributeCell(page: Page, dimensionId: string, ownerId: string) {
    return page.locator(
      `[data-testid="attribute-cell-${ownerId}-${dimensionId}"]`
    );
  }

  /**
   * Get the attribute text field when editing
   */
  getAttributeTextField(page: Page, dimensionId: string, ownerId: string) {
    return page.locator(
      `[data-testid="attribute-text-field-${ownerId}-${dimensionId}"]`
    );
  }

  /**
   * Get the attribute number field when editing
   */
  getAttributeNumberField(page: Page, dimensionId: string, ownerId: string) {
    return page.locator(
      `[data-testid="attribute-number-field-${ownerId}-${dimensionId}"]`
    );
  }

  /**
   * Get the attribute checkbox for boolean type
   */
  getAttributeCheckbox(page: Page, dimensionId: string, ownerId: string) {
    return page.locator(
      `[data-testid="attribute-checkbox-${ownerId}-${dimensionId}"]`
    );
  }

  /**
   * Get the attribute dim entries popup
   */
  getAttributeDimEntriesPopup(
    page: Page,
    dimensionId: string,
    ownerId: string
  ) {
    return page.locator(
      `[data-testid="attribute-dim-entries-popup-${ownerId}-${dimensionId}"]`
    );
  }

  /**
   * Get the attribute dim entries search input
   */
  getAttributeDimEntriesSearchInput(
    page: Page,
    dimensionId: string,
    ownerId: string
  ) {
    return page.locator(
      `[data-testid="attribute-dim-entries-search-${ownerId}-${dimensionId}"]`
    );
  }

  /**
   * Get a specific dim entry option in the attribute popup
   */
  getAttributeDimEntryOption(
    page: Page,
    dimensionId: string,
    ownerId: string,
    dimEntryId: string
  ) {
    return page.locator(
      `[data-testid="attribute-dim-entry-option-${ownerId}-${dimensionId}-${dimEntryId}"]`
    );
  }

  /**
   * Get a selected dim entry chip in the attribute popup
   */
  getAttributeSelectedDimEntryChip(
    page: Page,
    dimensionId: string,
    ownerId: string,
    dimEntryId: string
  ) {
    return page.locator(
      `[data-testid="attribute-selected-dim-entry-chip-${ownerId}-${dimensionId}-${dimEntryId}"]`
    );
  }

  /**
   * Get the remove button for a selected dim entry chip
   */
  getAttributeRemoveDimEntryButton(
    page: Page,
    dimensionId: string,
    ownerId: string,
    dimEntryId: string
  ) {
    return page.locator(
      `[data-testid="attribute-remove-dim-entry-${ownerId}-${dimensionId}-${dimEntryId}"]`
    );
  }

  //////////////////////////
  // Helper Actions for AttributeCell Testing
  //////////////////////////

  /**
   * Click on an attribute cell to start editing
   */
  async clickAttributeCell(
    page: Page,
    dimensionId: string,
    ownerId: string
  ): Promise<void> {
    const cell = this.getAttributeCell(page, dimensionId, ownerId);
    await cell.click();
  }

  /**
   * Fill a text attribute field and confirm
   */
  async fillAttributeTextField(
    page: Page,
    dimensionId: string,
    ownerId: string,
    value: string
  ): Promise<void> {
    const textField = this.getAttributeTextField(page, dimensionId, ownerId);
    await textField.fill(value);
  }

  /**
   * Fill a number attribute field and confirm
   */
  async fillAttributeNumberField(
    page: Page,
    dimensionId: string,
    ownerId: string,
    value: string
  ): Promise<void> {
    const numberField = this.getAttributeNumberField(
      page,
      dimensionId,
      ownerId
    );
    await numberField.fill(value);
  }

  /**
   * Toggle an attribute checkbox
   */
  async toggleAttributeCheckbox(
    page: Page,
    dimensionId: string,
    ownerId: string
  ): Promise<void> {
    const checkbox = this.getAttributeCheckbox(page, dimensionId, ownerId);
    await checkbox.click();
  }

  /**
   * Confirm attribute edit by pressing Enter
   */
  async confirmAttributeEditWithEnter(
    page: Page,
    dimensionId: string,
    ownerId: string
  ): Promise<void> {
    const cell = this.getAttributeCell(page, dimensionId, ownerId);
    await cell.press("Enter");
  }

  /**
   * Cancel attribute edit by pressing Escape
   */
  async cancelAttributeEditWithEscape(
    page: Page,
    dimensionId: string,
    ownerId: string
  ): Promise<void> {
    const cell = this.getAttributeCell(page, dimensionId, ownerId);
    await cell.press("Escape");
  }

  /**
   * Confirm attribute edit by clicking away
   */
  async confirmAttributeEditByClickingAway(page: Page): Promise<void> {
    // Click on a safe area that doesn't interfere with the test
    await page.mouse.click(100, 100);
  }

  /**
   * Wait for attribute cell to show specific value
   */
  async waitForAttributeValue(
    page: Page,
    dimensionId: string,
    ownerId: string,
    expectedValue: string
  ): Promise<void> {
    const cell = this.getAttributeCell(page, dimensionId, ownerId);
    await page.waitForFunction(
      (args) => {
        const cell = document.querySelector(
          `[data-testid="attribute-cell-${args.ownerId}-${args.dimensionId}"]`
        );
        const textContent = cell?.textContent;
        return textContent ? textContent.trim() === args.expectedValue : false;
      },
      { ownerId, dimensionId, expectedValue },
      { timeout: 5000 }
    );
  }

  /**
   * Open the dim entries popup for an attribute
   */
  async openAttributeDimEntriesPopup(
    page: Page,
    dimensionId: string,
    ownerId: string
  ): Promise<void> {
    const cell = this.getAttributeCell(page, dimensionId, ownerId);
    await cell.click();

    // Wait for popup to appear
    const popup = this.getAttributeDimEntriesPopup(page, dimensionId, ownerId);
    await popup.waitFor({ state: "visible" });
  }

  /**
   * Close the dim entries popup by clicking away
   */
  async closeAttributeDimEntriesPopup(page: Page): Promise<void> {
    // Click on a safe area that doesn't interfere with the test
    await page.mouse.click(100, 100);
  }

  /**
   * Select a dim entry option in the attribute popup
   */
  async selectAttributeDimEntry(
    page: Page,
    dimensionId: string,
    ownerId: string,
    dimEntryId: string
  ): Promise<void> {
    const option = this.getAttributeDimEntryOption(
      page,
      dimensionId,
      ownerId,
      dimEntryId
    );
    await option.click();
  }

  /**
   * Remove a selected dim entry from the attribute
   */
  async removeAttributeDimEntry(
    page: Page,
    dimensionId: string,
    ownerId: string,
    dimEntryId: string
  ): Promise<void> {
    const removeButton = this.getAttributeRemoveDimEntryButton(
      page,
      dimensionId,
      ownerId,
      dimEntryId
    );
    await removeButton.click();
  }

  /**
   * Filter dim entries by typing in the search input
   */
  async filterAttributeDimEntries(
    page: Page,
    dimensionId: string,
    ownerId: string,
    searchTerm: string
  ): Promise<void> {
    const searchInput = this.getAttributeDimEntriesSearchInput(
      page,
      dimensionId,
      ownerId
    );
    await searchInput.fill(searchTerm);
  }
}
