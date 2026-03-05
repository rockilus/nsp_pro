/**
 * E2E tests for Schedule Selection Feature — Action Toolbar
 *
 * Tests verify the action toolbar behaviour including:
 * - Scope toggle visibility (with/without campaign)
 * - Dropdown options
 * - Entity select visibility per action type
 * - Validation errors
 * - Delete confirmation flow
 * - Bulk create, update, toggleFixed, delete operations
 * - Close button exits selection mode
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/** Enter selection mode via settings popover */
async function enterSelectionMode(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.click('[data-testid="schedule-settings-button"]');
  await page.click('[data-testid="settings-selection-mode-button"]');
  await expect(
    page.locator('[data-testid="schedule-action-toolbar"]'),
  ).toBeVisible();
}

/** Switch the selected action via the dropdown */
async function selectAction(
  page: import("@playwright/test").Page,
  action: "create" | "update" | "toggleFixed" | "delete",
): Promise<void> {
  await page.click('[data-testid="schedule-action-dropdown-toggle"]');
  await page.click(`[data-testid="schedule-action-option-${action}"]`);
}

test.describe("Schedule Selection - Action Toolbar", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);
    (testInfo as any).testRunId = testRunId;

    const referenceDate = dayjs.utc();

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate,
      createAssignments: true,
      linkMemberToWorker: false,
    });

    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);

    await scheduleTestBase.setScheduleViewSettings(page, {
      groupBy: "shift",
      targetDate: referenceDate,
      timeFrame: "week",
    });

    await enterSelectionMode(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  // ── Scope toggle ──────────────────────────────────────────────────────────

  test("scope toggle absent with no campaign", async ({ page }) => {
    await expect(
      page.locator('[data-testid="schedule-scope-toggle-group"]'),
    ).not.toBeVisible();
  });

  test("scope toggle present with campaign", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const today = dayjs.utc();
    await scheduleTestBase.createCampaignSchedule(
      today.startOf("month"),
      today.endOf("month"),
    );

    await page.reload();
    await page.waitForLoadState("networkidle");
    await enterSelectionMode(page);

    await expect(
      page.locator('[data-testid="schedule-scope-toggle-group"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="schedule-scope-view"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="schedule-scope-campaign"]'),
    ).toBeVisible();
  });

  // ── Dropdown ──────────────────────────────────────────────────────────────

  test("dropdown shows all 4 action options", async ({ page }) => {
    await page.click('[data-testid="schedule-action-dropdown-toggle"]');

    for (const key of ["create", "update", "toggleFixed", "delete"]) {
      await expect(
        page.locator(`[data-testid="schedule-action-option-${key}"]`),
      ).toBeVisible();
    }
  });

  // ── Entity select visibility ───────────────────────────────────────────────

  test("entity select shown for create/update, hidden for toggleFixed/delete", async ({
    page,
  }) => {
    // Default action is "create" — entity select should be visible
    await expect(
      page.locator('[data-testid="schedule-entity-select"]'),
    ).toBeVisible();

    // Switch to "update" — entity select still visible
    await selectAction(page, "update");
    await expect(
      page.locator('[data-testid="schedule-entity-select"]'),
    ).toBeVisible();

    // Switch to "toggleFixed" — entity select hidden
    await selectAction(page, "toggleFixed");
    await expect(
      page.locator('[data-testid="schedule-entity-select"]'),
    ).not.toBeVisible();

    // Switch to "delete" — entity select hidden
    await selectAction(page, "delete");
    await expect(
      page.locator('[data-testid="schedule-entity-select"]'),
    ).not.toBeVisible();
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  test("validation: create with no cells selected shows error", async ({
    page,
  }) => {
    // Ensure nothing is selected (default state after entering selection mode)
    await page.click('[data-testid="schedule-action-main-button"]');

    await expect(
      page.locator('[data-testid="schedule-validation-error"]'),
    ).toBeVisible();
  });

  test("validation: create with cells but no entity selected shows error", async ({
    page,
  }) => {
    // Select all cells
    await page.click('[data-testid="export-cell-select-all-checkbox"]');

    // Submit without picking an entity
    await page.click('[data-testid="schedule-action-main-button"]');

    await expect(
      page.locator('[data-testid="schedule-validation-error"]'),
    ).toBeVisible();
  });

  test("validation: update with no assignments shows error", async ({
    page,
  }) => {
    await selectAction(page, "update");

    // Select only cells (no assignments)
    await page.click('[data-testid="export-cell-select-all-checkbox"]');

    await page.click('[data-testid="schedule-action-main-button"]');

    await expect(
      page.locator('[data-testid="schedule-validation-error"]'),
    ).toBeVisible();
  });

  test("validation: toggleFixed with no assignments shows error", async ({
    page,
  }) => {
    await selectAction(page, "toggleFixed");

    await page.click('[data-testid="schedule-action-main-button"]');

    await expect(
      page.locator('[data-testid="schedule-validation-error"]'),
    ).toBeVisible();
  });

  test("validation: delete with no assignments shows error", async ({
    page,
  }) => {
    await selectAction(page, "delete");

    await page.click('[data-testid="schedule-action-main-button"]');

    await expect(
      page.locator('[data-testid="schedule-validation-error"]'),
    ).toBeVisible();
  });

  // ── Delete confirmation flow ───────────────────────────────────────────────

  test("delete confirmation flow: cancel aborts deletion", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const referenceDate = dayjs.utc();
    const result = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );

    if (result.assignmentsRead.length === 0) {
      test.skip(true, "No assignments in current week — skipping");
      return;
    }

    // Select an assignment
    const assignmentId = result.assignmentsRead[0].id;
    await page
      .locator(`[data-testid="assignment-cell-${assignmentId}"]`)
      .click();

    await selectAction(page, "delete");

    // Click main action → confirm button should appear
    await page.click('[data-testid="schedule-action-main-button"]');
    await expect(
      page.locator('[data-testid="schedule-delete-confirm-button"]'),
    ).toBeVisible();

    // Cancel — confirmation dismissed, no deletion
    await page.click('[data-testid="schedule-delete-cancel-button"]');
    await expect(
      page.locator('[data-testid="schedule-delete-confirm-button"]'),
    ).not.toBeVisible();

    // Assignment should still exist
    const afterCancel = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );
    expect(afterCancel.assignmentsRead.some((a) => a.id === assignmentId)).toBe(
      true,
    );
  });

  test("delete confirmation flow: confirm deletes assignments", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const referenceDate = dayjs.utc();
    const result = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );

    if (result.assignmentsRead.length === 0) {
      test.skip(true, "No assignments in current week — skipping");
      return;
    }

    const assignmentId = result.assignmentsRead[0].id;
    await page
      .locator(`[data-testid="assignment-cell-${assignmentId}"]`)
      .click();

    await selectAction(page, "delete");
    await page.click('[data-testid="schedule-action-main-button"]');
    await page.click('[data-testid="schedule-delete-confirm-button"]');

    // Wait for toolbar to return to normal (delete confirmed)
    await expect(
      page.locator('[data-testid="schedule-delete-confirm-button"]'),
    ).not.toBeVisible();

    // Verify assignment was removed
    const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );
    expect(afterDelete.assignmentsRead.some((a) => a.id === assignmentId)).toBe(
      false,
    );
  });

  // ── Bulk create ───────────────────────────────────────────────────────────

  test("bulk create: creates assignments for selected cells", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const referenceDate = dayjs.utc();
    const workers = scheduleTestBase.getTestWorkers();

    // Use "shift" groupBy — select all cells in first visible shift row
    const shifts = scheduleTestBase.getTestShifts();
    const rowCheckbox = page.locator(
      `[data-testid="shift-row-checkbox-${shifts[0].id}"]`,
    );
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.click();

    // Pick a worker as the entity
    const workerOption = page.locator(
      `[data-testid="schedule-entity-option-${workers[0].id}"]`,
    );
    // Open the entity select first
    await page.click('[data-testid="schedule-entity-select"]');
    await workerOption.click();

    const beforeCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );
    const countBefore = beforeCreate.assignmentsRead.length;

    await page.click('[data-testid="schedule-action-main-button"]');

    // Wait a moment for the action to complete
    await page.waitForTimeout(1000);

    const afterCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );
    expect(afterCreate.assignmentsRead.length).toBeGreaterThan(countBefore);
  });

  // ── Bulk update ───────────────────────────────────────────────────────────

  test("bulk update: updates selected assignments to a different shift", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const referenceDate = dayjs.utc();
    const result = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );

    if (result.assignmentsRead.length === 0) {
      test.skip(true, "No assignments in current week — skipping");
      return;
    }

    const assignmentId = result.assignmentsRead[0].id;
    const currentShiftId = result.assignmentsRead[0].shiftId;

    // Click assignment to select it
    await page
      .locator(`[data-testid="assignment-cell-${assignmentId}"]`)
      .click();

    await selectAction(page, "update");

    // Pick a different shift
    const shifts = scheduleTestBase.getTestShifts();
    const alternateShift = shifts.find((s) => s.id !== currentShiftId);
    if (!alternateShift) {
      test.skip(true, "No alternate shift available — skipping");
      return;
    }

    await page.click('[data-testid="schedule-entity-select"]');
    await page
      .locator(
        `[data-testid="schedule-entity-option-${alternateShift.id}"]`,
      )
      .click();

    await page.click('[data-testid="schedule-action-main-button"]');

    await page.waitForTimeout(1000);

    const afterUpdate = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );

    // The updated assignment should now have the alternate shift
    const updatedAssignment = afterUpdate.assignmentsRead.find(
      (a) => a.id === assignmentId,
    );
    expect(updatedAssignment?.shiftId).toBe(alternateShift.id);
  });

  // ── Bulk toggleFixed ──────────────────────────────────────────────────────

  test("bulk toggleFixed: toggles fixed flag on selected assignments", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const referenceDate = dayjs.utc();
    const result = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );

    // Find an assignment with fixed: false
    const assignment = result.assignmentsRead.find((a) => !a.fixed);
    if (!assignment) {
      test.skip(true, "No unfixed assignments in current week — skipping");
      return;
    }

    await page
      .locator(`[data-testid="assignment-cell-${assignment.id}"]`)
      .click();

    await selectAction(page, "toggleFixed");
    await page.click('[data-testid="schedule-action-main-button"]');

    await page.waitForTimeout(1000);

    const afterToggle = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );

    const toggled = afterToggle.assignmentsRead.find((a) => a.id === assignment.id);
    expect(toggled?.fixed).toBe(true);
  });

  // ── Bulk delete ───────────────────────────────────────────────────────────

  test("bulk delete: deletes all selected assignments", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const referenceDate = dayjs.utc();
    const result = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );

    if (result.assignmentsRead.length === 0) {
      test.skip(true, "No assignments in current week — skipping");
      return;
    }

    const assignmentId = result.assignmentsRead[0].id;
    await page
      .locator(`[data-testid="assignment-cell-${assignmentId}"]`)
      .click();

    await selectAction(page, "delete");
    await page.click('[data-testid="schedule-action-main-button"]');
    await page.click('[data-testid="schedule-delete-confirm-button"]');

    await page.waitForTimeout(1000);

    const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      referenceDate.startOf("week"),
      referenceDate.endOf("week"),
    );
    expect(afterDelete.assignmentsRead.some((a) => a.id === assignmentId)).toBe(
      false,
    );
  });

  // ── Close button ──────────────────────────────────────────────────────────

  test("close button exits selection mode", async ({ page }) => {
    await expect(
      page.locator('[data-testid="schedule-action-toolbar"]'),
    ).toBeVisible();

    await page.click('[data-testid="schedule-close-selection-button"]');

    await expect(
      page.locator('[data-testid="schedule-action-toolbar"]'),
    ).not.toBeVisible();
  });
});
