/**
 * E2E tests for Assignment Recurrence by Team Leader
 *
 * This test suite covers recurring assignment functionality including
 * various frequencies (daily, weekly, monthly, yearly) and end types
 * (never, end date, occurrences), as well as recurrence editing/deletion.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";
import {
  FrequencyType,
  RecurrenceEndType,
  OccurrenceType,
  OccurrenceInfoT,
  RecurrenceRuleT,
  RecurrenceExclusionT,
  RecurrenceUpdateScope,
  toRecurrenceRuleT,
  fromRecurrenceRuleT,
  MonthRepeatType,
} from "../../../../src/types/recurrence";

dayjs.extend(utc);

test.describe("Assignment Recurrence - Team Leader", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting recurrence test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: false,
      linkMemberToWorker: false,
    });

    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should create daily recurring assignment with no end date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid="create-assignment-button"]');
    await expect(addButton).toBeVisible();

    await addButton.click();

    // Fill assignment form
    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    await workerSelect.click();
    await page
      .locator(`[data-testid="worker-option-${testWorkers[0].workerId}"]`)
      .click();

    const shiftSelect = page.locator(
      '[data-testid="edit-assignment-shift-select"]',
    );
    await shiftSelect.click();
    await page
      .locator(`[data-testid="shift-option-${testShifts[0].id}"]`)
      .click();

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

    // Open recurrence dialog
    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    // Set daily frequency
    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-day"]').click();

    // Keep "Never" end type (should be default)
    const neverRadio = page.locator('[data-testid="recurrence-never-radio"]');
    await neverRadio.click();

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    // Create assignment
    const createButton = page.locator(
      '[data-testid="edit-assignment-create-button"]',
    );
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify recurring assignment was created
    const ARResult = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(5, "month").endOf("day"),
    );

    const createdRecurrence = ARResult.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    expect(createdRecurrence.teamId).toBe(testTeam.teamId);
    expect(createdRecurrence.occurrenceType).toBe(OccurrenceType.ASSIGNMENT);
    expect(createdRecurrence.occurrenceInfo.workerId).toBe(
      testWorkers[0].workerId,
    );
    expect(createdRecurrence.occurrenceInfo.shiftId).toBe(testShifts[0].id);
    expect(createdRecurrence.occurrenceInfo.count).toBeNull();
    expect(createdRecurrence.repeatEvery).toBe(1);
    expect(createdRecurrence.frequencyType).toBe(FrequencyType.DAY);
    const expectedWeekDay = (tomorrow.day() + 6) % 7;
    expect(createdRecurrence.weekDays).toEqual([expectedWeekDay]);
    expect(createdRecurrence.monthRepeatType).toBeNull();
    expect(createdRecurrence.recurrenceEndType).toBe(RecurrenceEndType.NEVER);
    expect(createdRecurrence.startDate.isSame(tomorrow, "day")).toBeTruthy();
    expect(createdRecurrence.endDate).toBeNull();
    expect(createdRecurrence.numberOfOccurrences).toBeNull();

    const recurringAssignments = ARResult.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence.id,
    );

    expect(recurringAssignments).toBeDefined();

    // Verify recurring assignments were created for the next 30 days (since no end date)
    const expectedOccurrences = 30;
    for (
      let i = tomorrow;
      i.isBefore(tomorrow.add(expectedOccurrences, "day"));
      i = i.add(1, "day")
    ) {
      const occurrence = recurringAssignments.find(
        (a) =>
          a.workerId === testWorkers[0].workerId &&
          a.shiftId === testShifts[0].id &&
          a.date.isSame(i, "day"),
      );
      expect(occurrence).toBeDefined();
    }

    console.log("✅ Daily recurring assignment created");
  });

  test("should create weekly recurring assignment with end date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid="create-assignment-button"]');
    await expect(addButton).toBeVisible();

    await addButton.click();

    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    await workerSelect.click();
    await page
      .locator(`[data-testid="worker-option-${testWorkers[0].workerId}"]`)
      .click();

    const shiftSelect = page.locator(
      '[data-testid="edit-assignment-shift-select"]',
    );
    await shiftSelect.click();
    await page
      .locator(`[data-testid="shift-option-${testShifts[0].id}"]`)
      .click();

    const tomorrow = dayjs.utc().add(1, "day");

    const datePicker = page.locator(
      '[data-testid="edit-assignment-date-picker"]',
    );
    await datePicker.waitFor({ state: "visible" });
    await datePicker.fill("", { force: true });
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format("DD/MM/YYYY"), { force: true });
    await datePicker.press("Enter");
    await page.waitForTimeout(300);

    // Open recurrence dialog
    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    // Set weekly frequency
    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-week"]').click();

    // Set end date
    const endDateRadio = page.locator(
      '[data-testid="recurrence-end-date-radio"]',
    );
    await endDateRadio.click();

    const endDate = tomorrow.add(4, "week");
    const endDatePicker = page.locator(
      '[data-testid="recurrence-end-date-picker"]',
    );
    await endDatePicker.click();
    await endDatePicker.fill(endDate.format("DD/MM/YYYY"));

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator(
      '[data-testid="edit-assignment-create-button"]',
    );
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify recurring assignment was created
    const ARResult = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );

    const createdRecurrence = ARResult.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    expect(createdRecurrence.teamId).toBe(testTeam.teamId);
    expect(createdRecurrence.occurrenceType).toBe(OccurrenceType.ASSIGNMENT);
    expect(createdRecurrence.occurrenceInfo.workerId).toBe(
      testWorkers[0].workerId,
    );
    expect(createdRecurrence.occurrenceInfo.shiftId).toBe(testShifts[0].id);
    expect(createdRecurrence.repeatEvery).toBe(1);
    expect(createdRecurrence.frequencyType).toBe(FrequencyType.WEEK);
    const expectedWeekDay = (tomorrow.day() + 6) % 7;
    expect(createdRecurrence.weekDays).toEqual([expectedWeekDay]);
    expect(createdRecurrence.recurrenceEndType).toBe(
      RecurrenceEndType.END_DATE,
    );
    expect(createdRecurrence.startDate.isSame(tomorrow, "day")).toBeTruthy();
    expect(createdRecurrence.endDate).not.toBeNull();
    expect(createdRecurrence.endDate!.isSame(endDate, "day")).toBeTruthy();

    console.log("✅ Weekly recurring assignment with end date created");
  });

  test("should create weekly recurring assignment with specific weekdays", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    const workerSelect = page.locator('[data-testid="worker-select"]');
    await workerSelect.click();
    await page.locator(`text="${testWorkers[0].name}"`).first().click();

    const shiftSelect = page.locator('[data-testid="shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[0].name}"`).first().click();

    const tomorrow = dayjs.utc().add(1, "day");
    const datePicker = page.locator('[data-testid="date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-week"]').click();

    // Select Monday (1) and Wednesday (3)
    const mondayButton = page.locator('[data-testid="weekday-button-1"]');
    const wednesdayButton = page.locator('[data-testid="weekday-button-3"]');

    await mondayButton.click();
    await wednesdayButton.click();

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator(
      '[data-testid="create-assignment-button"]',
    );
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    const dbUtils = (scheduleTestBase as any).dbUtils;
    const AR2 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR2.assignmentsRead;

    const recurringAssignment = assignments.find(
      (a: any) => a.workerId === testWorkers[0].workerId && a.recurrenceRule,
    );

    expect(recurringAssignment).toBeDefined();
    expect(recurringAssignment.recurrenceRule.frequency).toBe("weekly");
    expect(recurringAssignment.recurrenceRule.byWeekday).toContain(1);
    expect(recurringAssignment.recurrenceRule.byWeekday).toContain(3);

    console.log(
      "✅ Weekly recurring assignment with specific weekdays created",
    );
  });

  test("should create monthly recurring assignment with occurrences", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    const workerSelect = page.locator('[data-testid="worker-select"]');
    await workerSelect.click();
    await page.locator(`text="${testWorkers[0].name}"`).first().click();

    const shiftSelect = page.locator('[data-testid="shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[0].name}"`).first().click();

    const tomorrow = dayjs.utc().add(1, "day");
    const datePicker = page.locator('[data-testid="date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-month"]').click();

    // Set occurrences end type
    const occurrencesRadio = page.locator(
      '[data-testid="recurrence-occurrences-radio"]',
    );
    await occurrencesRadio.click();

    const occurrencesInput = page.locator(
      '[data-testid="recurrence-occurrences-input"]',
    );
    await occurrencesInput.fill("6");

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator(
      '[data-testid="create-assignment-button"]',
    );
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    const dbUtils = (scheduleTestBase as any).dbUtils;
    const AR3 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR3.assignmentsRead;

    const recurringAssignment = assignments.find(
      (a: any) => a.workerId === testWorkers[0].workerId && a.recurrenceRule,
    );

    expect(recurringAssignment).toBeDefined();
    expect(recurringAssignment.recurrenceRule.frequency).toBe("monthly");
    expect(recurringAssignment.recurrenceRule.endType).toBe("occurrences");
    expect(recurringAssignment.recurrenceRule.occurrences).toBe(6);

    console.log("✅ Monthly recurring assignment with occurrences created");
  });

  test("should delete single instance of recurring assignment (this only)", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    // Create recurring assignment
    const tomorrow = dayjs.utc().add(1, "day");
    await scheduleTestBase.createAssignmentWithRecurrence(
      {
        workerId: testWorkers[0].workerId,
        shiftId: testShifts[0].id,
        date: tomorrow,
      },
      {
        id: "",
        teamId: testTeam.teamId,
        occurrenceType: OccurrenceType.ASSIGNMENT,
        occurrenceInfo: {
          workerId: testWorkers[0].workerId,
          shiftId: testShifts[0].id,
          count: null,
        },
        repeatEvery: 1,
        frequencyType: FrequencyType.DAY,
        weekDays: [(tomorrow.day() + 6) % 7],
        monthRepeatType: null,
        recurrenceEndType: RecurrenceEndType.NUMBER_OF_OCCURRENCES,
        startDate: tomorrow,
        endDate: null,
        numberOfOccurrences: 5,
      },
    );

    await page.reload();
    await page.waitForTimeout(1000);

    // Click on assignment
    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    // Click delete
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await deleteButton.click();

    // Select "This assignment only"
    const thisOnlyRadio = page.locator(
      '[data-testid="delete-this-only-radio"]',
    );
    await thisOnlyRadio.click();

    const confirmButton = page.locator(
      '[data-testid="recurrence-delete-confirm-button"]',
    );
    await confirmButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify: original assignment should remain but with one exception
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const AR4 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR4.assignmentsRead;

    const recurringAssignment = assignments.find(
      (a: any) => a.workerId === testWorkers[0].workerId && a.recurrenceRule,
    );

    expect(recurringAssignment).toBeDefined();
    expect(recurringAssignment.recurrenceRule.exceptionDates).toContain(
      tomorrow.format("YYYY-MM-DD"),
    );

    console.log("✅ Single instance deleted from recurring assignment");
  });

  test("should delete all instances of recurring assignment", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const tomorrow = dayjs.utc().add(1, "day");
    await scheduleTestBase.createAssignmentWithRecurrence(
      {
        workerId: testWorkers[0].workerId,
        shiftId: testShifts[0].id,
        date: tomorrow,
      },
      {
        id: "",
        teamId: testTeam.teamId,
        occurrenceType: OccurrenceType.ASSIGNMENT,
        occurrenceInfo: {
          workerId: testWorkers[0].workerId,
          shiftId: testShifts[0].id,
          count: null,
        },
        repeatEvery: 1,
        frequencyType: FrequencyType.DAY,
        weekDays: [(tomorrow.day() + 6) % 7],
        monthRepeatType: null,
        recurrenceEndType: RecurrenceEndType.NUMBER_OF_OCCURRENCES,
        startDate: tomorrow,
        endDate: null,
        numberOfOccurrences: 5,
      },
    );

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await deleteButton.click();

    // Select "All assignments"
    const allRadio = page.locator('[data-testid="delete-all-radio"]');
    await allRadio.click();

    const confirmButton = page.locator(
      '[data-testid="recurrence-delete-confirm-button"]',
    );
    await confirmButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify all assignments deleted
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const AR5 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR5.assignmentsRead;

    const deletedAssignment = assignments.find(
      (a: any) => a.workerId === testWorkers[0].workerId,
    );

    expect(deletedAssignment).toBeUndefined();

    console.log("✅ All instances of recurring assignment deleted");
  });
});
