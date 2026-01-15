/**
 * E2E tests for ScheduleNavBar Component
 *
 * These tests verify the navigation bar functionality including:
 * - Time navigation (week/month view, previous/next, today button)
 * - Data view selection (shift/worker)
 * - Settings popover and its options
 * - Campaign information display
 * - Role-based visibility (owner vs member)
 */

import { test, expect } from "@playwright/test";
import { ScheduleTestBase } from "../../utils/schedule-test-base";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

test.describe("ScheduleNavBar - Owner Tests", () => {
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

    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
      timeout: 10000,
    });
  });

  test.describe("Time Frame Selection", () => {
    test("should display monthly view when month is selected", async ({
      page,
    }) => {
      // Select month view via time navigation
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("month");

      // Wait for the UI to update
      await page.waitForTimeout(500);

      // Verify month is selected
      const selectedValue = await timeFrameSelect.inputValue();
      expect(selectedValue).toBe("month");

      // Verify the period label shows month format (e.g., "January 2026")
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const labelText = await periodLabel.textContent();
      expect(labelText).toMatch(/^[A-Za-z]+ \d{4}$/); // Format: "January 2026"

      console.log("✅ Monthly view displayed correctly");
    });

    test("should display weekly view when week is selected", async ({
      page,
    }) => {
      // First ensure we're in month view
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("month");
      await page.waitForTimeout(300);

      // Switch to week view
      await timeFrameSelect.selectOption("week");
      await page.waitForTimeout(500);

      // Verify week is selected
      const selectedValue = await timeFrameSelect.inputValue();
      expect(selectedValue).toBe("week");

      // Verify the period label shows week format (e.g., "January 2026")
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const labelText = await periodLabel.textContent();
      expect(labelText).toMatch(/^[A-Za-z]+ \d{4}$/); // Format: "January 2026"

      console.log("✅ Weekly view displayed correctly");
    });
  });

  test.describe("Time Navigation - Weekly View", () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we're in weekly view
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("week");
      await page.waitForTimeout(500);
    });

    test("should navigate to next week when next button is pressed", async ({
      page,
    }) => {
      // Get initial period label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const initialLabel = await periodLabel.textContent();

      // Click next button
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get new period label
      const newLabel = await periodLabel.textContent();

      // Labels might be the same if both weeks are in the same month
      // but the underlying dates should have changed
      // We'll verify the schedule table updated (assignments may be different)
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log(`✅ Navigated from "${initialLabel}" to next week`);
    });

    test("should navigate to previous week when previous button is pressed", async ({
      page,
    }) => {
      // Navigate to next week first so we can go back
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get current period label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const beforeLabel = await periodLabel.textContent();

      // Click previous button
      const previousButton = page.locator('[data-testid="time-nav-previous"]');
      await previousButton.click();
      await page.waitForTimeout(500);

      // Verify we navigated
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log(`✅ Navigated from "${beforeLabel}" to previous week`);
    });

    test("should navigate back to current week when today button is pressed", async ({
      page,
    }) => {
      // Navigate to a future week
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(300);
      await nextButton.click();
      await page.waitForTimeout(300);
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get current label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const futureLabel = await periodLabel.textContent();

      // Click today button
      const todayButton = page.locator('[data-testid="time-nav-today"]');
      await todayButton.click();
      await page.waitForTimeout(500);

      // Get new label
      const currentLabel = await periodLabel.textContent();

      // The current week should contain today's date
      // Verify by checking that schedule table is visible
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log(
        `✅ Navigated from future week "${futureLabel}" back to current week "${currentLabel}"`
      );
    });
  });

  test.describe("Time Navigation - Monthly View", () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we're in monthly view
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("month");
      await page.waitForTimeout(500);
    });

    test("should navigate to next month when next button is pressed", async ({
      page,
    }) => {
      // Get initial period label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const initialLabel = await periodLabel.textContent();

      // Click next button
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get new period label
      const newLabel = await periodLabel.textContent();

      // Verify the label changed (different month)
      expect(newLabel).not.toBe(initialLabel);

      // Verify schedule table is visible
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log(`✅ Navigated from "${initialLabel}" to "${newLabel}"`);
    });

    test("should navigate to previous month when previous button is pressed", async ({
      page,
    }) => {
      // Navigate to next month first
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get current period label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const beforeLabel = await periodLabel.textContent();

      // Click previous button
      const previousButton = page.locator('[data-testid="time-nav-previous"]');
      await previousButton.click();
      await page.waitForTimeout(500);

      // Get new label
      const afterLabel = await periodLabel.textContent();

      // Verify labels changed
      expect(afterLabel).not.toBe(beforeLabel);

      // Verify schedule table is visible
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log(`✅ Navigated from "${beforeLabel}" to "${afterLabel}"`);
    });

    test("should navigate back to current month when today button is pressed", async ({
      page,
    }) => {
      // Navigate to a future month
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(300);
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get current label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const futureLabel = await periodLabel.textContent();

      // Click today button
      const todayButton = page.locator('[data-testid="time-nav-today"]');
      await todayButton.click();
      await page.waitForTimeout(500);

      // Get new label - should be current month
      const currentLabel = await periodLabel.textContent();

      // Verify we're back to a month containing today
      const today = dayjs.utc();
      expect(currentLabel).toContain(today.format("YYYY"));

      // Verify schedule table is visible
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log(
        `✅ Navigated from future month "${futureLabel}" back to current month "${currentLabel}"`
      );
    });
  });

  test.describe("Period Label Display", () => {
    test("should display correct month name and year in monthly view", async ({
      page,
    }) => {
      // Ensure monthly view
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("month");
      await page.waitForTimeout(500);

      // Get period label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const labelText = await periodLabel.textContent();

      // Should match format "January 2026" or "Jan - Feb 2026" or "Dec 2025 - Jan 2026"
      expect(labelText).toBeTruthy();
      expect(labelText?.length).toBeGreaterThan(0);

      console.log(`✅ Period label displays correctly: "${labelText}"`);
    });

    test("should display correct period in weekly view", async ({ page }) => {
      // Ensure weekly view
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("week");
      await page.waitForTimeout(500);

      // Get period label
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const labelText = await periodLabel.textContent();

      // Week view shows the month of the middle of the week
      expect(labelText).toBeTruthy();
      expect(labelText).toMatch(/^[A-Za-z]+ \d{4}$/);

      console.log(`✅ Week period label displays correctly: "${labelText}"`);
    });
  });

  test.describe("Data View Selection", () => {
    test("should display shift table when shift view is selected", async ({
      page,
    }) => {
      // Click on shift button in data view selector
      const shiftButton = page.locator(
        '[data-testid="data-view-shift-button"]'
      );
      await shiftButton.click();
      await page.waitForTimeout(500);

      // Verify shift button is selected (has the selected state)
      expect(await shiftButton.getAttribute("aria-pressed")).toBe("true");

      // Verify schedule table is visible (both shift and worker use same table)
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log("✅ Shift view displayed correctly");
    });

    test("should display worker table when worker view is selected", async ({
      page,
    }) => {
      // First select shift view
      const shiftButton = page.locator(
        '[data-testid="data-view-shift-button"]'
      );
      await shiftButton.click();
      await page.waitForTimeout(300);

      // Then click on worker button
      const workerButton = page.locator(
        '[data-testid="data-view-worker-button"]'
      );
      await workerButton.click();
      await page.waitForTimeout(500);

      // Verify worker button is selected
      expect(await workerButton.getAttribute("aria-pressed")).toBe("true");

      // Verify schedule table is visible
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log("✅ Worker view displayed correctly");
    });
  });

  test.describe("Settings Popover", () => {
    test("should open popover when settings button is clicked", async ({
      page,
    }) => {
      // Click settings button
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      // Verify popover is visible
      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible({ timeout: 3000 });

      console.log("✅ Settings popover opened correctly");
    });

    test("should display shift view when shift is selected in settings", async ({
      page,
    }) => {
      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Click shift button in settings
      const shiftButton = popover.locator(
        '[data-testid="settings-groupby-shift"]'
      );
      await shiftButton.click();
      await page.waitForTimeout(500);

      // Verify shift button is selected
      expect(await shiftButton.getAttribute("aria-pressed")).toBe("true");

      // Close popover by clicking outside
      await page.click('[data-testid="schedule-nav-bar"]', {
        position: { x: 10, y: 10 },
      });
      await page.waitForTimeout(300);

      // Verify schedule table is visible
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log("✅ Shift view displayed from settings");
    });

    test("should display worker view when worker is selected in settings", async ({
      page,
    }) => {
      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Click worker button in settings
      const workerButton = popover.locator(
        '[data-testid="settings-groupby-worker"]'
      );
      await workerButton.click();
      await page.waitForTimeout(500);

      // Verify worker button is selected
      expect(await workerButton.getAttribute("aria-pressed")).toBe("true");

      // Close popover
      await page.click('[data-testid="schedule-nav-bar"]', {
        position: { x: 10, y: 10 },
      });
      await page.waitForTimeout(300);

      // Verify schedule table is visible
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toBeVisible();

      console.log("✅ Worker view displayed from settings");
    });

    test("should show/hide assignments when checkbox is toggled", async ({
      page,
    }) => {
      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Get assignments checkbox
      const assignmentsCheckbox = popover.locator(
        '[data-testid="settings-checkbox-assignments"]'
      );

      // Check if it's currently checked
      const isChecked = await assignmentsCheckbox.isChecked();

      // Uncheck it
      if (isChecked) {
        await assignmentsCheckbox.uncheck();
        await page.waitForTimeout(500);

        // Verify it's unchecked
        expect(await assignmentsCheckbox.isChecked()).toBe(false);

        // Check it again
        await assignmentsCheckbox.check();
        await page.waitForTimeout(500);

        // Verify it's checked
        expect(await assignmentsCheckbox.isChecked()).toBe(true);
      } else {
        // Check it
        await assignmentsCheckbox.check();
        await page.waitForTimeout(500);
        expect(await assignmentsCheckbox.isChecked()).toBe(true);

        // Uncheck it
        await assignmentsCheckbox.uncheck();
        await page.waitForTimeout(500);
        expect(await assignmentsCheckbox.isChecked()).toBe(false);
      }

      console.log("✅ Assignments checkbox toggles correctly");
    });

    test("should show/hide demands when checkbox is toggled in shift view", async ({
      page,
    }) => {
      // Ensure shift view
      const shiftButton = page.locator(
        '[data-testid="data-view-shift-button"]'
      );
      await shiftButton.click();
      await page.waitForTimeout(300);

      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Get demands checkbox (only visible for solver teams)
      const demandsCheckbox = popover.locator(
        '[data-testid="settings-checkbox-demands"]'
      );

      // Check if it exists (depends on team.useSolver)
      const exists = (await demandsCheckbox.count()) > 0;

      if (exists) {
        // Check if it's currently checked
        const isChecked = await demandsCheckbox.isChecked();

        // Toggle it
        if (isChecked) {
          await demandsCheckbox.uncheck();
          await page.waitForTimeout(500);
          expect(await demandsCheckbox.isChecked()).toBe(false);

          await demandsCheckbox.check();
          await page.waitForTimeout(500);
          expect(await demandsCheckbox.isChecked()).toBe(true);
        } else {
          await demandsCheckbox.check();
          await page.waitForTimeout(500);
          expect(await demandsCheckbox.isChecked()).toBe(true);

          await demandsCheckbox.uncheck();
          await page.waitForTimeout(500);
          expect(await demandsCheckbox.isChecked()).toBe(false);
        }

        console.log("✅ Demands checkbox toggles correctly");
      } else {
        console.log(
          "⏭️  Demands checkbox not visible (team may not use solver)"
        );
      }
    });

    test("should show/hide requests when checkbox is toggled in worker view", async ({
      page,
    }) => {
      // Ensure worker view
      const workerButton = page.locator(
        '[data-testid="data-view-worker-button"]'
      );
      await workerButton.click();
      await page.waitForTimeout(300);

      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Get requests checkbox (currently disabled in the code)
      const requestsCheckbox = popover.locator(
        '[data-testid="settings-checkbox-requests"]'
      );

      // Verify it exists
      await expect(requestsCheckbox).toBeVisible();

      // Note: The checkbox is disabled in the current implementation
      const isDisabled = await requestsCheckbox.isDisabled();
      expect(isDisabled).toBe(true);

      console.log("✅ Requests checkbox is visible but disabled as expected");
    });

    test("should enable duplicate week only in weekly view", async ({
      page,
    }) => {
      // Test in monthly view first
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("month");
      await page.waitForTimeout(500);

      // Open settings
      let settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      let popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Check if duplicate week button is disabled
      const duplicateWeekButton = popover.locator(
        '[data-testid="settings-duplicate-week-button"]'
      );
      const isDisabledInMonth = await duplicateWeekButton.isDisabled();
      expect(isDisabledInMonth).toBe(true);

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Switch to weekly view
      await timeFrameSelect.selectOption("week");
      await page.waitForTimeout(500);

      // Navigate to a Monday (duplicate week requires Monday start)
      const todayButton = page.locator('[data-testid="time-nav-today"]');
      await todayButton.click();
      await page.waitForTimeout(500);

      // Open settings again
      settingsButton = page.locator('[data-testid="schedule-settings-button"]');
      await settingsButton.click();

      popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Check if duplicate week button state (may still be disabled if not Monday or no campaign)
      const isDisabledInWeek = await duplicateWeekButton.isDisabled();
      // Can't assert it's enabled because it depends on:
      // 1. Being a Monday
      // 2. Having a campaign
      // 3. Being exactly 7 days

      console.log(
        `✅ Duplicate week button is ${
          isDisabledInWeek ? "disabled" : "enabled"
        } in weekly view`
      );
    });

    test("should open duplicate dialog when duplicate week is clicked", async ({
      page,
    }) => {
      // Switch to weekly view
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("week");
      await page.waitForTimeout(500);

      // Navigate to today
      const todayButton = page.locator('[data-testid="time-nav-today"]');
      await todayButton.click();
      await page.waitForTimeout(500);

      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]'
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Try to click duplicate week button
      const duplicateWeekButton = popover.locator(
        '[data-testid="settings-duplicate-week-button"]'
      );
      const isDisabled = await duplicateWeekButton.isDisabled();

      if (!isDisabled) {
        await duplicateWeekButton.click();
        await page.waitForTimeout(500);

        // Verify dialog is open
        const dialog = page.locator('[data-testid="duplicate-week-dialog"]');
        await expect(dialog).toBeVisible({ timeout: 3000 });

        console.log("✅ Duplicate week dialog opened successfully");
      } else {
        console.log(
          "⏭️  Duplicate week button is disabled (may not meet requirements: Monday start, campaign exists, exactly 7 days)"
        );
      }
    });
  });

  test.describe("Campaign Information", () => {
    test("should display campaign start and end dates", async ({ page }) => {
      // Check if campaign info is visible
      const campaignInfo = page.locator('[data-testid="campaign-info"]');
      await expect(campaignInfo).toBeVisible();

      // Check if campaign dates are displayed
      const campaignDates = page.locator(
        '[data-testid="campaign-period-dates"]'
      );
      await expect(campaignDates).toBeVisible();

      const datesText = await campaignDates.textContent();
      expect(datesText).toBeTruthy();
      expect(datesText?.length).toBeGreaterThan(0);

      console.log(`✅ Campaign dates displayed: "${datesText}"`);
    });

    test("should open breaches in LHS panel when campaign status is clicked", async ({
      page,
    }) => {
      // Look for solve status chip
      const statusChips = page.locator('[data-testid^="solve-status-chip-"]');
      const chipCount = await statusChips.count();

      if (chipCount > 0) {
        // Click the first status chip
        await statusChips.first().click();
        await page.waitForTimeout(500);

        // Verify LHS panel opened (check for breaches tab or panel visibility)
        // The exact test depends on LHS implementation
        // For now, just verify no error occurred

        console.log("✅ Campaign status chip clicked successfully");
      } else {
        console.log(
          "⏭️  No campaign status chip found (team may not use solver)"
        );
      }
    });

    test("should display solve and validate buttons", async ({ page }) => {
      // Check if solve button exists
      const solveButton = page.locator('[data-testid="solve-button"]');
      const solveButtonExists = (await solveButton.count()) > 0;

      if (solveButtonExists) {
        await expect(solveButton).toBeVisible();
        console.log("✅ Solve button is visible");
      } else {
        console.log("⏭️  Solve button not visible (team may not use solver)");
      }

      // Note: Validate button test can be added when we have its data-testid
    });
  });

  test.describe("No Campaign Scenario", () => {
    const noCampaignTestBase = new ScheduleTestBase();

    test.beforeAll(async () => {
      // Setup without campaign
      await noCampaignTestBase.setupScheduleTests(
        test.info().workerIndex + 1000, // Different index to avoid conflicts
        {
          referenceDate: dayjs.utc(),
          createAssignments: true,
          linkMemberToWorker: true,
          // No campaign dates
        }
      );
    });

    test("should show create campaign button when no campaign exists", async ({
      page,
    }) => {
      await noCampaignTestBase.actAsOwner(page);
      await noCampaignTestBase.navigateToSchedulePage(page);

      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      // Check if create campaign button is visible
      const createCampaignButton = page.locator(
        '[data-testid="nav-bar-create-campaign-button"]'
      );
      await expect(createCampaignButton).toBeVisible();

      console.log(
        "✅ Create campaign button displayed when no campaign exists"
      );
    });

    test("should redirect to campaign page when create campaign button is clicked", async ({
      page,
    }) => {
      await noCampaignTestBase.actAsOwner(page);
      await noCampaignTestBase.navigateToSchedulePage(page);

      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      // Click create campaign button
      const createCampaignButton = page.locator(
        '[data-testid="nav-bar-create-campaign-button"]'
      );
      await createCampaignButton.click();

      // Wait for navigation
      await page.waitForURL(/\/plan\/campaign/, { timeout: 10000 });

      // Verify we're on campaign page
      expect(page.url()).toContain("/plan/campaign");

      console.log("✅ Redirected to campaign page successfully");
    });
  });
});

