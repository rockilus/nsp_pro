/**
 * Export Test Base Utilities
 *
 * This module provides utilities for E2E testing of the export functionality.
 * It includes methods to:
 * - Navigate to schedule pages with test data
 * - Interact with export dialog
 * - Verify download behavior
 */

import { Page, expect, Download } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import { ShiftType } from "../../src/types/shift";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const testConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8000",
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
};

export class ExportTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup export tests environment
   * Creates a test team, workers, shifts, and assignments for export testing
   */
  async setupExportTests(workerIndex: number): Promise<void> {
    await this.dbUtils.waitForApiReady();

    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error("Test utilities not available");
    }

    // Create test team with unique name
    const uniqueTeamName = `Export Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(`✅ Created test team: ${this.testTeam.name}`);

    // Create test workers
    await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: "Test Worker 1",
      acronym: "TW1",
      weeklyHours: 40,
    });

    await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: "Test Worker 2",
      acronym: "TW2",
      weeklyHours: 40,
    });

    // Create test shifts
    const startTime = dayjs.utc().hour(9).minute(0).second(0);
    const endTime = dayjs.utc().hour(17).minute(0).second(0);

    await this.dbUtils.createShift({
      teamId: this.testTeam.teamId,
      name: "Morning Shift",
      startTime: startTime,
      endTime: endTime,
      shiftType: ShiftType.DUTY,
      acronym: "MS",
      color: "#4CAF50",
    });

    console.log(`✅ Created test workers and shifts`);

    // Create a campaign schedule to make the export button visible
    const today = new Date();
    const campaignStartDate = new Date(today);
    campaignStartDate.setDate(today.getDate() - 7);
    const campaignEndDate = new Date(today);
    campaignEndDate.setDate(today.getDate() + 7);

    await this.createCampaignSchedule(
      campaignStartDate.toISOString().split("T")[0],
      campaignEndDate.toISOString().split("T")[0]
    );

    console.log(`✅ Created campaign schedule for export testing`);
  }

  /**
   * Navigate to schedule page for the test team
   */
  async navigateToSchedulePage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupExportTests first.");
    }

    // Navigate to schedule page FIRST to establish proper origin
    await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);
    await page.waitForLoadState("domcontentloaded");

    // Now set selected team in localStorage (after page has valid origin)
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam.teamId);

    // Reload to apply localStorage changes
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Wait for the schedule page to fully load
    // We need to wait for the table structure to be rendered
    // The export button appears in the table header
    await page.waitForSelector("table", { timeout: 10000 }).catch(() => {
      console.log("⚠️ Schedule table not found - page may still be loading");
    });

    console.log(
      `✅ Navigated to schedule page for team: ${this.testTeam.name}`
    );
  }

  /**
   * Create a campaign schedule for testing
   */
  async createCampaignSchedule(
    startDate: string,
    endDate: string
  ): Promise<{ scheduleId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    console.log(`📅 Creating campaign schedule: ${startDate} to ${endDate}`);

    const result = await this.dbUtils.makeAuthenticatedRequest<{ id: string }>(
      "POST",
      `/schedules/teams/${this.testTeam.teamId}`,
      {
        startDate: startDate,
        endDate: endDate,
        status: "CAMPAIGN",
      }
    );

    console.log(`✅ Created campaign schedule: ${result.id}`);

    return { scheduleId: result.id };
  }

  //////////////////////////
  // UI Interaction Methods
  //////////////////////////

  /**
   * Gets the export button
   */
  getExportButton(page: Page) {
    return page.locator('[data-testid="export-button"]');
  }

  /**
   * Gets the export dialog
   */
  getExportDialog(page: Page) {
    return page.locator('[data-testid="export-dialog"]');
  }

  /**
   * Gets the dialog close button
   */
  getDialogCloseButton(page: Page) {
    return page.locator('[data-testid="export-dialog-close-button"]');
  }

  /**
   * Gets the period toggle group
   */
  getPeriodToggleGroup(page: Page) {
    return page.locator('[data-testid="export-period-toggle-group"]');
  }

  /**
   * Gets a specific period option button by value (0=Current Selection, 1=Campaign, 2=All, 3=Custom)
   */
  getPeriodOptionButton(page: Page, optionValue: number) {
    return page.locator(`[data-testid="export-period-option-${optionValue}"]`);
  }

  /**
   * Gets the start date picker input
   */
  getStartDatePicker(page: Page) {
    return page.locator('[data-testid="export-start-date-picker"]');
  }

  /**
   * Gets the end date picker input
   */
  getEndDatePicker(page: Page) {
    return page.locator('[data-testid="export-end-date-picker"]');
  }

  /**
   * Gets the confirm export button
   */
  getConfirmExportButton(page: Page) {
    return page.locator('[data-testid="confirm-export-button"]');
  }

  /**
   * Opens the export dialog
   */
  async openExportDialog(page: Page): Promise<void> {
    const exportButton = this.getExportButton(page);
    await exportButton.waitFor({ state: "visible", timeout: 10000 });
    await exportButton.click();

    const dialog = this.getExportDialog(page);
    await dialog.waitFor({ state: "visible", timeout: 5000 });
  }

  /**
   * Closes the export dialog via close button
   */
  async closeExportDialog(page: Page): Promise<void> {
    const closeButton = this.getDialogCloseButton(page);
    await closeButton.click();

    const dialog = this.getExportDialog(page);
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  }

  /**
   * Selects a period option
   */
  async selectPeriodOption(page: Page, optionValue: number): Promise<void> {
    const optionButton = this.getPeriodOptionButton(page, optionValue);
    await optionButton.click();
    // Wait a bit for state to update
    await page.waitForTimeout(200);
  }

  /**
   * Checks if date pickers are disabled
   */
  async areDatePickersDisabled(page: Page): Promise<boolean> {
    const startDatePicker = this.getStartDatePicker(page);
    const endDatePicker = this.getEndDatePicker(page);

    const startDisabled = await startDatePicker.isDisabled();
    const endDisabled = await endDatePicker.isDisabled();

    return startDisabled && endDisabled;
  }

  /**
   * Checks if date pickers are enabled
   */
  async areDatePickersEnabled(page: Page): Promise<boolean> {
    const startDatePicker = this.getStartDatePicker(page);
    const endDatePicker = this.getEndDatePicker(page);

    const startEnabled = !(await startDatePicker.isDisabled());
    const endEnabled = !(await endDatePicker.isDisabled());

    return startEnabled && endEnabled;
  }

  /**
   * Clicks confirm export and waits for download
   */
  async confirmExportAndWaitForDownload(page: Page): Promise<Download> {
    const confirmButton = this.getConfirmExportButton(page);

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });

    await confirmButton.click();

    // Wait for the download to start
    const download = await downloadPromise;

    return download;
  }

  /**
   * Verifies that a download is an Excel file
   */
  async verifyExcelDownload(download: Download): Promise<void> {
    const suggestedFilename = download.suggestedFilename();

    // Check that the filename ends with .xlsx
    expect(suggestedFilename).toMatch(/\.xlsx$/);

    console.log(`✅ Download verified: ${suggestedFilename}`);
  }
}
