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
import { randomUUID } from "crypto";

dayjs.extend(utc);

test.describe("Schedule Page - Member without Worker Profile", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting assignment creation test setup`,
    );

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with workers and shifts, no assignments
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: false,
      linkMemberToWorker: false,
    });

    // Authenticate as owner and navigate to schedule page
    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should display error message when member has no worker profile", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the error alert is visible
    const alert = page.locator('[data-testid="no-worker-profile-alert"]');
    await expect(alert).toBeVisible();

    // Verify the alert has info severity
    await expect(alert).toHaveClass(/MuiAlert-standardInfo/);

    // Verify the error message content
    const errorMessage = alert.getByText(
      /You are not associated with a worker profile/i,
    );
    await expect(errorMessage).toBeVisible();

    console.log(
      "✅ Error message displayed correctly for member without worker profile",
    );
  });

  test("should not display 'No assignments yet' message for member without worker profile", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the "no assignments" member display is NOT visible when there's an error
    const noAssignmentsDisplay = page.locator(
      '[data-testid="no-assignments-display-member"]',
    );
    await expect(noAssignmentsDisplay).not.toBeVisible();

    console.log(
      "✅ No assignments display correctly hidden when member has no worker profile",
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
      "✅ Schedule table correctly hidden for member without worker profile",
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
      "✅ Schedule navigation correctly hidden for member without worker profile",
    );
  });
});

test.describe("Schedule Page - Owner without Assignments", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting assignment creation test setup`,
    );

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with workers and shifts, no assignments
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: false,
      linkMemberToWorker: false,
    });

    // Authenticate as owner and navigate to schedule page
    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });
  test("should display no assignments message for owner", async ({ page }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the no assignments display for owner is visible
    const noAssignmentsDisplay = page.locator(
      '[data-testid="no-assignments-display-owner"]',
    );
    await expect(noAssignmentsDisplay).toBeVisible();

    // Verify the message content
    const message = page.locator('[data-testid="no-assignments-owner-text"]');
    await expect(message).toBeVisible();
    await expect(message).toContainText(/No assignments yet/i);
    await expect(message).toContainText(/Start a new campaign/i);
    await expect(message).toContainText(/create your first assignment/i);

    console.log("✅ No assignments message displayed correctly for owner");
  });

  test("should display 'Create campaign' button for owner without assignments", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the "Create campaign" button is visible
    const createCampaignButton = page.locator(
      '[data-testid="create-campaign-button"]',
    );
    await expect(createCampaignButton).toBeVisible();

    console.log("✅ Create campaign button displayed correctly for owner");
  });

  test("should navigate to campaign page when 'Create campaign' button is clicked", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Click the "Create campaign" button
    const createCampaignButton = page.locator(
      '[data-testid="create-campaign-button"]',
    );
    await createCampaignButton.click();

    // Wait for navigation and verify we're on the campaign page
    await page.waitForURL(/\/plan\/campaign/, { timeout: 10000 });
    expect(page.url()).toContain("/plan/campaign");

    console.log("✅ Successfully navigated to campaign page");
  });

  test("should display 'Create assignment' button for owner without assignments", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the "Create assignment" button is visible
    const createAssignmentButton = page.locator(
      '[data-testid="create-assignment-button"]',
    );
    await expect(createAssignmentButton).toBeVisible();

    console.log("✅ Create assignment button displayed correctly for owner");
  });

  test("should open create assignment dialog when 'Create assignment' button is clicked", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Click the "Create assignment" button
    const createAssignmentButton = page.locator(
      '[data-testid="create-assignment-button"]',
    );
    await createAssignmentButton.click();

    // Verify that the create assignment dialog is visible
    const dialog = page.locator('[data-testid="assignment-form"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    console.log("✅ Create assignment dialog opened correctly");
  });

  test("should create assignment and display schedule table when form is filled and saved", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify no schedule table exists initially
    const scheduleTableBefore = page.locator(
      '[data-testid="schedule-table-shift"]',
    );
    await expect(scheduleTableBefore).not.toBeVisible();

    // Click the "Create assignment" button to open the dialog
    const createAssignmentButton = page.locator(
      '[data-testid="create-assignment-button"]',
    );
    await createAssignmentButton.click();

    // Wait for the create assignment dialog to be visible
    const assignmentDialog = page.locator('[data-testid="assignment-form"]');
    await expect(assignmentDialog).toBeVisible({ timeout: 5000 });

    // Select worker
    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    await workerSelect.click();
    await page
      .locator(`[data-testid="worker-option-${testWorkers[0].id}"]`)
      .click();

    // Select shift
    const shiftSelect = page.locator(
      '[data-testid="edit-assignment-shift-select"]',
    );
    await shiftSelect.click();
    await page
      .locator(`[data-testid="shift-option-${testShifts[0].id}"]`)
      .click();

    // Select date (tomorrow)
    const tomorrow = dayjs.utc().add(1, "day");

    const datePicker = page.locator(
      '[data-testid="edit-assignment-date-picker"]',
    );
    await datePicker.waitFor({ state: "visible" });
    await datePicker.fill("", { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format("DD/MM/YYYY"), { force: true });
    await datePicker.press("Enter");
    await page.waitForTimeout(300);

    // Click create button
    const createButton = page.locator(
      '[data-testid="edit-assignment-create-button"]',
    );
    await createButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify that the schedule table now appears
    const scheduleTableAfter = page.locator(
      '[data-testid="schedule-table-shift"]',
    );
    await expect(scheduleTableAfter).toBeVisible({ timeout: 10000 });

    console.log(
      "✅ Assignment created successfully and schedule table is now visible",
    );
  });

  test("should not show member error for owner even without data", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // The page should NOT show the "no worker profile" error
    const alert = page.locator('[data-testid="no-worker-profile-alert"]');
    await expect(alert).not.toBeVisible();

    console.log("✅ Owner does not see worker profile error");
  });
});

test.describe("Schedule Page - Member with Worker Profile but No Assignments", () => {
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

  test("should display 'No assignments yet' message for member with worker profile", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the no assignments display for member is visible
    const noAssignmentsDisplay = page.locator(
      '[data-testid="no-assignments-display-member"]',
    );
    await expect(noAssignmentsDisplay).toBeVisible();

    // Verify the message content
    await expect(noAssignmentsDisplay).toContainText(/No assignments yet/i);

    console.log(
      "✅ No assignments message displayed correctly for member with worker profile",
    );
  });

  test("should NOT display action buttons for member with worker profile", async ({
    page,
  }) => {
    // Wait for the schedule page to render
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // Verify that the "Create campaign" button is NOT visible
    const createCampaignButton = page.locator(
      '[data-testid="create-campaign-button"]',
    );
    await expect(createCampaignButton).not.toBeVisible();

    // Verify that the "Create assignment" button is NOT visible
    const createAssignmentButton = page.locator(
      '[data-testid="create-assignment-button"]',
    );
    await expect(createAssignmentButton).not.toBeVisible();

    console.log("✅ Action buttons correctly hidden for member");
  });

  test("should NOT display error message for member with worker profile", async ({
    page,
  }) => {
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="schedule-page-heading"]', {
      timeout: 10000,
    });

    // The page should NOT show the "no worker profile" error
    const alert = page.locator('[data-testid="no-worker-profile-alert"]');
    await expect(alert).not.toBeVisible();

    console.log("✅ Member with worker profile does not see error");
  });
});
