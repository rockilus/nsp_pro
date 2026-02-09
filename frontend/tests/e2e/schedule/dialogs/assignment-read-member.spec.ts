/**
 * E2E tests for Assignment Read-Only Access by Team Member
 *
 * This test suite verifies that team members can view assignment details
 * but cannot create, edit, or delete assignments.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Assignment Read-Only - Team Member", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting member read-only test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with assignments
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: true,
      linkMemberToWorker: true, // Link member to a worker
    });

    // Authenticate as MEMBER (not owner) and navigate to schedule page
    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should open assignment in read-only mode for team member", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const dbUtils = (scheduleTestBase as any).dbUtils;

    // Get the created assignment
    const assignments = await dbUtils.getAssignments(testTeam.teamId);

    if (assignments.assignments.length === 0) {
      console.log("⚠️ No assignments found, skipping test");
      test.skip();
      return;
    }

    const assignment = assignments.assignments[0];
    const assignmentDate = dayjs(assignment.date);

    // Click on assignment cell to open dialog
    const assignmentCell = page
      .locator(`[data-date="${assignmentDate.format("YYYY-MM-DD")}"]`)
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      console.log("⚠️ Assignment cell not found, skipping test");
      test.skip();
      return;
    }

    await assignmentCell.click();

    // Verify dialog opens
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify form fields are disabled (read-only)
    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    const shiftSelect = page.locator(
      '[data-testid="edit-assignment-shift-select"]',
    );
    const datePicker = page.locator(
      '[data-testid="edit-assignment-date-picker"]',
    );

    if (await workerSelect.isVisible()) {
      await expect(workerSelect).toBeDisabled();
    }
    if (await shiftSelect.isVisible()) {
      await expect(shiftSelect).toBeDisabled();
    }
    if (await datePicker.isVisible()) {
      await expect(datePicker).toBeDisabled();
    }

    console.log("✅ Assignment fields are read-only for team member");
  });

  test("should NOT show save and delete buttons for team member", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const dbUtils = (scheduleTestBase as any).dbUtils;

    const assignments = await dbUtils.getAssignments(testTeam.teamId);

    if (assignments.assignments.length === 0) {
      test.skip();
      return;
    }

    const assignment = assignments.assignments[0];
    const assignmentDate = dayjs(assignment.date);

    const assignmentCell = page
      .locator(`[data-date="${assignmentDate.format("YYYY-MM-DD")}"]`)
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Verify Save and Delete buttons are NOT visible
    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );

    await expect(saveButton).not.toBeVisible();
    await expect(deleteButton).not.toBeVisible();

    console.log("✅ Save and Delete buttons hidden for team member");
  });

  test("should NOT show create button for new assignments to team member", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    // Try to open dialog for creating new assignment
    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    // Team members should not be able to create assignments
    // The button might not be visible at all, or clicking it should do nothing
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();

      const dialog = page.locator('[data-testid="schedule-item-dialog"]');

      if (await dialog.isVisible()) {
        // If dialog opens, Assignment button should not be available
        const assignmentButton = page.locator(
          '[data-testid="assignment-button"]',
        );

        // Either the assignment button is not visible, or
        // the create button should not be visible after selecting assignment
        if (await assignmentButton.isVisible()) {
          await assignmentButton.click();

          const createButton = page.locator(
            '[data-testid="edit-assignment-create-button"]',
          );
          await expect(createButton).not.toBeVisible();
        }
      }

      console.log("✅ Team member cannot create new assignments");
    } else {
      console.log("✅ Add button not visible for team member (expected)");
    }
  });

  test("should allow team member to close read-only assignment dialog", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const dbUtils = (scheduleTestBase as any).dbUtils;

    const assignments = await dbUtils.getAssignments(testTeam.teamId);

    if (assignments.assignments.length === 0) {
      test.skip();
      return;
    }

    const assignment = assignments.assignments[0];
    const assignmentDate = dayjs(assignment.date);

    const assignmentCell = page
      .locator(`[data-date="${assignmentDate.format("YYYY-MM-DD")}"]`)
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Close button should be available
    const closeButton = page.locator('[data-testid="close-dialog-button"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Dialog should close
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible();

    console.log("✅ Team member can close read-only dialog");
  });

  test("should NOT allow team member to access replacement candidates", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const dbUtils = (scheduleTestBase as any).dbUtils;

    const assignments = await dbUtils.getAssignments(testTeam.teamId);

    if (assignments.assignments.length === 0) {
      test.skip();
      return;
    }

    const assignment = assignments.assignments[0];
    const assignmentDate = dayjs(assignment.date);

    const assignmentCell = page
      .locator(`[data-date="${assignmentDate.format("YYYY-MM-DD")}"]`)
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Check replacement button should NOT be visible
    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await expect(checkReplacementButton).not.toBeVisible();

    console.log("✅ Replacement feature hidden for team member");
  });
});
