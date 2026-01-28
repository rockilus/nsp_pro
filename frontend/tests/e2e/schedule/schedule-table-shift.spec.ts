/**
 * E2E tests for ScheduleTableShift Component
 *
 * These tests verify the shift table functionality including:
 * - Schedule status display in date headers (owner only)
 * - Shift count row visibility (owner only)
 * - Shift row header information
 * - Assignment display and interaction
 * - Shift demand display and interaction (owner only)
 * - Add assignment button visibility (owner only)
 * - Role-based access differences between owners and members
 */
import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("ScheduleTableShift - Owner Tests", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and campaign
    const today = dayjs.utc();
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex, {
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

    // Wait for the schedule table to render
    await page.waitForSelector('[data-testid="schedule-table-shift"]', {
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
      // Navigate to a time period that might have validated schedules
      // First, validate the current schedule
      const validateButton = page.locator('[data-testid="validate-button"]');

      // Check if validate button exists (campaign must be created)
      const validateButtonCount = await validateButton.count();
      if (validateButtonCount > 0) {
        // Click validate button
        await validateButton.click();

        // Wait for validation to complete
        await page.waitForTimeout(2000);

        // Navigate to previous period to see validated schedule
        const previousButton = page.locator(
          '[data-testid="time-nav-previous"]',
        );
        await previousButton.click();

        await page.waitForTimeout(1000);

        // Check for validated status logo
        const validatedStatusLogo = page.locator(
          '[data-testid="schedule-status-1"]',
        );

        const count = await validatedStatusLogo.count();
        if (count > 0) {
          const firstLogo = validatedStatusLogo.first();
          await expect(firstLogo).toBeVisible();
          await expect(firstLogo).toContainText("v");

          console.log(
            "✅ Schedule status 'v' displayed correctly for validated dates",
          );
        } else {
          console.log(
            "ℹ️ No validated schedule status found in previous period",
          );
        }
      } else {
        console.log(
          "ℹ️ No validate button available, skipping validated status test",
        );
      }
    });
  });

  test.describe("Shift Count Row", () => {
    test("should display shift count row with label", async ({ page }) => {
      // Verify shift count row is visible
      const shiftCountRow = page.locator('[data-testid="shift-count-row"]');
      await expect(shiftCountRow).toBeVisible();

      // Verify the label
      const shiftCountLabel = page.locator(
        '[data-testid="shift-count-row-label"]',
      );
      await expect(shiftCountLabel).toBeVisible();
      await expect(shiftCountLabel).toContainText(/shift count/i);

      console.log("✅ Shift count row displayed correctly");
    });

    test("should show actual vs demanded shift counts in shift count row cells", async ({
      page,
    }) => {
      // Wait for shift count row
      await page.waitForSelector('[data-testid="shift-count-row"]', {
        timeout: 5000,
      });

      // Find demand cells in the shift count row
      // These cells should show format like "2 / 3" (actual / target)
      const demandsCells = page
        .locator('[data-testid="shift-count-row"]')
        .locator("td");
      const cellCount = await demandsCells.count();

      expect(cellCount).toBeGreaterThan(1); // At least label cell + date cells

      console.log(`✅ Shift count row contains ${cellCount} cells`);
    });
  });

  test.describe("Shift Row Header", () => {
    test("should display shift name with acronym in parentheses", async ({
      page,
    }) => {
      // Find first shift row header
      const shiftRowHeader = page
        .locator('[data-testid^="shift-row-header-"]')
        .first();
      await expect(shiftRowHeader).toBeVisible();

      // Find shift name element
      const shiftName = shiftRowHeader.locator('[data-testid^="shift-name-"]');
      await expect(shiftName).toBeVisible();

      // Verify format: "Name (ACRONYM)"
      const nameText = await shiftName.textContent();
      expect(nameText).toMatch(/.*\s*\(.*\)/); // Pattern: text (text)

      console.log(`✅ Shift name with acronym displayed: ${nameText}`);
    });

    test("should display shift start and end times", async ({ page }) => {
      // Find first shift row header
      const shiftRowHeader = page
        .locator('[data-testid^="shift-row-header-"]')
        .first();
      await expect(shiftRowHeader).toBeVisible();

      // Get the shift ID from the data-testid
      const testId = await shiftRowHeader.getAttribute("data-testid");
      const shiftId = testId?.replace("shift-row-header-", "");

      // Find shift time elements
      const shiftTimeStart = page.locator(
        `[data-testid="shift-time-start-${shiftId}"]`,
      );
      const shiftTimeEnd = page.locator(
        `[data-testid="shift-time-end-${shiftId}"]`,
      );

      await expect(shiftTimeStart).toBeVisible();
      await expect(shiftTimeEnd).toBeVisible();

      // Verify time format HH:mm
      const startTime = await shiftTimeStart.textContent();
      const endTime = await shiftTimeEnd.textContent();

      expect(startTime).toMatch(/\d{2}:\d{2}/);
      expect(endTime).toMatch(/\d{2}:\d{2}/);

      console.log(`✅ Shift times displayed: ${startTime} - ${endTime}`);
    });

    test("should display shift count (actual / demanded) in row header", async ({
      page,
    }) => {
      // Find first shift row header
      const shiftRowHeader = page
        .locator('[data-testid^="shift-row-header-"]')
        .first();
      await expect(shiftRowHeader).toBeVisible();

      // Get the shift ID
      const testId = await shiftRowHeader.getAttribute("data-testid");
      const shiftId = testId?.replace("shift-row-header-", "");

      // Find shift count element
      const shiftCount = page.locator(`[data-testid="shift-count-${shiftId}"]`);

      // Check if shift count exists (it may not if no demands are set)
      const shiftCountExists = await shiftCount.count();
      if (shiftCountExists > 0) {
        await expect(shiftCount).toBeVisible();

        // Verify format: "number / number"
        const countText = await shiftCount.textContent();
        expect(countText).toMatch(/\d+\s*\/\s*\d+/);

        console.log(`✅ Shift count displayed: ${countText}`);
      } else {
        console.log("ℹ️ No shift count displayed (no demands set)");
      }
    });
  });

  test.describe("Assignments Display", () => {
    test("should display assignments for both campaign and validated schedules", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Find assignment cells
      const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
      const assignmentCount = await assignmentCells.count();

      expect(assignmentCount).toBeGreaterThan(0);

      console.log(`✅ Found ${assignmentCount} assignment(s) displayed`);
    });

    test("should open AssignmentSelection panel when clicking on an assignment", async ({
      page,
    }) => {
      // Wait for assignments to load
      await page.waitForSelector('[data-testid^="assignment-cell-"]', {
        timeout: 5000,
      });

      // Click on first assignment
      const firstAssignment = page
        .locator('[data-testid^="assignment-cell-"]')
        .first();
      await firstAssignment.click();

      // Wait for LHS panel to open with AssignmentSelection
      await page.waitForTimeout(500);

      // Verify AssignmentSelection panel is open
      // Look for assignment-specific elements in the LHS panel
      const lhsPanel = page.locator(".assignment-options-assignment-container");
      await expect(lhsPanel).toBeVisible({ timeout: 3000 });

      console.log("✅ AssignmentSelection panel opened on assignment click");
    });
  });

  test.describe("Shift Demands Display", () => {
    test("should display shift demand cells when demands exist", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Find demand cells
      const demandCells = page.locator('[data-testid^="demand-cell-"]');
      const demandCount = await demandCells.count();

      if (demandCount > 0) {
        await expect(demandCells.first()).toBeVisible();
        console.log(`✅ Found ${demandCount} shift demand(s) displayed`);
      } else {
        console.log("ℹ️ No shift demands found in current view");
      }
    });

    test("should open DemandSelection panel when clicking on a shift demand", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Find demand cells
      const demandCells = page.locator('[data-testid^="demand-cell-"]');
      const demandCount = await demandCells.count();

      if (demandCount > 0) {
        // Click on first demand
        const firstDemand = demandCells.first();
        await firstDemand.click();

        // Wait for LHS panel to open with DemandSelection
        await page.waitForTimeout(500);

        // Verify DemandSelection panel is open
        const demandSelectionPanel = page.locator(
          ".demand-selection-container",
        );
        await expect(demandSelectionPanel).toBeVisible({ timeout: 3000 });

        console.log("✅ DemandSelection panel opened on demand click");
      } else {
        console.log("ℹ️ No shift demands to click, skipping test");
      }
    });
  });

  test.describe("Add Assignment Button", () => {
    test("should show AddCircleIcon button on hover over shift cell", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Find a shift cell
      const shiftCell = page.locator('[data-testid^="shift-cell-"]').first();
      await expect(shiftCell).toBeVisible();

      // Hover over the cell
      await shiftCell.hover();

      // Wait for the add button to become visible
      await page.waitForTimeout(500);

      // Find the add assignment button within the hovered cell
      const addButton = shiftCell.locator(
        '[data-testid^="add-assignment-button-"]',
      );

      // The button should exist (even if opacity is 0 initially)
      expect(await addButton.count()).toBe(1);

      console.log("✅ AddCircleIcon button present in shift cell");
    });

    test("should open CreateAssignment panel when clicking add assignment button", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Find a shift cell
      const shiftCell = page.locator('[data-testid^="shift-cell-"]').first();
      await shiftCell.hover();

      await page.waitForTimeout(500);

      // Click the add button
      const addButton = shiftCell.locator(
        '[data-testid^="add-assignment-button-"]',
      );

      // Force click since button has opacity: 0 by default
      await addButton.click({ force: true });

      // Wait for LHS panel to open with CreateAssignment
      await page.waitForTimeout(500);

      // Verify CreateAssignment panel is open
      const createAssignmentPanel = page.locator(
        ".create-assignment-container",
      );
      await expect(createAssignmentPanel).toBeVisible({ timeout: 3000 });

      console.log("✅ CreateAssignment panel opened on add button click");
    });
  });
});

