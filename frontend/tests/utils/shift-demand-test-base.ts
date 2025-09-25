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
      page.locator('[data-testid="shift-demand-grid"]')
    ).toBeVisible();
    console.log("✅ Navigated to shift demands page");
  }

  /**
   * Gets the period navigation component locators
   */
  getPeriodNav(page: Page) {
    return {
      todayButton: page.locator('[data-testid="period-nav-today"]'),
      previousButton: page.locator('[data-testid="period-nav-previous"]'),
      nextButton: page.locator('[data-testid="period-nav-next"]'),
      label: page.locator('[data-testid="period-nav-label"]'),
      select: page.locator('[data-testid="period-nav-select"]'),
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
}
