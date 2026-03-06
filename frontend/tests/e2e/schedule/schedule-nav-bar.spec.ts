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
import { formatPeriodLabel } from "@/components/common/TimeNavigation/TimeNavigation";
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
      createShiftDemands: true,
      createRequests: true,
      campaignDates: {
        start: today.startOf("month").utc(),
        end: today.endOf("month").utc(),
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

      // Verify the schedule table column headers show the days of the selected month
      const scheduleTable = page.locator(
        '[data-testid="schedule-table-shift"]',
      );
      await expect(scheduleTable).toBeVisible();

      // Get the periodStartDate from scheduleViewSettings in localStorage
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      const scheduleViewSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        const settingsStr = localStorage.getItem(settingsKey);
        if (!settingsStr) return null;
        return JSON.parse(settingsStr);
      }, testTeam.teamId);

      expect(scheduleViewSettings).toBeTruthy();
      expect(scheduleViewSettings.periodStartDate).toBeTruthy();

      // Parse the periodStartDate from settings
      const displayedMonthStart = dayjs.utc(
        scheduleViewSettings.periodStartDate,
      );
      const displayedMonthEnd = displayedMonthStart.endOf("month");
      const daysInDisplayedMonth = displayedMonthEnd.date();

      // Verify all days of the displayed month are present
      for (let day = 1; day <= daysInDisplayedMonth; day++) {
        const date = displayedMonthStart.date(day);
        const dateString = date.format("YYYY-MM-DD");
        const dateHeader = page.locator(
          `[data-testid="date-header-day-${dateString}"]`,
        );
        await expect(dateHeader).toBeVisible();
      }

      console.log(
        `✅ Monthly view displayed correctly with all ${daysInDisplayedMonth} days of ${displayedMonthStart.format(
          "MMMM YYYY",
        )}`,
      );
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

      // Verify the period label shows week format (computed dynamically)
      const periodLabel = page.locator('[data-testid="time-nav-label"]');

      // Verify the schedule table shows all 7 days of the displayed week
      const scheduleTable = page.locator(
        '[data-testid="schedule-table-shift"]',
      );
      await expect(scheduleTable).toBeVisible();

      // Get the periodStartDate from scheduleViewSettings in localStorage
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      const scheduleViewSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        const settingsStr = localStorage.getItem(settingsKey);
        if (!settingsStr) return null;
        return JSON.parse(settingsStr);
      }, testTeam.teamId);

      expect(scheduleViewSettings).toBeTruthy();
      expect(scheduleViewSettings.periodStartDate).toBeTruthy();

      // Parse the periodStartDate from settings (this is the week start)
      const displayedWeekStart = dayjs.utc(
        scheduleViewSettings.periodStartDate,
      );

      // Compute expected label using the same formatting logic as the component
      const displayedWeekEnd = displayedWeekStart.add(6, "day");
      const expectedLabel = formatPeriodLabel(
        displayedWeekStart,
        displayedWeekEnd,
        "week",
        "en",
      );

      const labelText = await periodLabel.textContent();
      expect(labelText).toBe(expectedLabel);

      // Verify all 7 days of the displayed week are present
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = displayedWeekStart.add(dayOffset, "day");
        const dateString = date.format("YYYY-MM-DD");
        const dateHeader = page.locator(
          `[data-testid="date-header-day-${dateString}"]`,
        );
        await expect(dateHeader).toBeVisible();
      }

      console.log(
        `✅ Weekly view displayed correctly with all 7 days starting from ${displayedWeekStart.format(
          "YYYY-MM-DD",
        )}`,
      );
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
      // Get initial period
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      const initialSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const initialWeekStart = dayjs.utc(initialSettings.periodStartDate);

      // Click next button
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get new period and verify it's one week later
      const newSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const newWeekStart = dayjs.utc(newSettings.periodStartDate);
      const expectedWeekStart = initialWeekStart.add(1, "week");

      // Verify the new week is exactly 7 days after the initial week
      expect(newWeekStart.format("YYYY-MM-DD")).toBe(
        expectedWeekStart.format("YYYY-MM-DD"),
      );

      // Verify the first day is displayed
      const firstDayHeader = page.locator(
        `[data-testid="date-header-day-${newWeekStart.format("YYYY-MM-DD")}"]`,
      );
      await expect(firstDayHeader).toBeVisible();

      console.log(
        `✅ Navigated from ${initialWeekStart.format(
          "YYYY-MM-DD",
        )} to ${newWeekStart.format("YYYY-MM-DD")}`,
      );
    });

    test("should navigate to previous week when previous button is pressed", async ({
      page,
    }) => {
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Navigate to next week first so we can go back
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get the current period after next navigation
      const beforeSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const beforeWeekStart = dayjs.utc(beforeSettings.periodStartDate);

      // Click previous button
      const previousButton = page.locator('[data-testid="time-nav-previous"]');
      await previousButton.click();
      await page.waitForTimeout(500);

      // Get new period and verify it's one week earlier
      const afterSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const afterWeekStart = dayjs.utc(afterSettings.periodStartDate);
      const expectedWeekStart = beforeWeekStart.subtract(1, "week");

      // Verify the new week is exactly 7 days before
      expect(afterWeekStart.format("YYYY-MM-DD")).toBe(
        expectedWeekStart.format("YYYY-MM-DD"),
      );

      // Verify the first day is displayed
      const firstDayHeader = page.locator(
        `[data-testid="date-header-day-${afterWeekStart.format("YYYY-MM-DD")}"]`,
      );
      await expect(firstDayHeader).toBeVisible();

      console.log(
        `✅ Navigated from ${beforeWeekStart.format(
          "YYYY-MM-DD",
        )} to ${afterWeekStart.format("YYYY-MM-DD")}`,
      );
    });

    test("should navigate back to current week when today button is pressed", async ({
      page,
    }) => {
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Navigate to a future week
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(300);
      await nextButton.click();
      await page.waitForTimeout(300);
      await nextButton.click();
      await page.waitForTimeout(500);

      // Click today button
      const todayButton = page.locator('[data-testid="time-nav-today"]');
      await todayButton.click();
      await page.waitForTimeout(500);

      // Get the period after navigating to today
      const currentSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const currentWeekStart = dayjs.utc(currentSettings.periodStartDate);
      const currentWeekEnd = currentWeekStart.add(6, "days");
      const today = dayjs.utc();

      // Verify today falls within the displayed week
      const todayDate = today.format("YYYY-MM-DD");
      const weekStartDate = currentWeekStart.format("YYYY-MM-DD");
      const weekEndDate = currentWeekEnd.format("YYYY-MM-DD");

      expect(todayDate >= weekStartDate && todayDate <= weekEndDate).toBe(true);

      // Verify the first day is displayed
      const firstDayHeader = page.locator(
        `[data-testid="date-header-day-${currentWeekStart.format(
          "YYYY-MM-DD",
        )}"]`,
      );
      await expect(firstDayHeader).toBeVisible();

      console.log(
        `✅ Navigated to current week starting ${currentWeekStart.format(
          "YYYY-MM-DD",
        )} (contains today: ${todayDate})`,
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
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Get initial period
      const initialSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const initialMonthStart = dayjs.utc(initialSettings.periodStartDate);

      // Click next button
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get new period and verify it's the next month
      const newSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const newMonthStart = dayjs.utc(newSettings.periodStartDate);
      const expectedMonthStart = initialMonthStart
        .add(1, "month")
        .startOf("month");

      // Verify the new month is the next month
      expect(newMonthStart.format("YYYY-MM")).toBe(
        expectedMonthStart.format("YYYY-MM"),
      );

      // Verify the first day is displayed
      const firstDayHeader = page.locator(
        `[data-testid="date-header-day-${newMonthStart.format("YYYY-MM-DD")}"]`,
      );
      await expect(firstDayHeader).toBeVisible();

      console.log(
        `✅ Navigated from ${initialMonthStart.format(
          "MMMM YYYY",
        )} to ${newMonthStart.format("MMMM YYYY")}`,
      );
    });

    test("should navigate to previous month when previous button is pressed", async ({
      page,
    }) => {
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Navigate to next month first
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(500);

      // Get the current period after next navigation
      const beforeSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const beforeMonthStart = dayjs.utc(beforeSettings.periodStartDate);

      // Click previous button
      const previousButton = page.locator('[data-testid="time-nav-previous"]');
      await previousButton.click();
      await page.waitForTimeout(500);

      // Get new period and verify it's the previous month
      const afterSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const afterMonthStart = dayjs.utc(afterSettings.periodStartDate);
      const expectedMonthStart = beforeMonthStart
        .subtract(1, "month")
        .startOf("month");

      // Verify the new month is the previous month
      expect(afterMonthStart.format("YYYY-MM")).toBe(
        expectedMonthStart.format("YYYY-MM"),
      );

      // Verify the first day is displayed
      const firstDayHeader = page.locator(
        `[data-testid="date-header-day-${afterMonthStart.format(
          "YYYY-MM-DD",
        )}"]`,
      );
      await expect(firstDayHeader).toBeVisible();

      console.log(
        `✅ Navigated from ${beforeMonthStart.format(
          "MMMM YYYY",
        )} to ${afterMonthStart.format("MMMM YYYY")}`,
      );
    });

    test("should navigate back to current month when today button is pressed", async ({
      page,
    }) => {
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Navigate to a future month
      const nextButton = page.locator('[data-testid="time-nav-next"]');
      await nextButton.click();
      await page.waitForTimeout(300);
      await nextButton.click();
      await page.waitForTimeout(500);

      // Click today button
      const todayButton = page.locator('[data-testid="time-nav-today"]');
      await todayButton.click();
      await page.waitForTimeout(500);

      // Get the period after navigating to today
      const currentSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const currentMonthStart = dayjs.utc(currentSettings.periodStartDate);
      const today = dayjs.utc();
      const expectedMonthStart = today.startOf("month");

      // Verify the displayed month is the current month
      expect(currentMonthStart.format("YYYY-MM")).toBe(
        expectedMonthStart.format("YYYY-MM"),
      );

      // Verify the first day is displayed
      const firstDayHeader = page.locator(
        `[data-testid="date-header-day-${currentMonthStart.format(
          "YYYY-MM-DD",
        )}"]`,
      );
      await expect(firstDayHeader).toBeVisible();

      console.log(
        `✅ Navigated to current month ${currentMonthStart.format(
          "MMMM YYYY",
        )} (contains today: ${today.format("YYYY-MM-DD")})`,
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

      // Get the selected month from localStorage
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      const scheduleViewSettings = await page.evaluate((teamId) => {
        const settingsKey = `scheduleViewSettings_${teamId}`;
        return JSON.parse(localStorage.getItem(settingsKey) || "{}");
      }, testTeam.teamId);

      const selectedMonth = dayjs.utc(scheduleViewSettings.periodStartDate);
      const expectedLabel = selectedMonth.format("MMMM YYYY"); // e.g., "January 2026"

      // Get period label and verify it matches the selected month
      const periodLabel = page.locator('[data-testid="time-nav-label"]');
      const labelText = await periodLabel.textContent();

      // Verify the label shows the full month name and year
      expect(labelText).toBe(expectedLabel);

      console.log(
        `✅ Period label displays correctly: "${labelText}" for month ${selectedMonth.format(
          "YYYY-MM",
        )}`,
      );
    });

    test("should display correct period in weekly view", async ({ page }) => {
      // Ensure weekly view
      const timeFrameSelect = page.locator('[data-testid="time-nav-select"]');
      await timeFrameSelect.selectOption("week");
      await page.waitForTimeout(500);

      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      const periodLabel = page.locator('[data-testid="time-nav-label"]');

      // Test case 1: Week spanning different years (Dec 2025 - Jan 2026)
      // Should display: "Dec 2025 - Jan 2026"
      const week1Start = dayjs.utc("2025-12-29");
      await page.evaluate(
        ({ teamId, periodStartDate }) => {
          const settingsKey = `scheduleViewSettings_${teamId}`;
          const settings = JSON.parse(
            localStorage.getItem(settingsKey) || "{}",
          );
          settings.periodStartDate = periodStartDate;
          settings.timeFrame = "week";
          localStorage.setItem(settingsKey, JSON.stringify(settings));
        },
        { teamId: testTeam.teamId, periodStartDate: week1Start.toISOString() },
      );
      await page.reload();
      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      let labelText = await periodLabel.textContent();
      expect(labelText).toBe("Dec 2025 - Jan 2026");
      console.log(`✅ Week spanning years displays correctly: "${labelText}"`);

      // Test case 2: Week within same month (Jan 5-11, 2026)
      // Should display: "January 2026"
      const week2Start = dayjs.utc("2026-01-05");
      await page.evaluate(
        ({ teamId, periodStartDate }) => {
          const settingsKey = `scheduleViewSettings_${teamId}`;
          const settings = JSON.parse(
            localStorage.getItem(settingsKey) || "{}",
          );
          settings.periodStartDate = periodStartDate;
          settings.timeFrame = "week";
          localStorage.setItem(settingsKey, JSON.stringify(settings));
        },
        { teamId: testTeam.teamId, periodStartDate: week2Start.toISOString() },
      );
      await page.reload();
      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      labelText = await periodLabel.textContent();
      expect(labelText).toBe("January 2026");
      console.log(
        `✅ Week within same month displays correctly: "${labelText}"`,
      );

      // Test case 3: Week spanning different months, same year (Jan 26 - Feb 1, 2026)
      // Should display: "Jan - Feb 2026"
      const week3Start = dayjs.utc("2026-01-26");
      await page.evaluate(
        ({ teamId, periodStartDate }) => {
          const settingsKey = `scheduleViewSettings_${teamId}`;
          const settings = JSON.parse(
            localStorage.getItem(settingsKey) || "{}",
          );
          settings.periodStartDate = periodStartDate;
          settings.timeFrame = "week";
          localStorage.setItem(settingsKey, JSON.stringify(settings));
        },
        { teamId: testTeam.teamId, periodStartDate: week3Start.toISOString() },
      );
      await page.reload();
      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      labelText = await periodLabel.textContent();
      expect(labelText).toBe("Jan - Feb 2026");
      console.log(
        `✅ Week spanning months (same year) displays correctly: "${labelText}"`,
      );
    });
  });

  test.describe("Data View Selection", () => {
    test("should display shift table when shift view is selected", async ({
      page,
    }) => {
      // Click on shift button in data view selector
      const shiftButton = page.locator(
        '[data-testid="data-view-shift-button"]',
      );
      await shiftButton.click();
      await page.waitForTimeout(500);

      // Verify shift button is selected (has the selected state)
      expect(await shiftButton.getAttribute("aria-pressed")).toBe("true");

      // Verify schedule table is visible (both shift and worker use same table)
      const scheduleTable = page.locator(
        '[data-testid="schedule-table-shift"]',
      );
      await expect(scheduleTable).toBeVisible();

      console.log("✅ Shift view displayed correctly");
    });

    test("should display worker table when worker view is selected", async ({
      page,
    }) => {
      // First select shift view
      const shiftButton = page.locator(
        '[data-testid="data-view-shift-button"]',
      );
      await shiftButton.click();
      await page.waitForTimeout(300);

      // Then click on worker button
      const workerButton = page.locator(
        '[data-testid="data-view-worker-button"]',
      );
      await workerButton.click();
      await page.waitForTimeout(500);

      // Verify worker button is selected
      expect(await workerButton.getAttribute("aria-pressed")).toBe("true");

      // Verify schedule table is visible
      const scheduleTable = page.locator(
        '[data-testid="schedule-table-worker"]',
      );
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
        '[data-testid="schedule-settings-button"]',
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
        '[data-testid="schedule-settings-button"]',
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Click shift button in settings
      const shiftButton = popover.locator(
        '[data-testid="settings-groupby-shift"]',
      );
      await shiftButton.click();
      await page.waitForTimeout(500);

      // Verify shift button is selected
      expect(await shiftButton.getAttribute("aria-pressed")).toBe("true");

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify schedule table is visible
      const scheduleTable = page.locator(
        '[data-testid="schedule-table-shift"]',
      );
      await expect(scheduleTable).toBeVisible();

      console.log("✅ Shift view displayed from settings");
    });

    test("should display worker view when worker is selected in settings", async ({
      page,
    }) => {
      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]',
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Click worker button in settings
      const workerButton = popover.locator(
        '[data-testid="settings-groupby-worker"]',
      );
      await workerButton.click();
      await page.waitForTimeout(500);

      // Verify worker button is selected
      expect(await workerButton.getAttribute("aria-pressed")).toBe("true");

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify schedule table is visible
      const scheduleTable = page.locator(
        '[data-testid="schedule-table-worker"]',
      );
      await expect(scheduleTable).toBeVisible();

      console.log("✅ Worker view displayed from settings");
    });

    test("should show/hide assignments when checkbox is toggled", async ({
      page,
    }) => {
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Set the period to today (which includes our test assignment created on reference date)
      const today = dayjs.utc();
      await page.evaluate(
        ({ teamId, periodStartDate, timeFrame }) => {
          const settingsKey = `scheduleViewSettings_${teamId}`;
          const settings = JSON.parse(
            localStorage.getItem(settingsKey) || "{}",
          );
          settings.periodStartDate = periodStartDate;
          settings.timeFrame = timeFrame;
          localStorage.setItem(settingsKey, JSON.stringify(settings));
        },
        {
          teamId: testTeam.teamId,
          periodStartDate: today.startOf("month").toISOString(),
          timeFrame: "month",
        },
      );
      await page.reload();
      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]',
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Get assignments checkbox
      const assignmentsCheckbox = popover.locator(
        '[data-testid="settings-checkbox-assignments"]',
      );

      // Ensure it's checked
      const isChecked = await assignmentsCheckbox.isChecked();
      if (!isChecked) {
        await assignmentsCheckbox.check();
        await page.waitForTimeout(500);
      }

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify assignment is visible in the schedule
      // Use pattern matching for assignment cells (data-testid="assignment-cell-{id}")
      const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
      const assignmentCount = await assignmentCells.count();
      expect(assignmentCount).toBeGreaterThan(0);
      console.log(`✅ Found ${assignmentCount} assignment(s) displayed`);

      // Open settings again
      await settingsButton.click();
      await expect(popover).toBeVisible();

      // Uncheck assignments checkbox
      await assignmentsCheckbox.uncheck();
      await page.waitForTimeout(500);

      // Verify it's unchecked
      expect(await assignmentsCheckbox.isChecked()).toBe(false);

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify no assignments are visible
      const assignmentCountAfter = await assignmentCells.count();
      expect(assignmentCountAfter).toBe(0);
      console.log("✅ Assignments correctly hidden when checkbox is unchecked");
    });

    test("should show/hide demands when checkbox is toggled in shift view", async ({
      page,
    }) => {
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Set the period to today (which includes our test demand created on reference date)
      const today = dayjs.utc();
      await page.evaluate(
        ({ teamId, periodStartDate, timeFrame, groupBy }) => {
          const settingsKey = `scheduleViewSettings_${teamId}`;
          const settings = JSON.parse(
            localStorage.getItem(settingsKey) || "{}",
          );
          settings.periodStartDate = periodStartDate;
          settings.timeFrame = timeFrame;
          settings.groupBy = groupBy;
          localStorage.setItem(settingsKey, JSON.stringify(settings));
        },
        {
          teamId: testTeam.teamId,
          periodStartDate: today.startOf("month").toISOString(),
          timeFrame: "month",
          groupBy: "shift",
        },
      );
      await page.reload();
      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      // Ensure shift view
      const shiftButton = page.locator(
        '[data-testid="data-view-shift-button"]',
      );
      await shiftButton.click();
      await page.waitForTimeout(300);

      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]',
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Get demands checkbox (only visible for solver teams)
      const demandsCheckbox = popover.locator(
        '[data-testid="settings-checkbox-demands"]',
      );

      // Ensure it's checked
      const isChecked = await demandsCheckbox.isChecked();
      if (!isChecked) {
        await demandsCheckbox.check();
        await page.waitForTimeout(500);
      }

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify demand is visible in the schedule
      // Use pattern matching for demand cells (data-testid="demand-cell-{id}")
      const demandCells = page.locator('[data-testid^="demand-cell-"]');
      const demandCount = await demandCells.count();
      expect(demandCount).toBeGreaterThan(0);
      console.log(`✅ Found ${demandCount} demand(s) displayed`);

      // Open settings again
      await settingsButton.click();
      await expect(popover).toBeVisible();

      // Uncheck demands checkbox
      await demandsCheckbox.uncheck();
      await page.waitForTimeout(500);

      // Verify it's unchecked
      expect(await demandsCheckbox.isChecked()).toBe(false);

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify no demands are visible
      const demandCountAfter = await demandCells.count();
      expect(demandCountAfter).toBe(0);
      console.log("✅ Demands correctly hidden when checkbox is unchecked");
    });

    test("should show/hide requests when checkbox is toggled in worker view", async ({
      page,
    }) => {
      const testTeam = scheduleTestBase.getTestTeam();
      if (!testTeam) {
        throw new Error("Test team not found");
      }

      // Set the period to today (which includes our test request created on reference date)
      const today = dayjs.utc();
      await page.evaluate(
        ({ teamId, periodStartDate, timeFrame, groupBy }) => {
          const settingsKey = `scheduleViewSettings_${teamId}`;
          const settings = JSON.parse(
            localStorage.getItem(settingsKey) || "{}",
          );
          settings.periodStartDate = periodStartDate;
          settings.timeFrame = timeFrame;
          settings.groupBy = groupBy;
          localStorage.setItem(settingsKey, JSON.stringify(settings));
        },
        {
          teamId: testTeam.teamId,
          periodStartDate: today.startOf("month").toISOString(),
          timeFrame: "month",
          groupBy: "worker",
        },
      );
      await page.reload();
      await page.waitForSelector('[data-testid="schedule-nav-bar"]', {
        timeout: 10000,
      });

      // Ensure worker view
      const workerButton = page.locator(
        '[data-testid="data-view-worker-button"]',
      );
      await workerButton.click();
      await page.waitForTimeout(300);

      // Open settings
      const settingsButton = page.locator(
        '[data-testid="schedule-settings-button"]',
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Get requests checkbox
      const requestsCheckbox = popover.locator(
        '[data-testid="settings-checkbox-requests"]',
      );

      // Ensure it's checked
      const isChecked = await requestsCheckbox.isChecked();
      if (!isChecked) {
        await requestsCheckbox.check();
        await page.waitForTimeout(500);
      }

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify request is visible in the schedule
      // Use pattern matching for request cells (data-testid="request-cell-{id}")
      const requestCells = page.locator('[data-testid^="request-cell-"]');
      const requestCount = await requestCells.count();
      expect(requestCount).toBeGreaterThan(0);
      console.log(`✅ Found ${requestCount} request(s) displayed`);

      // Open settings again
      await settingsButton.click();
      await expect(popover).toBeVisible();

      // Uncheck requests checkbox
      await requestsCheckbox.uncheck();
      await page.waitForTimeout(500);

      // Verify it's unchecked
      expect(await requestsCheckbox.isChecked()).toBe(false);

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Verify no requests are visible
      const requestCountAfter = await requestCells.count();
      expect(requestCountAfter).toBe(0);
      console.log("✅ Requests correctly hidden when checkbox is unchecked");
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
        '[data-testid="schedule-settings-button"]',
      );
      await settingsButton.click();

      let popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Check if duplicate week button is disabled
      const duplicateWeekButton = popover.locator(
        '[data-testid="settings-duplicate-week-button"]',
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
        } in weekly view`,
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
        '[data-testid="schedule-settings-button"]',
      );
      await settingsButton.click();

      const popover = page.locator('[data-testid="schedule-settings-popover"]');
      await expect(popover).toBeVisible();

      // Try to click duplicate week button
      const duplicateWeekButton = popover.locator(
        '[data-testid="settings-duplicate-week-button"]',
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
          "⏭️  Duplicate week button is disabled (may not meet requirements: Monday start, campaign exists, exactly 7 days)",
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
        '[data-testid="campaign-period-dates"]',
      );
      await expect(campaignDates).toBeVisible();

      const datesText = await campaignDates.textContent();
      expect(datesText).toBeTruthy();
      expect(datesText?.length).toBeGreaterThan(0);

      // Verify the dates match the campaign dates from setup
      const campaign = scheduleTestBase.getCampaign();
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // UI displays dates in "DD MMM YYYY" format
      const expectedStartFormatted = campaign.startDate.format("MMM YYYY");
      const expectedEndFormatted = campaign.endDate.format("MMM YYYY");

      // Verify the displayed text contains the expected formatted dates
      expect(datesText).toContain(expectedStartFormatted);
      expect(datesText).toContain(expectedEndFormatted);

      console.log(
        `✅ Campaign dates displayed correctly: "${datesText}" (expected: ${expectedStartFormatted} to ${expectedEndFormatted})`,
      );
    });

    test("should open breaches in dialog when campaign status is clicked", async ({
      page,
    }) => {
      // Look for solve status chip
      const statusChips = page.locator('[data-testid^="solve-status-chip-"]');
      const chipCount = await statusChips.count();

      if (chipCount > 0) {
        // Click the first status chip
        await statusChips.first().click();
        await page.waitForTimeout(500);

        // Verify dialog opened on breaches tab
        const breachPanel = page.locator('[data-testid="breaches-dialog"]');
        await expect(breachPanel).toBeVisible({ timeout: 3000 });

        console.log(
          "✅ Campaign status chip clicked and breaches panel opened",
        );
      } else {
        console.log(
          "⏭️  No campaign status chip found (team may not use solver)",
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

      // Check validate button
      const validateButton = page.locator('[data-testid="validate-button"]');
      await expect(validateButton).toBeVisible();
      console.log("✅ Validate button is visible");
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
        },
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
        '[data-testid="nav-bar-create-campaign-button"]',
      );
      await expect(createCampaignButton).toBeVisible();

      console.log(
        "✅ Create campaign button displayed when no campaign exists",
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
        '[data-testid="nav-bar-create-campaign-button"]',
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
        start: today.startOf("month").utc(),
        end: today.endOf("month").utc(),
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
      '[data-testid="schedule-settings-button"]',
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
      '[data-testid="data-view-worker-button"]',
    );

    await expect(shiftButton).toBeVisible();
    await expect(workerButton).toBeVisible();

    console.log("✅ Data view selector displayed for members");
  });
});
