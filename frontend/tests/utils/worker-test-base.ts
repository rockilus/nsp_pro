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
   * Navigates to the workers page for the test team
   * This should be called in beforeEach for consistent navigation
   */
  async navigateToWorkersPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    // Step 1: Navigate to teams page
    await page.goto(`${testConfig.frontendUrl}/en/plan/settings/teams/`);
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

    // Step 2: Wait for our test team to appear in the UI
    const teamElement = page.getByText(this.testTeam.name, { exact: true });
    await expect(teamElement).toBeVisible();

    // Step 3: Click on the team name to select it (this navigates to schedule page)
    await Promise.all([
      page.waitForURL(`${testConfig.frontendUrl}/en/plan/schedule/`),
      teamElement.click(),
    ]);

    // Wait a bit for the team context to be fully set
    await page.waitForTimeout(1000);

    // Step 4: Look for Workers link in navigation - try multiple strategies
    // First, let's check if any navigation links are visible at all
    const navContainer = page.locator(".nav-links-container");
    await expect(navContainer).toBeVisible();

    // Try to find the Workers link by text
    const workersLink = page.getByText("Workers").first();
    await expect(workersLink).toBeVisible();
    await workersLink.click();

    // Wait for navigation to workers page
    await page.waitForURL(`${testConfig.frontendUrl}/en/plan/workers/`);

    // Wait for the workers page to be loaded
    await expect(page.getByRole("heading", { name: "Workers" })).toBeVisible();
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
