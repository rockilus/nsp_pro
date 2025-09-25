import { test, expect } from "@playwright/test";
import { ShiftDemandTestBase } from "../../utils/shift-demand-test-base";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

test.describe("Shift Demand - Period Navigation", () => {
  let shiftDemandTestBase: ShiftDemandTestBase;

  test.beforeEach(async ({ page }) => {
    shiftDemandTestBase = new ShiftDemandTestBase();
    await shiftDemandTestBase.setupShiftDemandTests();
    await shiftDemandTestBase.navigateToShiftDemandsPage(page);
  });

  test("should display the current week by default and navigate weeks", async ({
    page,
  }) => {
    const periodNav = shiftDemandTestBase.getPeriodNav(page);
    const today = dayjs();
    const startOfWeek = today.startOf("isoWeek");
    const endOfWeek = today.endOf("isoWeek");

    // Check that the initial view is the current week
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      shiftDemandTestBase.getDateHeader(page, startOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      shiftDemandTestBase.getDateHeader(page, endOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the previous week
    await periodNav.previousButton.click();
    const prevWeekStart = startOfWeek.subtract(1, "week");
    const prevWeekEnd = endOfWeek.subtract(1, "week");
    await expect(
      shiftDemandTestBase.getDateHeader(
        page,
        prevWeekStart.format("YYYY-MM-DD")
      )
    ).toBeVisible();
    await expect(
      shiftDemandTestBase.getDateHeader(page, prevWeekEnd.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the next week (back to current)
    await periodNav.nextButton.click();
    await expect(
      shiftDemandTestBase.getDateHeader(page, startOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      shiftDemandTestBase.getDateHeader(page, endOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to next week, then click Today
    await periodNav.nextButton.click();
    const nextWeekStart = startOfWeek.add(1, "week");
    await expect(
      shiftDemandTestBase.getDateHeader(
        page,
        nextWeekStart.format("YYYY-MM-DD")
      )
    ).toBeVisible();

    await periodNav.todayButton.click();
    await expect(
      shiftDemandTestBase.getDateHeader(page, startOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();
  });

  test("should switch to month view and navigate months", async ({ page }) => {
    const periodNav = shiftDemandTestBase.getPeriodNav(page);
    const today = dayjs();
    const startOfMonth = today.startOf("month");
    const endOfMonth = today.endOf("month");

    // Switch to month view
    await periodNav.select.selectOption("month");

    // Check that the initial view is the current month
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      shiftDemandTestBase.getDateHeader(page, startOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      shiftDemandTestBase.getDateHeader(page, endOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the previous month
    await periodNav.previousButton.click();
    const prevMonthStart = startOfMonth.subtract(1, "month");
    const prevMonthEnd = prevMonthStart.endOf("month");
    await expect(periodNav.label).toHaveText(
      prevMonthStart.format("MMMM YYYY")
    );
    await expect(
      shiftDemandTestBase.getDateHeader(
        page,
        prevMonthStart.format("YYYY-MM-DD")
      )
    ).toBeVisible();
    await expect(
      shiftDemandTestBase.getDateHeader(page, prevMonthEnd.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the next month (back to current)
    await periodNav.nextButton.click();
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      shiftDemandTestBase.getDateHeader(page, startOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to next month, then click Today
    await periodNav.nextButton.click();
    const nextMonthStart = startOfMonth.add(1, "month");
    await expect(periodNav.label).toHaveText(
      nextMonthStart.format("MMMM YYYY")
    );

    await periodNav.todayButton.click();
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      shiftDemandTestBase.getDateHeader(page, startOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();
  });

  test("should correctly switch between week and month views", async ({
    page,
  }) => {
    const periodNav = shiftDemandTestBase.getPeriodNav(page);

    // 1. Switch from week to month
    const today = dayjs();
    const startOfWeek = today.startOf("isoWeek");
    const monthOfStartOfWeek = startOfWeek.startOf("month");

    await expect(periodNav.select).toHaveValue("week");
    await periodNav.select.selectOption("month");

    await expect(periodNav.select).toHaveValue("month");
    await expect(periodNav.label).toHaveText(
      monthOfStartOfWeek.format("MMMM YYYY")
    );
    await expect(
      shiftDemandTestBase.getDateHeader(
        page,
        monthOfStartOfWeek.format("YYYY-MM-DD")
      )
    ).toBeVisible();

    // 2. Switch from month to week
    const startOfMonth = dayjs().add(1, "month").startOf("month");
    await periodNav.nextButton.click(); // Go to next month
    await expect(periodNav.label).toHaveText(startOfMonth.format("MMMM YYYY"));

    await periodNav.select.selectOption("week");
    const weekOfStartOfMonth = startOfMonth.startOf("isoWeek");
    const endOfWeekOfStartOfMonth = startOfMonth.endOf("isoWeek");

    await expect(periodNav.select).toHaveValue("week");
    // The label might span two months, so we check the dates are visible
    await expect(
      shiftDemandTestBase.getDateHeader(
        page,
        weekOfStartOfMonth.format("YYYY-MM-DD")
      )
    ).toBeVisible();
    await expect(
      shiftDemandTestBase.getDateHeader(
        page,
        endOfWeekOfStartOfMonth.format("YYYY-MM-DD")
      )
    ).toBeVisible();
  });
});
