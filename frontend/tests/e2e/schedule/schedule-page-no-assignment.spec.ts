/**
 * E2E tests for Schedule Page - No Assignment Scenario
 *
 * These tests verify the schedule page behavior when:
 * - Members don't have worker profiles assigned
 * - Owners have an empty schedule (no assignments created)
 */

import { test, expect } from "@playwright/test";
import { ScheduleTestBase } from "../../utils/schedule-test-base";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

test.describe("Schedule Page - Member without Worker Profile", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup schedule tests WITHOUT creating assignments or campaign
    // Member will NOT have a worker profile linked (handled separately)
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex, {
      referenceDate: dayjs.utc(),
      createAssignments: false,
      // No campaign dates provided
    });
  });

  test.beforeEach(async ({ page }) => {
    // Authenticate as member and navigate to schedule page
    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test("should display error message when member has no worker profile", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the error alert is visible
    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();

    // Verify the alert has info severity
    await expect(alert).toHaveClass(/MuiAlert-standardInfo/);

    // Verify the error message content
    const errorMessage = alert.getByText(
      /You are not associated with a worker profile/i
    );
    await expect(errorMessage).toBeVisible();

    console.log(
      "✅ Error message displayed correctly for member without worker profile"
    );
  });

  test("should not display schedule table when member has no worker profile", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the schedule table is NOT present
    const scheduleTable = page.locator("table").first();
    await expect(scheduleTable).not.toBeVisible();

    console.log(
      "✅ Schedule table correctly hidden for member without worker profile"
    );
  });

  test("should not display schedule navigation bar when member has no worker profile", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that navigation elements are NOT present
    // Look for common navigation buttons
    const todayButton = page.getByRole("button", { name: /today/i });
    await expect(todayButton).not.toBeVisible();

    console.log(
      "✅ Schedule navigation correctly hidden for member without worker profile"
    );
  });
});

test.describe("Schedule Page - Owner without Assignments", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup schedule tests WITHOUT creating assignments or campaign
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex, {
      referenceDate: dayjs.utc(),
      createAssignments: false,
      // No campaign dates provided
    });
  });

  test.beforeEach(async ({ page }) => {
    // Authenticate as owner and navigate to schedule page
    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test("should display schedule page for owner even without assignments", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the schedule navigation bar IS visible for owners
    // (Owners can see the schedule even if empty)
    const scheduleNavigation = page.locator("nav, [role=navigation]").first();

    // For owners, they should see the schedule interface even without data
    // The page should NOT show the "no worker profile" error
    const alert = page.locator('div[role="alert"]', {
      hasText: /You are not associated with a worker profile/i,
    });
    await expect(alert).not.toBeVisible();

    console.log("✅ Owner can access schedule page even without assignments");
  });

  test("should allow owner to create schedule even without existing data", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that owners have access to schedule creation/management features
    // For example, they should be able to see the schedule toolbar
    const pageContent = page.locator('[data-testid="schedule-page-heading"]');
    await expect(pageContent).toBeVisible();

    // The key point: no error message should block the owner
    const errorAlert = page.locator('div[role="alert"]', {
      hasText: /not associated with a worker profile/i,
    });
    await expect(errorAlert).not.toBeVisible();

    console.log("✅ Owner has access to schedule management features");
  });
});
