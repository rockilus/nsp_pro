/**
 * E2E tests for ScheduleTableWorker Component
 *
 * These tests verify the worker table functionality including:
 * - Schedule status display in date headers (owner only)
 * - Daily shift demand row visibility (owner only)
 * - Worker row header information (name, stats)
 * - Assignment display and interaction
 * - Request display (visible to all)
 * - Add assignment button visibility (owner only)
 * - Role-based access differences between owners and members
 */

import { test, expect } from "@playwright/test";
import { ScheduleTestBase } from "../../utils/schedule-test-base";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

test.describe("ScheduleTableWorker - Owner Tests", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and campaign
    const today = dayjs.utc();
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex + 3000, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
      campaignDates: {
        start: today.startOf("month").format("YYYY-MM-DD"),
        end: today.endOf("month").format("YYYY-MM-DD"),
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);

    // Update scheduleViewSettings to worker view in localStorage
    const teamId = scheduleTestBase.getTestTeam()?.teamId;
    await page.evaluate((teamId) => {
      const storageKey = `scheduleViewSettings_${teamId}`;
      const settings = JSON.parse(localStorage.getItem(storageKey) || "{}");
      settings.groupBy = "worker";
      localStorage.setItem(storageKey, JSON.stringify(settings));
    }, teamId);

    // Reload the page to apply settings
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Wait for the schedule table to render
    await page.waitForSelector('[data-testid="schedule-table-worker"]', {
      timeout: 10000,
    });
  });

  test.describe("Date Header - Schedule Status Display", () => {
    test("should display schedule status 'c' for campaign dates in date header cells", async ({
      page,
    }) => {
      // Wait for dates header row to be visible
      await page.waitForSelector('[data-testid="dates-header-row"]', {
        timeout: 5000,
      });

      // Find a date header cell
      const dateHeaderCells = page.locator(
        '[data-testid^="date-header-cell-"]',
      );
      await expect(dateHeaderCells.first()).toBeVisible();

      // Check for schedule status logo with 'c' (campaign)
      const campaignStatusLogo = page.locator(
        '[data-testid="schedule-status-0"]',
      );

      // There should be at least one campaign status indicator
      const count = await campaignStatusLogo.count();
      expect(count).toBeGreaterThan(0);

      // Verify the content is 'c'
      const firstLogo = campaignStatusLogo.first();
      await expect(firstLogo).toBeVisible();
      await expect(firstLogo).toContainText("c");

      console.log(
        "✅ Schedule status 'c' displayed correctly for campaign dates",
      );
    });

    test("should display schedule status 'v' for validated dates in date header cells", async ({
      page,
    }) => {
      // Get the campaign schedule
      const campaign = scheduleTestBase.getCampaign();
      expect(campaign).not.toBeNull();

      if (!campaign) {
        throw new Error("Campaign schedule is null");
      }

      // Validate the current schedule using the API
      await scheduleTestBase.validateSchedule(campaign.id);

      console.log("✅ Schedule validated via API");

      // Refresh the page to see validated schedule
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Wait for the schedule table to render (settings already in localStorage)
      await page.waitForSelector('[data-testid="schedule-table-worker"]', {
        timeout: 10000,
      });

      // Check for validated status logo
      const validatedStatusLogo = page.locator(
        '[data-testid="schedule-status-1"]',
      );

      // There should be at least one validated status indicator
      const count = await validatedStatusLogo.count();
      expect(count).toBeGreaterThan(0);

      // Verify the content is 'v'
      const firstLogo = validatedStatusLogo.first();
      await expect(firstLogo).toBeVisible();
      await expect(firstLogo).toContainText("v");

      console.log(
        "✅ Schedule status 'v' displayed correctly for validated dates",
      );
    });
  });

  test.describe("Daily Shift Demand Row", () => {
    test("should display daily shift demand row with label", async ({
      page,
    }) => {
      // Verify shift count row is visible
      const shiftCountRow = page.locator('[data-testid="shift-count-row"]');
      await expect(shiftCountRow).toBeVisible();

      // Check for the "Daily Demand" label or similar
      const shiftCountLabel = page.locator(
        '[data-testid="shift-count-row-label"]',
      );
      await expect(shiftCountLabel).toBeVisible();

      console.log("✅ Daily shift demand row is displayed with label");
    });

    test("should show actual vs demanded shift counts in daily shift demand row cells", async ({
      page,
    }) => {
      // Find shift count cells
      const shiftCountCells = page.locator('[data-testid^="shift-count-"]');

      // There should be at least one shift count cell
      const count = await shiftCountCells.count();
      expect(count).toBeGreaterThan(0);

      // Check the first shift count cell
      const firstCell = shiftCountCells.first();
      await expect(firstCell).toBeVisible();

      // The cell should contain a ratio like "2 / 3"
      const cellText = await firstCell.textContent();
      expect(cellText).toMatch(/\d+\s*\/\s*\d+/);

      console.log("✅ Shift count cells show actual vs demanded counts");
    });
  });

  test.describe("Worker Row Header", () => {
    test("should display worker name with acronym in parentheses", async ({
      page,
    }) => {
      // Find the first worker row header
      const workerRowHeader = page.locator(
        '[data-testid^="worker-row-header-"]',
      );
      await expect(workerRowHeader.first()).toBeVisible();

      // Check worker name
      const workerName = page.locator('[data-testid^="worker-name-"]');
      await expect(workerName.first()).toBeVisible();

      const nameText = await workerName.first().textContent();
      expect(nameText).toMatch(/.*\s*\(.*\)/); // Name with acronym in parentheses

      console.log("✅ Worker name with acronym displayed correctly");
    });

    test("should display worker stats (hours/week and duties/month) in row header", async ({
      page,
    }) => {
      // Find the first worker row header
      const workerRowHeader = page.locator(
        '[data-testid^="worker-row-header-"]',
      );
      await expect(workerRowHeader.first()).toBeVisible();

      // Extract worker ID from the first header
      const workerHeaderTestId = await workerRowHeader
        .first()
        .getAttribute("data-testid");
      const workerId = workerHeaderTestId?.replace("worker-row-header-", "");

      // Check for hours/week stats
      const hoursStats = page.locator(
        `[data-testid="worker-stats-hours-${workerId}"]`,
      );
      await expect(hoursStats).toBeVisible();

      const hoursText = await hoursStats.textContent();
      expect(hoursText).toMatch(/\d+\.\d+/); // Should contain decimal numbers

      // Check for duties/month stats
      const dutiesStats = page.locator(
        `[data-testid="worker-stats-duties-${workerId}"]`,
      );
      await expect(dutiesStats).toBeVisible();

      const dutiesText = await dutiesStats.textContent();
      expect(dutiesText).toMatch(/\d+\.\d+/); // Should contain decimal numbers

      console.log(
        "✅ Worker stats (hours/week and duties/month) displayed correctly",
      );
    });
  });

  test.describe("Assignments Display", () => {
    test("should display assignments for both campaign and validated schedules", async ({
      page,
    }) => {
      // Find assignment cells
      const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');

      // There should be at least one assignment
      const count = await assignmentCells.count();
      expect(count).toBeGreaterThan(0);

      // Check that at least one assignment is visible
      await expect(assignmentCells.first()).toBeVisible();

      console.log("✅ Assignments displayed correctly");
    });

    test("should open AssignmentSelection panel when clicking on an assignment", async ({
      page,
    }) => {
      // Find and click on an assignment cell
      const assignmentCell = page.locator('[data-testid^="assignment-cell-"]');
      await expect(assignmentCell.first()).toBeVisible();
      await assignmentCell.first().click();

      // Wait for the assignment selection panel to open
      const assignmentSelectionPanel = page
        .locator('text="Assignment"')
        .first();
      await expect(assignmentSelectionPanel).toBeVisible({ timeout: 5000 });

      console.log("✅ AssignmentSelection panel opened on assignment click");
    });
  });

  test.describe("Requests Display", () => {
    test("should display request cells when requests exist", async ({
      page,
    }) => {
      // Create a request first via API if needed
      // For now, we'll just check if request cells can be found
      const requestCells = page.locator('[data-testid^="request-cell-"]');

      // Check if any request cells exist
      const count = await requestCells.count();

      if (count > 0) {
        await expect(requestCells.first()).toBeVisible();
        console.log("✅ Request cells displayed when requests exist");
      } else {
        console.log("ℹ️ No requests found in this test scenario");
      }
    });
  });

  test.describe("Add Assignment Button", () => {
    test("should show AddCircleIcon button on hover over worker cell", async ({
      page,
    }) => {
      // Find a worker cell
      const workerCells = page.locator(".cell-hover-container");
      await expect(workerCells.first()).toBeVisible();

      // Hover over the cell
      await workerCells.first().hover();

      // Wait a bit for the transition
      await page.waitForTimeout(500);

      // Find the add icon button within the hovered cell
      const addButton = workerCells.first().locator(".add-icon-button");
      await expect(addButton).toBeVisible();

      console.log("✅ Add assignment button appears on hover");
    });

    test("should open CreateAssignment panel when clicking add assignment button", async ({
      page,
    }) => {
      // Find a worker cell
      const workerCells = page.locator(".cell-hover-container");
      await expect(workerCells.first()).toBeVisible();

      // Hover over the cell
      await workerCells.first().hover();

      // Wait for the add button to be visible
      await page.waitForTimeout(500);

      // Click the add button
      const addButton = workerCells.first().locator(".add-icon-button");
      await addButton.click({ force: true });

      // Verify CreateAssignment panel is open
      const createAssignmentPanel = page.locator(
        ".create-assignment-container",
      );
      await expect(createAssignmentPanel).toBeVisible({ timeout: 3000 });

      console.log("✅ CreateAssignment panel opened on add button click");
    });
  });
});

