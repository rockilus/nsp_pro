/**
 * E2E tests for Mobile Schedule Page - No Assignment Scenario
 *
 * These tests verify the mobile schedule page behavior when:
 * - Members don't have worker profiles assigned
 * - Owners have an empty schedule (no assignments created)
 * - Testing mobile-specific UI elements and interactions
 */

import { test, expect } from "@playwright/test";
import { ScheduleTestBase } from "../../utils/schedule-test-base";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// Configure for mobile viewport
test.use({
  viewport: { width: 375, height: 667 }, // iPhone SE dimensions
  isMobile: true,
});

test.describe("Mobile Schedule Page - Member without Worker Profile", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup schedule tests WITHOUT creating assignments or campaign
    // Member will NOT have a worker profile linked
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex, {
      referenceDate: dayjs.utc(),
      createAssignments: false,
      linkMemberToWorker: false, // Do not link member to worker for this test
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
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that the error alert is visible
    const alert = page.locator(
      '[data-testid="mobile-no-worker-profile-alert"]'
    );
    await expect(alert).toBeVisible();

    // Verify the alert has info severity
    await expect(alert).toHaveClass(/MuiAlert-standardInfo/);

    // Verify the error message content
    const errorMessage = alert.getByText(
      /You are not associated with a worker profile/i
    );
    await expect(errorMessage).toBeVisible();

    console.log(
      "✅ Error message displayed correctly for mobile member without worker profile"
    );
  });

  test("should not display schedule content when member has no worker profile", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that worker schedule is NOT present
    const workerSchedule = page.locator(
      '[data-testid="mobile-worker-schedule"]'
    );
    await expect(workerSchedule).not.toBeVisible();

    // Verify that team schedule is NOT present
    const teamSchedule = page.locator('[data-testid="mobile-team-schedule"]');
    await expect(teamSchedule).not.toBeVisible();

    console.log(
      "✅ Schedule content correctly hidden for mobile member without worker profile"
    );
  });

  test("should not display FAB button when member has no worker profile", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that the FAB (Floating Action Button) is NOT visible
    const fabButton = page.locator(
      '[data-testid="mobile-create-assignment-fab"]'
    );
    await expect(fabButton).not.toBeVisible();

    console.log(
      "✅ FAB button correctly hidden for mobile member without worker profile"
    );
  });

  test("should not display settings button when member has no worker profile", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that the settings button is NOT visible in the nav
    const settingsButton = page.locator(
      '[data-testid="mobile-schedule-settings-button"]'
    );
    await expect(settingsButton).not.toBeVisible();

    console.log(
      "✅ Settings button correctly hidden for mobile member without worker profile"
    );
  });
});

test.describe("Mobile Schedule Page - Owner without Assignments", () => {
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

  test("should display schedule content for owner even without assignments", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Owner should see the schedule interface (either worker or team view)
    // Check for at least one of the schedule views
    const scheduleViews = page.locator(
      '[data-testid="mobile-worker-schedule"], [data-testid="mobile-team-schedule"]'
    );
    await expect(scheduleViews.first()).toBeVisible();

    console.log(
      "✅ Schedule content displayed correctly for mobile owner without assignments"
    );
  });

  test("should display FAB button for owner without assignments", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that the FAB is visible
    const fabButton = page.locator(
      '[data-testid="mobile-create-assignment-fab"]'
    );
    await expect(fabButton).toBeVisible();

    console.log("✅ FAB button displayed correctly for mobile owner");
  });

  test("should display settings button for owner", async ({ page }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that the settings button is visible
    const settingsButton = page.locator(
      '[data-testid="mobile-schedule-settings-button"]'
    );
    await expect(settingsButton).toBeVisible();

    console.log("✅ Settings button displayed correctly for mobile owner");
  });

  test("should open assignment dialog when FAB is clicked", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Click the FAB button
    const fabButton = page.locator(
      '[data-testid="mobile-create-assignment-fab"]'
    );
    await fabButton.click();

    // Verify that the create assignment dialog is visible
    const dialog = page.locator('[data-testid="create-assignment-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    console.log("✅ Assignment dialog opened correctly from mobile FAB");
  });

  test("should open settings dialog when settings button is clicked", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Click the settings button
    const settingsButton = page.locator(
      '[data-testid="mobile-schedule-settings-button"]'
    );
    await settingsButton.click();

    // Verify that the settings dialog/drawer is visible
    const settingsDialog = page.locator(
      '[data-testid="mobile-schedule-settings-dialog"]'
    );
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });

    console.log("✅ Settings dialog opened correctly from mobile");
  });

  test("should not show member error for owner even without data", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // The page should NOT show the "no worker profile" error
    const alert = page.locator(
      '[data-testid="mobile-no-worker-profile-alert"]'
    );
    await expect(alert).not.toBeVisible();

    console.log("✅ Mobile owner does not see worker profile error");
  });
});

