/**
 * Shared base functionality for worker E2E tests
 *
 * This module provides common setup and navigation utilities for worker tests,
 * reducing duplication across multiple worker test files.
 */

import { Page, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import { testConfig } from "./test-config";
import { SpecialtyT } from "../../src/types/specialty";

export class WorkerTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs the common setup for worker tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Resets worker-related database collections
   * - Creates a test team
   */
  async setupWorkerTests(workerIndex: number): Promise<void> {
    // Ensure the API is ready before running tests
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error(
        "Test utilities are not available - check environment configuration"
      );
    }

    // Create a test team for worker tests
    const uniqueTeamName = `Worker Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`
    );
  }

  /**
   * Sets the selected team directly in localStorage and navigates to workers page
   * This bypasses the UI navigation for faster test execution
   */
  async navigateToWorkersPageDirect(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    // Navigate to the application first to establish a valid document context
    await page.goto(`${testConfig.frontendUrl}/en/plan/workers/`);

    // Wait for initial page load
    // await page.waitForLoadState("domcontentloaded");

    // Now set the selected team in localStorage with proper document context
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam.teamId);

    // Reload the page to apply the localStorage changes
    await page.reload();

    // Wait for the page to load and the team context to initialize
    await page.waitForLoadState("networkidle");
    // await page.waitForLoadState("domcontentloaded");

    // Verify we're on the workers page and the correct team is selected
    await expect(
      page.locator('[data-testid="workers-page-heading"]')
    ).toBeVisible();

    // Brief wait to ensure team context has fully initialized
    // and no redirect to teams page occurs
    // await page.waitForTimeout(500);

    const currentUrl = page.url();
    if (currentUrl.includes("/plan/settings/teams")) {
      throw new Error(
        "Navigation failed: redirected to teams page. Team context may not have initialized properly."
      );
    }
  }

  /**
   * Navigates to the workers page via UI flow (original method)
   * Use this when you need to test the full navigation flow
   */
  async navigateToWorkersPageViaUI(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    // Step 1: Navigate to teams page
    await page.goto(`${testConfig.frontendUrl}/en/plan/settings/teams/`);
    await expect(
      page.locator('[data-testid="teams-page-heading"]')
    ).toBeVisible();

    await page.waitForLoadState("networkidle");

    // Step 2: Wait for our test team to appear in the UI using team ID
    const teamElement = page.locator(
      `[data-testid="team-name-${this.testTeam.teamId}"]`
    );
    await expect(teamElement).toBeVisible();

    // Step 3: Click on the team name to select it (this navigates to schedule page)
    await Promise.all([
      page.waitForURL(`${testConfig.frontendUrl}/en/plan/schedule/`),
      teamElement.click(),
    ]);

    // Wait for client-side navigation to finish and network to be idle
    // This prevents a detached main frame (NS_BINDING_ABORTED) when calling goto
    await page.waitForLoadState("networkidle");

    // Step 4: Navigate to workers page by clicking the workers link in NavLinks
    const workersLink = page.locator('[data-testid="nav-link-workers"]');
    await Promise.all([
      page.waitForURL(`${testConfig.frontendUrl}/en/plan/workers/`),
      workersLink.click(),
    ]);

    // Wait for all content on the workers page to be loaded
    // Wait for network to be idle to ensure all API calls are complete
    await page.waitForLoadState("networkidle");

    // Wait for DOM content to be fully loaded
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator('[data-testid="workers-page-heading"]')
    ).toBeVisible();
  }

  /**
   * Navigates to the workers page for the test team
   * This should be called in beforeEach for consistent navigation
   * Uses direct navigation for faster test execution
   */
  async navigateToWorkersPage(page: Page): Promise<void> {
    return this.navigateToWorkersPageDirect(page);
    // return this.navigateToWorkersPageViaUI(page);
  }

  /**
   * Creates a test worker using the API
   */
  async createTestWorker(workerData: {
    name: string;
    acronym?: string;
    weeklyHours?: number;
    weeklyHoursDesired?: number;
    dutiesPerMonth?: number;
    annualLeave?: number;
  }): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: workerData.name,
      acronym: workerData.acronym,
      weeklyHours: workerData.weeklyHours,
      weeklyHoursDesired: workerData.weeklyHoursDesired,
      dutiesPerMonth: workerData.dutiesPerMonth,
      annualLeave: workerData.annualLeave,
    });
  }

  /**
   * Updates a test worker using the API
   */
  async updateTestWorker(
    workerId: string,
    updates: {
      name?: string;
      acronym?: string;
      weeklyHours?: number;
      weeklyHoursDesired?: number;
      dutiesPerMonth?: number;
      annualLeave?: number;
      specialtyIds?: string[];
    }
  ): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.updateWorker(workerId, this.testTeam.teamId, updates);
  }

  /**
   * Updates a test worker's name specifically (convenience method)
   */
  async updateTestWorkerName(
    workerId: string,
    newName: string
  ): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.updateWorkerName(
      workerId,
      this.testTeam.teamId,
      newName
    );
  }

  /**
   * Deletes a test worker using the API
   */
  async deleteTestWorker(workerId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.deleteWorker(workerId, this.testTeam.teamId);
  }

  /**
   * Creates a worker via the UI by clicking the +Worker button
   */
  async createWorkerViaUI(page: Page): Promise<void> {
    const addWorkerButton = page.getByRole("button", {
      name: "Worker",
      exact: true,
    });
    await expect(addWorkerButton).toBeEnabled();
    await addWorkerButton.click();

    // Wait for the worker to appear in the table
    await page.waitForSelector('[aria-label="worker table"]');
    const workerRows = page.locator('[aria-label="worker table"] tbody tr');
    await expect(workerRows).toHaveCount(1);
  }

  /**
   * Gets the worker table element
   */
  getWorkerTable(page: Page) {
    return page.locator('[aria-label="worker table"]');
  }

  /**
   * Gets all worker rows from the table
   */
  getWorkerRows(page: Page) {
    return this.getWorkerTable(page).locator("tbody tr");
  }

  /**
   * Gets a specific worker row by index (0-based)
   */
  getWorkerRow(page: Page, index: number = 0) {
    return this.getWorkerRows(page).nth(index);
  }

  /**
   * Gets the name cell for a worker row
   */
  getWorkerNameCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    const byCellTestId = row.locator('[data-testid="worker-name-cell"]');
    const byDisplayTestId = row.locator(
      '[data-testid^="worker-name-display-"]'
    );
    const byInputTestId = row.locator('[data-testid^="worker-name-input-"]');
    const firstCell = row.locator("td, th").first();

    // Return a locator that resolves to whichever exists first
    return byCellTestId.or(byDisplayTestId).or(byInputTestId).or(firstCell);
  }

  /**
   * Gets the acronym cell for a worker row
   */
  getWorkerAcronymCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    // Prioritize the table cell itself for interaction, not the inner elements
    const byCellTestId = row.locator('[data-testid="worker-acronym-cell"]');
    const secondCell = row.locator("td, th").nth(1);

    return byCellTestId.or(secondCell);
  }

  /**
   * Gets the acronym display element (for reading text)
   */
  getWorkerAcronymDisplay(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-acronym-display-"]');
  }

  /**
   * Gets the acronym input element (for editing)
   */
  getWorkerAcronymInput(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-acronym-input-"]');
  }

  /**
   * Gets the employment start date cell for a worker row
   */
  getWorkerEmploymentStartCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    // Prioritize the table cell itself for interaction
    const byCellTestId = row.locator(
      '[data-testid="worker-employment-start-cell"]'
    );
    // Fallback to finding by column position if data-testid is not available
    const byColumnPosition = row.locator("td, th").nth(2); // Assuming employment start is 3rd column

    return byCellTestId.or(byColumnPosition);
  }

  /**
   * Gets the employment start date display element (for reading text)
   */
  getWorkerEmploymentStartDisplay(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-employment-start-display-"]');
  }

  /**
   * Gets the employment start date input element (for editing)
   */
  getWorkerEmploymentStartInput(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-employment-start-input-"]');
  }

  /**
   * Gets the employment end date cell for a worker row
   */
  getWorkerEmploymentEndCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    // Prioritize the table cell itself for interaction
    const byCellTestId = row.locator(
      '[data-testid="worker-employment-end-cell"]'
    );
    // Fallback to finding by column position if data-testid is not available
    const byColumnPosition = row.locator("td, th").nth(3); // Assuming employment end is 4th column

    return byCellTestId.or(byColumnPosition);
  }

  /**
   * Gets the employment end date display element (for reading text)
   */
  getWorkerEmploymentEndDisplay(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-employment-end-display-"]');
  }

  /**
   * Gets the employment end date editor (editing container)
   */
  getWorkerEmploymentEndEditor(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-employment-end-editor-"]');
  }

  /**
   * Gets the employment end date picker element (for editing)
   */
  getWorkerEmploymentEndDatePicker(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-employment-end-datepicker-"]');
  }

  /**
   * Gets the employment end date picker input element (for editing)
   */
  getWorkerEmploymentEndDatePickerInput(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator(
      '[data-testid^="worker-employment-end-datepicker-input-"]'
    );
  }

  /**
   * Gets the employment end date permanent checkbox element
   */
  getWorkerEmploymentEndPermanentCheckbox(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator(
      '[data-testid^="worker-employment-end-permanent-checkbox-input-"]'
    );
  }

  /**
   * Gets the employment end date permanent checkbox label element
   */
  getWorkerEmploymentEndPermanentCheckboxLabel(
    page: Page,
    rowIndex: number = 0
  ) {
    const row = this.getWorkerRow(page, rowIndex);
    // Look for the label specifically, excluding the input
    return row.locator(
      '[data-testid^="worker-employment-end-permanent-checkbox-"]:not([data-testid*="-input-"])'
    );
  }

  /**
   * Gets the weekly hours cell for a worker row
   */
  getWorkerWeeklyHoursCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    // Prioritize the table cell itself for interaction
    const byCellTestId = row.locator(
      '[data-testid="worker-weekly-hours-cell"]'
    );
    // Fallback to finding by column position - weeklyHours is the 6th column (index 5)
    // Column order: name(0), acronym(1), employmentStart(2), employmentEnd(3), specialties(4), weeklyHours(5)
    const byColumnPosition = row.locator("td, th").nth(5);

    return byCellTestId.or(byColumnPosition);
  }

  /**
   * Gets the weekly hours display element (for reading text)
   */
  getWorkerWeeklyHoursDisplay(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-weekly-hours-display-"]');
  }

  /**
   * Gets the weekly hours input element (for editing)
   */
  getWorkerWeeklyHoursInput(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-weekly-hours-input-"]');
  }

  /**
   * Gets the weekly hours desired cell for a worker row
   */
  getWorkerWeeklyHoursDesiredCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    // Prioritize the table cell itself for interaction
    const byCellTestId = row.locator(
      '[data-testid="worker-weekly-hours-desired-cell"]'
    );
    // Fallback to finding by column position - weeklyHoursDesired is the 7th column (index 6)
    // Column order: name(0), acronym(1), employmentStart(2), employmentEnd(3), specialties(4), weeklyHours(5), weeklyHoursDesired(6)
    const byColumnPosition = row.locator("td, th").nth(6);

    return byCellTestId.or(byColumnPosition);
  }

  /**
   * Gets the weekly hours desired display element (for reading text)
   */
  getWorkerWeeklyHoursDesiredDisplay(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-weekly-hours-desired-display-"]');
  }

  /**
   * Gets the weekly hours desired input element (for editing)
   */
  getWorkerWeeklyHoursDesiredInput(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-weekly-hours-desired-input-"]');
  }

  /**
   * Gets the duties per month cell for a worker row
   */
  getWorkerDutiesPerMonthCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    // Prioritize the table cell itself for interaction
    const byCellTestId = row.locator(
      '[data-testid="worker-duties-per-month-cell"]'
    );
    // Fallback to finding by column position if data-testid is not available
    const byColumnPosition = row.locator("td, th").nth(7); // Assuming duties per month is 8th column

    return byCellTestId.or(byColumnPosition);
  }

  /**
   * Gets the duties per month display element (for reading text)
   */
  getWorkerDutiesPerMonthDisplay(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-duties-per-month-display-"]');
  }

  /**
   * Gets the duties per month input element (for editing)
   */
  getWorkerDutiesPerMonthInput(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-duties-per-month-input-"]');
  }

  /**
   * Gets the annual leave cell for a worker row
   */
  getWorkerAnnualLeaveCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);

    // Prioritize the table cell itself for interaction
    const byCellTestId = row.locator(
      '[data-testid="worker-annual-leave-cell"]'
    );
    // Fallback to finding by column position if data-testid is not available
    const byColumnPosition = row.locator("td, th").nth(8); // Assuming annual leave is 9th column

    return byCellTestId.or(byColumnPosition);
  }

  /**
   * Gets the annual leave display element (for reading text)
   */
  getWorkerAnnualLeaveDisplay(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-annual-leave-display-"]');
  }

  /**
   * Gets the annual leave input element (for editing)
   */
  getWorkerAnnualLeaveInput(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-annual-leave-input-"]');
  }

  /**
   * Waits for the annual leave update to complete
   */
  async waitForAnnualLeaveUpdateComplete(
    page: Page,
    expectedValue: string,
    rowIndex: number = 0
  ) {
    const display = this.getWorkerAnnualLeaveDisplay(page, rowIndex);
    const input = this.getWorkerAnnualLeaveInput(page, rowIndex);

    // Wait for edit mode to end (input should be hidden)
    await expect(input).not.toBeVisible();

    // Wait for display mode to be active
    await expect(display).toBeVisible();

    // Wait for the display to show the expected value
    await expect(display).toContainText(expectedValue);
  }

  /**
   * Waits for annual leave edit mode to be active
   */
  async waitForAnnualLeaveEditMode(page: Page, rowIndex: number = 0) {
    const input = this.getWorkerAnnualLeaveInput(page, rowIndex);
    const display = this.getWorkerAnnualLeaveDisplay(page, rowIndex);

    // Wait for input to be visible and display to be hidden
    await expect(input).toBeVisible();
    await expect(display).not.toBeVisible();
  }

  /**
   * Waits for annual leave display mode to be active
   */
  async waitForAnnualLeaveDisplayMode(page: Page, rowIndex: number = 0) {
    const input = this.getWorkerAnnualLeaveInput(page, rowIndex);
    const display = this.getWorkerAnnualLeaveDisplay(page, rowIndex);

    // Wait for display to be visible and input to be hidden
    await expect(display).toBeVisible();
    await expect(input).not.toBeVisible();
  }

  /**
   * Gets the delete button for a worker row
   */
  getWorkerDeleteButton(page: Page, workerId: string) {
    return page.locator(`[data-testid="worker-delete-button-${workerId}"]`);
  }

  /**
   * Gets the delete button for a worker row by index
   */
  getWorkerDeleteButtonByIndex(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid^="worker-delete-button-"]');
  }

  /**
   * Gets the actions cell for a worker row
   */
  getWorkerActionsCell(page: Page, rowIndex: number = 0) {
    const row = this.getWorkerRow(page, rowIndex);
    return row.locator('[data-testid="worker-actions-cell"]');
  }

  /**
   * Gets the Add Worker button
   */
  getAddWorkerButton(page: Page) {
    return page.locator('[data-testid="add-worker-button"]');
  }

  /**
   * Deletes a worker via the UI by clicking the delete button
   */
  async deleteWorkerViaUI(page: Page, workerId: string): Promise<void> {
    const deleteButton = this.getWorkerDeleteButton(page, workerId);
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
  }

  /**
   * Deletes a worker via the UI and waits for the deletion to complete
   * This replaces the need for setTimeout by waiting for observable DOM changes
   */
  async deleteWorkerViaUIAndWait(page: Page, workerId: string): Promise<void> {
    const initialCount = await this.getWorkerRows(page).count();

    // Click the delete button
    const deleteButton = this.getWorkerDeleteButton(page, workerId);
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for the specific worker row to be removed from DOM
    await expect(
      page.locator(`[data-testid="worker-row-${workerId}"]`)
    ).not.toBeVisible({ timeout: 1000 });

    // Wait for the table to reflect the correct state
    if (initialCount === 1) {
      // Last worker being deleted - wait for empty state
      await expect(page.locator("text=no_workers_found")).toBeVisible({
        timeout: 1000,
      });
    } else {
      // Wait for row count to decrease
      await expect(this.getWorkerRows(page)).toHaveCount(initialCount - 1, {
        timeout: 1000,
      });
    }
  }

  /**
   * Deletes a worker via the UI by clicking the delete button at specific row index
   */
  async deleteWorkerViaUIByIndex(
    page: Page,
    rowIndex: number = 0
  ): Promise<void> {
    const deleteButton = this.getWorkerDeleteButtonByIndex(page, rowIndex);
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
  }

  /**
   * Waits for a worker to be removed from the table
   */
  async waitForWorkerRemoval(page: Page, workerId: string): Promise<void> {
    const deleteButton = this.getWorkerDeleteButton(page, workerId);
    await expect(deleteButton).not.toBeVisible();
  }

  /**
   * Gets team information
   */
  getTestTeam(): { teamId: string; name: string } | null {
    return this.testTeam;
  }

  //////////////////////////
  // Specialty Methods
  //////////////////////////

  /**
   * Creates a test specialty using the API
   */
  async createTestSpecialty(specialtyData: {
    name: string;
  }): Promise<{ specialtyId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.createSpecialty({
      teamId: this.testTeam.teamId,
      name: specialtyData.name,
    });
  }

  /**
   * Updates a test specialty using the API
   */
  async updateTestSpecialty(
    specialtyId: string,
    updates: {
      name?: string;
    }
  ): Promise<{ specialtyId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.updateSpecialty(
      specialtyId,
      this.testTeam.teamId,
      updates
    );
  }

  /**
   * Deletes a test specialty using the API
   */
  async deleteTestSpecialty(specialtyId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.deleteSpecialty(specialtyId, this.testTeam.teamId);
  }

  /**
   * Gets all specialties for the test team using the API
   */
  async getTestSpecialties(): Promise<SpecialtyT[]> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.getSpecialties(this.testTeam.teamId);
  }
}
