/**
 * E2E tests for Assignment Recurrence by Team Leader
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { ScheduleTestBase } from '../../../utils/schedule-test-base';
import {
  FrequencyType,
  RecurrenceEndType,
  OccurrenceType,
  MonthRepeatType,
} from '../../../../src/types/recurrence';

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

test.describe('Assignment Recurrence - Team Leader', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting recurrence test setup`);
    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);
    (testInfo as any).testRunId = testRunId;
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
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

  test('should create daily recurring assignment with no end date', async ({ page }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-day"]').click();

    const neverRadio = page.locator('[data-testid="recurrence-never-radio"]');
    await neverRadio.click();

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const ARResult = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(5, 'month').endOf('day'),
    );

    const createdRecurrence = ARResult.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    expect(createdRecurrence.teamId).toBe(testTeam.teamId);
    expect(createdRecurrence.occurrenceType).toBe(OccurrenceType.ASSIGNMENT);
    expect(createdRecurrence.occurrenceInfo.workerId).toBe(testWorkers[0].id);
    expect(createdRecurrence.occurrenceInfo.shiftId).toBe(testShifts[0].id);
    expect(createdRecurrence.occurrenceInfo.count).toBeNull();
    expect(createdRecurrence.repeatEvery).toBe(1);
    expect(createdRecurrence.frequencyType).toBe(FrequencyType.DAY);
    const expectedWeekDay = (tomorrow.day() + 6) % 7;
    expect(createdRecurrence.weekDays).toEqual([expectedWeekDay]);
    expect(createdRecurrence.monthRepeatType).toBeNull();
    expect(createdRecurrence.recurrenceEndType).toBe(RecurrenceEndType.NEVER);
    expect(createdRecurrence.startDate.isSame(tomorrow, 'day')).toBeTruthy();
    expect(createdRecurrence.endDate).toBeNull();
    expect(createdRecurrence.numberOfOccurrences).toBeNull();

    const recurringAssignments = ARResult.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence.id,
    );
    expect(recurringAssignments).toBeDefined();

    const expectedOccurrences = 30;
    for (
      let i = tomorrow;
      i.isBefore(tomorrow.add(expectedOccurrences, 'day'));
      i = i.add(1, 'day')
    ) {
      const occurrence = recurringAssignments.find(
        (a) =>
          a.workerId === testWorkers[0].id &&
          a.shiftId === testShifts[0].id &&
          a.date.isSame(i, 'day'),
      );
      expect(occurrence).toBeDefined();
    }

    console.log('✅ Daily recurring assignment created');
  });

  test('should create weekly recurring assignment with end date', async ({ page }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-week"]').click();

    const endDateRadio = page.locator('[data-testid="recurrence-end-date-radio"]');
    await endDateRadio.click();

    const endDate = tomorrow.add(10, 'week');
    await selectDate(page, endDate, 'recurrence-end-date-picker');

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const ARResult = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(5, 'month').endOf('day'),
    );

    const createdRecurrence = ARResult.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    expect(createdRecurrence.teamId).toBe(testTeam.teamId);
    expect(createdRecurrence.occurrenceType).toBe(OccurrenceType.ASSIGNMENT);
    expect(createdRecurrence.occurrenceInfo.workerId).toBe(testWorkers[0].id);
    expect(createdRecurrence.occurrenceInfo.shiftId).toBe(testShifts[0].id);
    expect(createdRecurrence.repeatEvery).toBe(1);
    expect(createdRecurrence.frequencyType).toBe(FrequencyType.WEEK);
    const expectedWeekDay = (tomorrow.day() + 6) % 7;
    expect(createdRecurrence.weekDays).toEqual([expectedWeekDay]);
    expect(createdRecurrence.recurrenceEndType).toBe(RecurrenceEndType.END_DATE);
    expect(createdRecurrence.startDate.isSame(tomorrow, 'day')).toBeTruthy();
    expect(createdRecurrence.endDate).not.toBeNull();
    expect(createdRecurrence.endDate!.isSame(endDate, 'day')).toBeTruthy();

    const recurringAssignments = ARResult.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence.id,
    );
    expect(recurringAssignments).toBeDefined();

    const endDatePlusOne = endDate.add(1, 'day');
    for (let i = tomorrow; i.isBefore(endDatePlusOne); i = i.add(1, 'week')) {
      const occurrence = recurringAssignments.find(
        (a) =>
          a.workerId === testWorkers[0].id &&
          a.shiftId === testShifts[0].id &&
          a.date.isSame(i, 'day'),
      );
      expect(occurrence).toBeDefined();
    }

    console.log('✅ Weekly recurring assignment with end date created');
  });

  test('should create weekly recurring assignment with specific weekdays', async ({
    page,
  }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-week"]').click();

    const expectedDefaultWeekDay = (tomorrow.day() + 6) % 7;
    const defaultButton = page.locator(`[data-testid="weekday-button-${expectedDefaultWeekDay}"]`);
    await expect(defaultButton).toHaveClass(/bg-primary/);

    for (let d = 0; d <= 6; d++) {
      if (d === expectedDefaultWeekDay) continue;
      await expect(page.locator(`[data-testid="weekday-button-${d}"]`)).not.toHaveClass(
        /bg-primary/,
      );
    }

    const candidatePairs = [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
    ];
    let chosenDays: number[] = [];
    for (const pair of candidatePairs) {
      if (!pair.includes(expectedDefaultWeekDay)) {
        chosenDays = pair;
        break;
      }
    }
    if (chosenDays.length === 0) {
      for (let d = 0; d <= 6 && chosenDays.length < 2; d++) {
        if (d === expectedDefaultWeekDay) continue;
        chosenDays.push(d);
      }
    }

    const firstButton = page.locator(`[data-testid="weekday-button-${chosenDays[0]}"]`);
    const secondButton = page.locator(`[data-testid="weekday-button-${chosenDays[1]}"]`);
    await expect(firstButton).not.toHaveClass(/bg-primary/);
    await expect(secondButton).not.toHaveClass(/bg-primary/);
    await firstButton.click();
    await secondButton.click();
    await expect(firstButton).toHaveClass(/bg-primary/);
    await expect(secondButton).toHaveClass(/bg-primary/);

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const AR2 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );

    const createdRecurrence = AR2.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    expect(createdRecurrence.teamId).toBe(testTeam.teamId);
    expect(createdRecurrence.occurrenceType).toBe(OccurrenceType.ASSIGNMENT);
    expect(createdRecurrence.occurrenceInfo.workerId).toBe(testWorkers[0].id);
    expect(createdRecurrence.occurrenceInfo.shiftId).toBe(testShifts[0].id);
    expect(createdRecurrence.repeatEvery).toBe(1);
    expect(createdRecurrence.frequencyType).toBe(FrequencyType.WEEK);
    const actualWeekDays = [...createdRecurrence.weekDays].sort((a, b) => a - b);
    const expectedWeekDays = [...chosenDays, expectedDefaultWeekDay].sort((a, b) => a - b);
    expect(actualWeekDays).toEqual(expectedWeekDays);
    expect(createdRecurrence.recurrenceEndType).toBe(RecurrenceEndType.NEVER);
    expect(createdRecurrence.startDate.isSame(tomorrow, 'day')).toBeTruthy();
    expect(createdRecurrence.endDate).toBeNull();

    const recurringAssignments = AR2.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence.id,
    );
    expect(recurringAssignments).toBeDefined();

    const checkDays = 30;
    for (let d = tomorrow; d.isBefore(tomorrow.add(checkDays, 'day')); d = d.add(1, 'day')) {
      const mappedWeekDay = (d.day() + 6) % 7;
      if (createdRecurrence.weekDays.includes(mappedWeekDay)) {
        const occurrence = recurringAssignments.find(
          (a) =>
            a.workerId === testWorkers[0].id &&
            a.shiftId === testShifts[0].id &&
            a.date.isSame(d, 'day'),
        );
        expect(occurrence).toBeDefined();
      }
    }

    console.log('✅ Weekly recurring assignment with specific weekdays created');
  });

  test('should create monthly recurring assignment with occurrences', async ({
    page,
  }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-month"]').click();

    const occurrencesRadio = page.locator('[data-testid="recurrence-occurrences-radio"]');
    await occurrencesRadio.click();

    const occurrencesInput = page.locator('[data-testid="recurrence-occurrences-input"]');
    const numberOfOccurrences = 5;
    await occurrencesInput.fill(numberOfOccurrences.toString());

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const AR3 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(5, 'month').endOf('day'),
    );

    const createdRecurrence = AR3.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    expect(createdRecurrence.teamId).toBe(testTeam.teamId);
    expect(createdRecurrence.occurrenceType).toBe(OccurrenceType.ASSIGNMENT);
    expect(createdRecurrence.occurrenceInfo.workerId).toBe(testWorkers[0].id);
    expect(createdRecurrence.occurrenceInfo.shiftId).toBe(testShifts[0].id);
    expect(createdRecurrence.repeatEvery).toBe(1);
    expect(createdRecurrence.frequencyType).toBe(FrequencyType.MONTH);
    expect(createdRecurrence.monthRepeatType).toBe(MonthRepeatType.DAY_IN_MONTH);
    expect(createdRecurrence.recurrenceEndType).toBe(RecurrenceEndType.NUMBER_OF_OCCURRENCES);
    expect(createdRecurrence.startDate.isSame(tomorrow, 'day')).toBeTruthy();
    expect(createdRecurrence.numberOfOccurrences).toBe(numberOfOccurrences);

    const recurringAssignments = AR3.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence.id,
    );

    expect(recurringAssignments).toBeDefined();
    expect(recurringAssignments.length).toBe(numberOfOccurrences);

    for (let i = 0; i < numberOfOccurrences; i++) {
      const expectedDate = tomorrow.add(i, 'month');
      const occurrence = recurringAssignments.find(
        (a) =>
          a.workerId === testWorkers[0].id &&
          a.shiftId === testShifts[0].id &&
          a.date.isSame(expectedDate, 'day'),
      );
      expect(occurrence).toBeDefined();
    }

    console.log('✅ Monthly recurring assignment with occurrences created');
  });

  test('should create monthly recurring assignment with weekday repeat type', async ({
    page,
  }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    let startDate = tomorrow;
    const dayOfMonth = tomorrow.date();
    if (dayOfMonth < 8) {
      startDate = tomorrow.date(8);
    } else if (dayOfMonth > 14) {
      startDate = tomorrow.add(1, 'month').date(8);
    }

    await selectDate(page, startDate);

    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await frequencySelect.click();
    await page.locator('[data-testid="frequency-option-month"]').click();

    const monthRepeatTypeSelect = page.locator('[data-testid="month-repeat-type-select"]');
    await monthRepeatTypeSelect.click();
    await page.getByRole('option', { name: /Monthly on the/ }).click();

    const occurrencesRadio = page.locator('[data-testid="recurrence-occurrences-radio"]');
    await occurrencesRadio.click();

    const occurrencesInput = page.locator('[data-testid="recurrence-occurrences-input"]');
    const numberOfOccurrences = 5;
    await occurrencesInput.fill(numberOfOccurrences.toString());

    const doneButton = page.locator('[data-testid="recurrence-done-button"]');
    await doneButton.click();

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const ARResult = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(5, 'month').endOf('day'),
    );

    const createdRecurrence = ARResult.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    expect(createdRecurrence.teamId).toBe(testTeam.teamId);
    expect(createdRecurrence.occurrenceType).toBe(OccurrenceType.ASSIGNMENT);
    expect(createdRecurrence.occurrenceInfo.workerId).toBe(testWorkers[0].id);
    expect(createdRecurrence.occurrenceInfo.shiftId).toBe(testShifts[0].id);
    expect(createdRecurrence.repeatEvery).toBe(1);
    expect(createdRecurrence.frequencyType).toBe(FrequencyType.MONTH);
    expect(createdRecurrence.monthRepeatType).toBe(MonthRepeatType.WEEKDAY);
    expect(createdRecurrence.recurrenceEndType).toBe(RecurrenceEndType.NUMBER_OF_OCCURRENCES);
    expect(createdRecurrence.startDate.isSame(startDate, 'day')).toBeTruthy();
    expect(createdRecurrence.numberOfOccurrences).toBe(numberOfOccurrences);

    const recurringAssignments = ARResult.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence.id,
    );

    expect(recurringAssignments).toBeDefined();
    expect(recurringAssignments.length).toBe(numberOfOccurrences);

    const startWeekday = startDate.day();
    const startWeekOfMonth = Math.ceil(startDate.date() / 7);
    for (let i = 0; i < numberOfOccurrences; i++) {
      const expectedMonth = startDate.add(i, 'month');
      let expectedDate = expectedMonth.startOf('month');
      let weekdayCount = 0;
      while (weekdayCount < startWeekOfMonth) {
        if (expectedDate.day() === startWeekday) {
          weekdayCount++;
          if (weekdayCount === startWeekOfMonth) break;
        }
        expectedDate = expectedDate.add(1, 'day');
      }
      const occurrence = recurringAssignments.find(
        (a) =>
          a.workerId === testWorkers[0].id &&
          a.shiftId === testShifts[0].id &&
          a.date.isSame(expectedDate, 'day'),
      );
      expect(occurrence).toBeDefined();
      expect(occurrence!.date.day()).toBe(startWeekday);

      // Verify the week position matches
      const occurrenceWeekOfMonth = Math.ceil(occurrence!.date.date() / 7);
      expect(occurrenceWeekOfMonth).toBe(startWeekOfMonth);
    }

    console.log('✅ Monthly recurring assignment with weekday repeat type created');
  });

  test('should delete single instance of recurring assignment (this only)', async ({
    page,
  }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const tomorrow = dayjs.utc().add(1, 'day');
    await scheduleTestBase.createAssignmentAndRecurrence(
      { workerId: testWorkers[0].id, shiftId: testShifts[0].id, date: tomorrow },
      {
        id: '',
        teamId: testTeam.teamId,
        occurrenceType: OccurrenceType.ASSIGNMENT,
        occurrenceInfo: { workerId: testWorkers[0].id, shiftId: testShifts[0].id, count: null },
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

    const beforeDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const createdRecurrence = beforeDelete.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    const occurrencesBefore = beforeDelete.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence!.id,
    );
    expect(occurrencesBefore.length).toBe(5);

    const occurrenceToDelete = occurrencesBefore[1];
    const deleteDate = occurrenceToDelete.date;
    await scheduleTestBase.setScheduleViewSettings(
      page,
      { targetDate: deleteDate, timeFrame: 'week' },
      true,
    );

    const assignmentCell = page.locator(`[data-testid="assignment-cell-${occurrenceToDelete.id}"]`);
    await expect(assignmentCell).toBeVisible({ timeout: 5000 });
    await assignmentCell.click();

    const deleteButton = page.locator('[data-testid="delete-assignment-button"]');
    await deleteButton.click();
    await page.locator('[data-testid="delete-this-only-radio"]').click();
    await page.locator('[data-testid="recurrence-delete-confirm-button"]').click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const occurrencesAfter = afterDelete.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence!.id,
    );
    expect(occurrencesAfter.length).toBe(4);

    // Verify the deleted occurrence is not in the list
    const deletedOccurrence = occurrencesAfter.find((a) => a.date.isSame(deleteDate, 'day'));
    expect(deletedOccurrence).toBeUndefined();

    // Verify all other occurrences still exist
    for (const occurrence of occurrencesBefore) {
      if (occurrence.date.isSame(deleteDate, 'day')) {
        continue; // This is the deleted one, skip
      }
      const foundOccurrence = occurrencesAfter.find((a) => a.date.isSame(occurrence.date, 'day'));
      expect(foundOccurrence).toBeDefined();
    }

    console.log('✅ Single instance deleted from recurring assignment');
  });

  test('should delete all instances of recurring assignment', async ({ page }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const tomorrow = dayjs.utc().add(1, 'day');
    await scheduleTestBase.createAssignmentAndRecurrence(
      { workerId: testWorkers[0].id, shiftId: testShifts[0].id, date: tomorrow },
      {
        id: '',
        teamId: testTeam.teamId,
        occurrenceType: OccurrenceType.ASSIGNMENT,
        occurrenceInfo: { workerId: testWorkers[0].id, shiftId: testShifts[0].id, count: null },
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

    const beforeDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const createdRecurrence = beforeDelete.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();

    // Get all assignment occurrences for this recurrence
    const occurrencesBefore = beforeDelete.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence!.id,
    );
    expect(occurrencesBefore.length).toBe(5);

    // Select the first occurrence to delete
    const occurrenceToDelete = occurrencesBefore[0];
    const deleteDate = occurrenceToDelete.date;

    await scheduleTestBase.setScheduleViewSettings(
      page,
      { targetDate: deleteDate, timeFrame: 'week' },
      true,
    );
    const assignmentCell = page.locator(`[data-testid="assignment-cell-${occurrenceToDelete.id}"]`);
    await expect(assignmentCell).toBeVisible({ timeout: 5000 });
    await assignmentCell.click();

    await page.locator('[data-testid="delete-assignment-button"]').click();
    await page.locator('[data-testid="delete-all-radio"]').click();
    await page.locator('[data-testid="recurrence-delete-confirm-button"]').click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );

    // Verify recurrence is deleted
    const remainingRecurrence = afterDelete.recurrencesRead.find(
      (r) => r.id === createdRecurrence!.id,
    );
    expect(remainingRecurrence).toBeUndefined();

    // Verify all occurrences are deleted
    const occurrencesAfter = afterDelete.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence!.id,
    );
    expect(occurrencesAfter.length).toBe(0);

    console.log('✅ All instances of recurring assignment deleted');
  });

  test('should delete this and following instances of recurring assignment', async ({
    page,
  }, testInfo) => {
    const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const tomorrow = dayjs.utc().add(1, 'day');
    await scheduleTestBase.createAssignmentAndRecurrence(
      { workerId: testWorkers[0].id, shiftId: testShifts[0].id, date: tomorrow },
      {
        id: '',
        teamId: testTeam.teamId,
        occurrenceType: OccurrenceType.ASSIGNMENT,
        occurrenceInfo: { workerId: testWorkers[0].id, shiftId: testShifts[0].id, count: null },
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

    const beforeDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const createdRecurrence = beforeDelete.recurrencesRead[0];
    expect(createdRecurrence).toBeDefined();
    const occurrencesBefore = beforeDelete.assignmentsRead
      .filter((a) => a.sourceId === createdRecurrence!.id)
      .sort((a, b) => a.date.valueOf() - b.date.valueOf());
    expect(occurrencesBefore.length).toBe(5);

    const occurrenceToDelete = occurrencesBefore[2];
    const deleteDate = occurrenceToDelete.date;
    await scheduleTestBase.setScheduleViewSettings(
      page,
      { targetDate: deleteDate, timeFrame: 'week' },
      true,
    );

    const assignmentCell = page.locator(`[data-testid="assignment-cell-${occurrenceToDelete.id}"]`);
    await expect(assignmentCell).toBeVisible({ timeout: 5000 });
    await assignmentCell.click();

    await page.locator('[data-testid="delete-assignment-button"]').click();
    await page.locator('[data-testid="delete-this-and-future-radio"]').click();
    await page.locator('[data-testid="recurrence-delete-confirm-button"]').click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );

    // Verify recurrence still exists
    const remainingRecurrence = afterDelete.recurrencesRead.find(
      (r) => r.id === createdRecurrence!.id,
    );
    expect(remainingRecurrence).toBeDefined();

    // Get remaining occurrences
    const occurrencesAfter = afterDelete.assignmentsRead.filter(
      (a) => a.sourceId === createdRecurrence!.id,
    );
    expect(occurrencesAfter.length).toBe(2);
    for (const occurrence of occurrencesBefore) {
      if (occurrence.date.isBefore(deleteDate, 'day')) {
        expect(occurrencesAfter.find((a) => a.date.isSame(occurrence.date, 'day'))).toBeDefined();
      }
    }
    for (const occurrence of occurrencesBefore) {
      if (occurrence.date.isSameOrAfter(deleteDate, 'day')) {
        expect(occurrencesAfter.find((a) => a.date.isSame(occurrence.date, 'day'))).toBeUndefined();
      }
    }
    console.log('✅ This and following instances of recurring assignment deleted');
  });
});

function englishOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

async function selectDate(
  page: import('@playwright/test').Page,
  date: dayjs.Dayjs,
  testid = 'edit-assignment-date-picker',
) {
  const datePicker = page.locator(`[data-testid="${testid}"]`);
  await datePicker.waitFor({ state: 'visible' });
  await expect(datePicker).toBeEnabled({ timeout: 5000 });
  await datePicker.click();

  // Wait for the calendar popover to open by looking for the status element
  const calendar = page.locator('[data-slot="calendar"]').last();
  await calendar.waitFor({ state: 'attached', timeout: 5000 });

  // Navigate to the target month
  const nextBtn = calendar.locator('button[name="Go to the Next Month"]');
  const status = calendar.locator('[role="status"]');

  const targetMonthName = date.format('MMMM');
  const targetYear = date.format('YYYY');

  for (let i = 0; i < 24; i++) {
    const currentStatus = await status.textContent();
    if (currentStatus?.includes(targetMonthName) && currentStatus?.includes(targetYear)) break;
    await nextBtn.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn.click();
    await page.waitForTimeout(200);
  }

  const dayName = [
    date.format('dddd'),
    ', ',
    targetMonthName,
    ' ',
    englishOrdinal(date.date()),
    ', ',
    targetYear,
  ].join('');

  const dayButton = page.getByRole('button', { name: dayName });
  await dayButton.waitFor({ state: 'visible' });
  await dayButton.click();

  await expect(datePicker).toContainText(date.format('D MMMM YYYY'));
}