test.describe("Mobile Schedule Page - Member with Worker Profile but No Assignments", () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup schedule tests with worker profile for member but WITHOUT creating assignments or campaign
    // Note: setupScheduleTests automatically links member to a worker
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

  test("should display schedule content for member with worker profile", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Member should see the schedule interface
    const scheduleViews = page.locator(
      '[data-testid="mobile-worker-schedule"], [data-testid="mobile-team-schedule"]'
    );
    await expect(scheduleViews.first()).toBeVisible();

    console.log(
      "✅ Schedule content displayed correctly for mobile member with worker profile"
    );
  });

  test("should display FAB button for member with worker profile", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that the FAB is visible
    const fabButton = page.locator(
      '[data-testid="mobile-create-assignment-fab"]'
    );
    await expect(fabButton).toBeVisible();

    console.log(
      "✅ FAB button displayed correctly for mobile member with worker profile"
    );
  });

  test("should display settings button for member with worker profile", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Verify that the settings button is visible
    const settingsButton = page.locator(
      '[data-testid="mobile-schedule-settings-button"]'
    );
    await expect(settingsButton).toBeVisible();

    console.log(
      "✅ Settings button displayed correctly for mobile member with worker profile"
    );
  });

  test("should NOT display error message for member with worker profile", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // The page should NOT show the "no worker profile" error
    const alert = page.locator(
      '[data-testid="mobile-no-worker-profile-alert"]'
    );
    await expect(alert).not.toBeVisible();

    console.log(
      "✅ Mobile member with worker profile does not see error message"
    );
  });

  test("should be able to create assignment via FAB button", async ({
    page,
  }) => {
    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });

    // Click the FAB button
    const fabButton = page.locator(
      '[data-testid="mobile-create-assignment-fab"]'
    );
    await fabButton.click();

    // Wait for the create assignment dialog to be visible
    const dialog = page.locator('[data-testid="create-assignment-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill in the worker field
    const workerSelect = dialog.locator(
      '[data-testid="edit-assignment-worker-select"]'
    );
    await workerSelect.click();
    // Select the first worker from the dropdown
    await page.locator('li[role="option"]').first().click();

    // Fill in the date field (use today's date)
    const datePicker = dialog.locator(
      '[data-testid="edit-assignment-date-picker"]'
    );
    const today = dayjs.utc();
    const dateValue = today.format("DD/MM/YYYY");

    // Wait for the input to be visible
    await datePicker.waitFor({ state: "visible" });

    // For MUI date pickers, use fill with force
    await datePicker.fill("", { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(dateValue, { force: true }); // Then fill

    // Press Enter to confirm the value
    await datePicker.press("Enter");
    await page.waitForTimeout(300);

    // Fill in the shift field
    const shiftSelect = dialog.locator(
      '[data-testid="edit-assignment-shift-select"]'
    );
    await shiftSelect.click();

    // Select the first test shift by ID
    const testShifts = scheduleTestBase.getTestShifts();
    const shiftToSelect = testShifts[0].id;
    await page.locator(`[data-testid="shift-option-${shiftToSelect}"]`).click();

    // Click the Create button
    const createButton = dialog.locator(
      '[data-testid="edit-assignment-create-button"]'
    );
    await createButton.click();

    // Wait for the dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    console.log(
      "✅ Assignment created successfully via mobile FAB for member with worker profile"
    );
  });
});