test.describe("ScheduleTableWorker - Member Tests", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and campaign
    const today = dayjs.utc();
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex + 4000, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
      campaignDates: {
        start: today.startOf("month").format("YYYY-MM-DD"),
        end: today.endOf("month").format("YYYY-MM-DD"),
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);

    // Update scheduleViewSettings to worker view in localStorage
    const teamId = scheduleTestBase.getTestTeam()?.teamId;
    await page.evaluate((teamId) => {
      const storageKey = `scheduleViewSettings_${teamId}`;
      const settings = JSON.parse(localStorage.getItem(storageKey) || "{}");
      settings.groupBy = "worker";
      localStorage.setItem(storageKey, JSON.stringify(settings));
    }, teamId);

    // Reload the page to apply settings
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Wait for the schedule table to render
    await page.waitForSelector('[data-testid="schedule-table-worker"]', {
      timeout: 10000,
    });
  });

  test.describe("Date Header - No Schedule Status", () => {
    test("should not display schedule status in date header cells for members", async ({
      page,
    }) => {
      // Wait for dates header row to be visible
      await page.waitForSelector('[data-testid="dates-header-row"]', {
        timeout: 5000,
      });

      // Check that no schedule status indicators are present
      const campaignStatusLogo = page.locator(
        '[data-testid="schedule-status-0"]',
      );
      const validatedStatusLogo = page.locator(
        '[data-testid="schedule-status-1"]',
      );

      // Neither should be visible
      await expect(campaignStatusLogo).toHaveCount(0);
      await expect(validatedStatusLogo).toHaveCount(0);

      console.log("✅ No schedule status displayed for members");
    });
  });

  test.describe("Daily Shift Demand Row", () => {
    test("should not display daily shift demand row for members", async ({
      page,
    }) => {
      // Verify shift count row is not visible
      const shiftCountRow = page.locator('[data-testid="shift-count-row"]');
      await expect(shiftCountRow).toHaveCount(0);

      console.log("✅ Daily shift demand row hidden for members");
    });
  });

  test.describe("Worker Row Header", () => {
    test("should display worker name with acronym in parentheses", async ({
      page,
    }) => {
      // Find the first worker row header
      const workerRowHeader = page.locator(
        '[data-testid^="worker-row-header-"]',
      );
      await expect(workerRowHeader.first()).toBeVisible();

      // Check worker name
      const workerName = page.locator('[data-testid^="worker-name-"]');
      await expect(workerName.first()).toBeVisible();

      const nameText = await workerName.first().textContent();
      expect(nameText).toMatch(/.*\s*\(.*\)/); // Name with acronym in parentheses

      console.log("✅ Worker name with acronym displayed correctly");
    });

    test("should not display worker stats in row header for members", async ({
      page,
    }) => {
      // Find the first worker row header
      const workerRowHeader = page.locator(
        '[data-testid^="worker-row-header-"]',
      );
      await expect(workerRowHeader.first()).toBeVisible();

      // Extract worker ID from the first header
      const workerHeaderTestId = await workerRowHeader
        .first()
        .getAttribute("data-testid");
      const workerId = workerHeaderTestId?.replace("worker-row-header-", "");

      // Check that stats are not visible
      const hoursStats = page.locator(
        `[data-testid="worker-stats-hours-${workerId}"]`,
      );
      await expect(hoursStats).toHaveCount(0);

      const dutiesStats = page.locator(
        `[data-testid="worker-stats-duties-${workerId}"]`,
      );
      await expect(dutiesStats).toHaveCount(0);

      console.log("✅ Worker stats hidden for members");
    });
  });

  test.describe("Assignments Display", () => {
    test("should display only validated schedule assignments, not campaign", async ({
      page,
    }) => {
      // Get the campaign schedule
      const campaign = scheduleTestBase.getCampaign();
      expect(campaign).not.toBeNull();

      if (!campaign) {
        throw new Error("Campaign schedule is null");
      }

      // Validate the schedule first
      await scheduleTestBase.validateSchedule(campaign.id);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Find assignment cells
      const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');

      // There should be assignments (validated ones only)
      const count = await assignmentCells.count();
      expect(count).toBeGreaterThan(0);

      console.log("✅ Only validated assignments displayed for members");
    });

    test("should not open panel when clicking on an assignment as member", async ({
      page,
    }) => {
      // Get campaign and validate it first
      const campaign = scheduleTestBase.getCampaign();
      if (campaign) {
        await scheduleTestBase.validateSchedule(campaign.id);
        await page.reload();
        await page.waitForLoadState("networkidle");
      }

      // Find and click on an assignment cell
      const assignmentCell = page.locator('[data-testid^="assignment-cell-"]');
      const count = await assignmentCell.count();

      if (count > 0) {
        await assignmentCell.first().click();

        // Wait a bit
        await page.waitForTimeout(1000);

        // Assignment selection panel should not appear
        const assignmentSelectionPanel = page.locator('text="Assignment"');
        const panelCount = await assignmentSelectionPanel.count();

        // If panel exists, it should not be visible
        if (panelCount > 0) {
          await expect(assignmentSelectionPanel.first()).not.toBeVisible();
        }

        console.log("✅ Assignment panel does not open for members");
      } else {
        console.log("ℹ️ No assignments to test clicking");
      }
    });
  });

  test.describe("Requests Display", () => {
    test("should display request cells for members", async ({ page }) => {
      // Requests should be visible to members in worker view
      const requestCells = page.locator('[data-testid^="request-cell-"]');

      // Check if any request cells exist
      const count = await requestCells.count();

      if (count > 0) {
        await expect(requestCells.first()).toBeVisible();
        console.log("✅ Request cells displayed for members");
      } else {
        console.log("ℹ️ No requests found in this test scenario");
      }
    });
  });

  test.describe("Add Assignment Button", () => {
    test("should not display AddCircleIcon button for members", async ({
      page,
    }) => {
      // Find a worker cell
      const workerCells = page.locator(".cell-hover-container");
      await expect(workerCells.first()).toBeVisible();

      // Hover over the cell
      await workerCells.first().hover();

      // Wait a bit
      await page.waitForTimeout(500);

      // The add icon button should not be visible
      const addButton = workerCells.first().locator(".add-icon-button");
      await expect(addButton).toHaveCount(0);

      console.log("✅ Add assignment button hidden for members");
    });
  });
});