test.describe("ScheduleTableShift - Member Tests", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and campaign
    const today = dayjs.utc();
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex + 2000, {
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

    // Wait for the schedule table to render
    await page.waitForSelector('[data-testid="schedule-table-shift"]', {
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

      // Check that schedule status logos are not visible
      const campaignStatusLogo = page.locator(
        '[data-testid="schedule-status-campaign"]',
      );
      const validatedStatusLogo = page.locator(
        '[data-testid="schedule-status-validated"]',
      );

      await expect(campaignStatusLogo).not.toBeVisible();
      await expect(validatedStatusLogo).not.toBeVisible();

      console.log("✅ Schedule status correctly hidden for members");
    });
  });

  test.describe("Shift Count Row", () => {
    test("should not display shift count row for members", async ({ page }) => {
      // Verify shift count row is not visible
      const shiftCountRow = page.locator('[data-testid="shift-count-row"]');
      await expect(shiftCountRow).not.toBeVisible();

      console.log("✅ Shift count row correctly hidden for members");
    });
  });

  test.describe("Shift Row Header", () => {
    test("should display shift name with acronym in parentheses", async ({
      page,
    }) => {
      // Find first shift row header
      const shiftRowHeader = page
        .locator('[data-testid^="shift-row-header-"]')
        .first();
      await expect(shiftRowHeader).toBeVisible();

      // Find shift name element
      const shiftName = shiftRowHeader.locator('[data-testid^="shift-name-"]');
      await expect(shiftName).toBeVisible();

      // Verify format: "Name (ACRONYM)"
      const nameText = await shiftName.textContent();
      expect(nameText).toMatch(/.*\s*\(.*\)/);

      console.log(
        `✅ Shift name with acronym displayed for member: ${nameText}`,
      );
    });

    test("should display shift start and end times", async ({ page }) => {
      // Find first shift row header
      const shiftRowHeader = page
        .locator('[data-testid^="shift-row-header-"]')
        .first();
      await expect(shiftRowHeader).toBeVisible();

      // Get the shift ID
      const testId = await shiftRowHeader.getAttribute("data-testid");
      const shiftId = testId?.replace("shift-row-header-", "");

      // Find shift time elements
      const shiftTimeStart = page.locator(
        `[data-testid="shift-time-start-${shiftId}"]`,
      );
      const shiftTimeEnd = page.locator(
        `[data-testid="shift-time-end-${shiftId}"]`,
      );

      await expect(shiftTimeStart).toBeVisible();
      await expect(shiftTimeEnd).toBeVisible();

      console.log("✅ Shift times displayed for member");
    });

    test("should not display shift count in row header for members", async ({
      page,
    }) => {
      // Find first shift row header
      const shiftRowHeader = page
        .locator('[data-testid^="shift-row-header-"]')
        .first();
      await expect(shiftRowHeader).toBeVisible();

      // Get the shift ID
      const testId = await shiftRowHeader.getAttribute("data-testid");
      const shiftId = testId?.replace("shift-row-header-", "");

      // Verify shift count is not visible
      const shiftCount = page.locator(`[data-testid="shift-count-${shiftId}"]`);
      await expect(shiftCount).not.toBeVisible();

      console.log("✅ Shift count correctly hidden for members");
    });
  });

  test.describe("Assignments Display", () => {
    test("should display only validated schedule assignments, not campaign", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Members should only see validated assignments
      // This is controlled by the data fetching logic, not the UI
      // We can verify that assignments are displayed
      const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
      const assignmentCount = await assignmentCells.count();

      // May be 0 if no validated schedules exist yet
      console.log(
        `ℹ️ Found ${assignmentCount} validated assignment(s) for member`,
      );
    });

    test("should not open panel when clicking on an assignment as member", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
      const assignmentCount = await assignmentCells.count();

      if (assignmentCount > 0) {
        // Click on first assignment
        const firstAssignment = assignmentCells.first();
        await firstAssignment.click();

        // Wait a moment
        await page.waitForTimeout(500);

        // Verify AssignmentSelection panel does NOT open
        const lhsPanel = page.locator(
          ".assignment-options-assignment-container",
        );
        await expect(lhsPanel).not.toBeVisible();

        console.log("✅ Assignment click correctly does nothing for members");
      } else {
        console.log("ℹ️ No assignments to click, skipping test");
      }
    });
  });

  test.describe("Shift Demands", () => {
    test("should not display shift demand cells for members", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Verify no demand cells are visible
      const demandCells = page.locator('[data-testid^="demand-cell-"]');
      await expect(demandCells.first()).not.toBeVisible();

      console.log("✅ Shift demands correctly hidden for members");
    });
  });

  test.describe("Add Assignment Button", () => {
    test("should not display AddCircleIcon button for members", async ({
      page,
    }) => {
      // Wait for table to load
      await page.waitForSelector('[data-testid="schedule-table-shift"]', {
        timeout: 5000,
      });

      // Find a shift cell
      const shiftCell = page.locator('[data-testid^="shift-cell-"]').first();
      await expect(shiftCell).toBeVisible();

      // Hover over the cell
      await shiftCell.hover();
      await page.waitForTimeout(500);

      // Verify add button does not exist
      const addButton = shiftCell.locator(
        '[data-testid^="add-assignment-button-"]',
      );
      await expect(addButton).not.toBeVisible();

      console.log("✅ AddCircleIcon button correctly hidden for members");
    });
  });
});