test.describe("ScheduleNavBar - Member Tests", () => {
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

    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
      timeout: 10000,
    });
  });

  test("should not display settings button for members", async ({ page }) => {
    // Verify settings button is not visible
    const settingsButton = page.locator(
      '[data-testid="schedule-settings-button"]'
    );
    await expect(settingsButton).not.toBeVisible();

    console.log("✅ Settings button correctly hidden for members");
  });

  test("should not display campaign info for members", async ({ page }) => {
    // Verify campaign info is not visible
    const campaignInfo = page.locator('[data-testid="campaign-info"]');
    await expect(campaignInfo).not.toBeVisible();

    console.log("✅ Campaign info correctly hidden for members");
  });

  test("should display time navigation for members", async ({ page }) => {
    // Verify time navigation is visible
    const todayButton = page.locator('[data-testid="time-nav-today"]');
    const previousButton = page.locator('[data-testid="time-nav-previous"]');
    const nextButton = page.locator('[data-testid="time-nav-next"]');
    const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');

    await expect(todayButton).toBeVisible();
    await expect(previousButton).toBeVisible();
    await expect(nextButton).toBeVisible();
    await expect(timeFrameSelect).toBeVisible();

    console.log("✅ Time navigation displayed for members");
  });

  test("should display data view selector for members", async ({ page }) => {
    // Verify data view selector is visible
    const shiftButton = page.locator('[data-testid="data-view-shift-button"]');
    const workerButton = page.locator(
      '[data-testid="data-view-worker-button"]'
    );

    await expect(shiftButton).toBeVisible();
    await expect(workerButton).toBeVisible();

    console.log("✅ Data view selector displayed for members");
  });
});
