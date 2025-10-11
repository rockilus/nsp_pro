/**
 * Shared base functionality for Shift Demand E2E tests
 */

import { Page, expect } from "@playwright/test";
import { testConfig } from "./test-config";
import { DatabaseTestUtils } from "./database-utils";
import dayjs from "dayjs";
import { ShiftType, ShiftRestType } from "../../src/types/shift";

export class ShiftDemandTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs common setup for shift demand tests:
   * - Resets relevant database collections
   * - Creates a test team
   */
  async setupShiftDemandTests(): Promise<void> {
    console.log("🚀 Setting up shift demand tests...");
    // Create a test team
    this.testTeam = await this.dbUtils.createTeam({
      name: "Shift Demand Test Team",
    });
    if (this.testTeam) {
      console.log(`✅ Test team created: ${this.testTeam.name}`);

      // Create shifts for the tests
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
      console.log("✅ Created 4 test shifts");
    }
  }

  /**
   * Navigates to the shift demands page for the test team
   */
  async navigateToShiftDemandsPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupShiftDemandTests first."
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
    await expect(
      page.locator('[data-testid="shift-demand-tab"]')
    ).toBeVisible();
    console.log("✅ Navigated to shift demands page");
  }

  /**
   * Gets the period navigation component locators
   */
  getPeriodNav(page: Page) {
    return {
      todayButton: page.locator('[data-testid="time-nav-today"]'),
      previousButton: page.locator('[data-testid="time-nav-previous"]'),
      nextButton: page.locator('[data-testid="time-nav-next"]'),
      label: page.locator('[data-testid="time-nav-label"]'),
      select: page.locator('[data-testid="time-nav-select"]'),
    };
  }

  /**
   * Gets the table header cell for a specific date.
   * @param page The Playwright page object.
   * @param date The date in 'YYYY-MM-DD' format.
   */
  getDateHeader(page: Page, date: string) {
    return page.locator(`[data-testid="date-header-${date}"]`);
  }

  /**
   * Gets the select button in the ShiftDemandToolbar
   */
  getSelectButton(page: Page) {
    return page.locator('[data-testid="shift-demand-select-button"]');
  }

  /**
   * Gets the ShiftDemandActionToolbar (visible when in bulk mode)
   */
  getActionToolbar(page: Page) {
    return page.locator('[data-testid="shift-demand-action-toolbar"]');
  }

  /**
   * Gets bulk selection elements
   */
  getBulkSelectionElements(page: Page) {
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
      deleteConfirmButton: page.locator(
        '[data-testid="bulk-selection-delete-confirm-button"]'
      ),
    };
  }

  /**
   * Gets selection checkboxes
   */
  getSelectionCheckboxes(page: Page) {
    return {
      selectAll: page.locator('[data-testid="select-all-checkbox"] input'),
      rowSelect: (shiftId: string) =>
        page.locator(`[data-testid="row-select-checkbox-${shiftId}"] input`),
      columnSelect: (date: string) =>
        page.locator(`[data-testid="column-select-checkbox-${date}"] input`),
      cellSelect: (shiftId: string, date: string) =>
        page.locator(
          `[data-testid="cell-select-checkbox-${shiftId}-${date}"] input`
        ),
    };
  }

  /**
   * Creates shift demands via API for testing
   */
  async createShiftDemandViaAPI(
    shiftId: string,
    date: string,
    count: number
  ): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupShiftDemandTests first."
      );
    }

    await this.dbUtils.createShiftDemand({
      teamId: this.testTeam.teamId,
      shiftId,
      date: new Date(date),
      count,
    });
  }

  /**
   * Gets shift IDs for testing (assumes setupShiftDemandTests was called)
   */
  async getTestShiftIds(): Promise<string[]> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not created. Call setupShiftDemandTests first."
      );
    }

    // In a real implementation, we would fetch shift IDs from the API or database
    // For now, we'll return mock IDs that correspond to the shifts created in setupShiftDemandTests
    return ["shift1", "shift2", "shift3", "shift4"];
  }
}
