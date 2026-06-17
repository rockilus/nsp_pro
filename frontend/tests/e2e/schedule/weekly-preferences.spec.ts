/**
 * E2E tests for Worker Weekly Preferences Display in Schedule Worker Table
 *
 * These tests verify:
 * - Preferences are rendered as expected for the 6-month period
 *   starting from the month following the current month
 * - Same restriction across different time slots merges into one cell
 * - All weeks and even/odd parity modes work correctly
 * - no_normal + no_duty on same slot merges to no_work
 * - Multiple restriction types display with correct colors and separate cells
 * - Show/hide preferences toggle works
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ScheduleTestBase } from '../../utils/schedule-test-base';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
import { computePeriodEndDate } from '@/app/lib/utils/scheduleViewSettingsUtils';
import { WeeklySlotPreference } from '@/types/worker';

dayjs.extend(utc);
dayjs.extend(isoWeek);

function periodRange() {
  const start = dayjs.utc().add(1, 'month').startOf('month');
  return { start, end: computePeriodEndDate(start, 'month') };
}

function makePref(
  dayOfWeek: number,
  slot: WeeklySlotPreference['slot'],
  restriction: WeeklySlotPreference['restriction'],
  weekParity: WeeklySlotPreference['weekParity'],
): WeeklySlotPreference[] {
  return [{ dayOfWeek, slot, restriction, shiftIds: [], weekParity }];
}

/**
 * Find one even-week Monday and one odd-week Monday within a date period.
 */
function findParityMondays(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  let evenMonday: string | null = null;
  let oddMonday: string | null = null;
  let current = start.clone();
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    if (current.day() === 1) {
      const parity = current.isoWeek() % 2 === 0 ? 'even' : 'odd';
      if (parity === 'even' && !evenMonday) evenMonday = current.format('YYYY-MM-DD');
      if (parity === 'odd' && !oddMonday) oddMonday = current.format('YYYY-MM-DD');
    }
    if (evenMonday && oddMonday) break;
    current = current.add(1, 'day');
  }
  return { evenMonday, oddMonday };
}

test.describe('Weekly Preferences - Single Restriction All Weeks', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const base = new ScheduleTestBase();
    testBasesMap.set(testRunId, base);
    (testInfo as any).testRunId = testRunId;

    const today = dayjs.utc();
    await base.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
      campaignDates: {
        start: today.startOf('month').utc(),
        end: today.endOf('month').utc(),
      },
    });

    await base.actAsOwner(page);
    await base.navigateToSchedulePage(page);

    const { start } = periodRange();
    await base.setScheduleViewSettings(page, {
      periodStartDate: start,
      timeFrame: 'month',
      groupBy: 'worker',
      showWorkerPreferences: true,
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const id = (testInfo as any).testRunId as string;
    if (id) testBasesMap.delete(id);
  });

  test('morning no work (all weeks)', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'morning', 'no_work', 'all');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    const tuesdayDate = start.day(1);
    if (tuesdayDate.isBefore(start)) {
      tuesdayDate.add(1, 'week');
    }
    const absentId = ScheduleTestBase.buildPreferenceTestId(
      workerId,
      tuesdayDate.format('YYYY-MM-DD'),
      'no_work',
    );
    await expect(page.locator(`[data-testid="${absentId}"]`)).toHaveCount(0);
  });

  test('two workers with same monday morning no work (all weeks)', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workers = base.getTestWorkers();
    const workerId1 = workers[0].id;
    const workerId2 = workers[1].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'morning', 'no_work', 'all');
    await base.setWorkerWeeklyPreferences(workerId1, slots);
    await base.setWorkerWeeklyPreferences(workerId2, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected1 = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId1, slots, start, end);
    expect(expected1.length).toBeGreaterThan(0);
    for (const tid of expected1) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    const expected2 = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId2, slots, start, end);
    expect(expected2.length).toBeGreaterThan(0);
    for (const tid of expected2) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }
  });

  test('afternoon no work (all weeks)', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'afternoon', 'no_work', 'all');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }
  });

  test('night no work (all weeks)', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'night', 'no_work', 'all');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }
  });

  test('morning + afternoon + night no work (all weeks)', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots: WeeklySlotPreference[] = [
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_work', shiftIds: [], weekParity: 'all' },
      { dayOfWeek: 0, slot: 'afternoon', restriction: 'no_work', shiftIds: [], weekParity: 'all' },
      { dayOfWeek: 0, slot: 'night', restriction: 'no_work', shiftIds: [], weekParity: 'all' },
    ];
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    // All three slots merge into one no_work cell per Monday
    for (const tid of expected) {
      const el = page.locator(`[data-testid="${tid}"]`);
      await expect(el).toBeVisible();
      await expect(el).toHaveAttribute('data-slots', 'afternoon,morning,night');
      await expect(el).toHaveClass(/bg-red-500/);
    }
  });
});

test.describe('Weekly Preferences - Single Restriction Even/Odd Parity', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const base = new ScheduleTestBase();
    testBasesMap.set(testRunId, base);
    (testInfo as any).testRunId = testRunId;

    const today = dayjs.utc();
    await base.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
      campaignDates: {
        start: today.startOf('month').utc(),
        end: today.endOf('month').utc(),
      },
    });

    await base.actAsOwner(page);
    await base.navigateToSchedulePage(page);

    const { start } = periodRange();
    await base.setScheduleViewSettings(page, {
      periodStartDate: start,
      timeFrame: 'month',
      groupBy: 'worker',
      showWorkerPreferences: true,
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const id = (testInfo as any).testRunId as string;
    if (id) testBasesMap.delete(id);
  });

  test('morning no work on even weeks only', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();
    const { evenMonday, oddMonday } = findParityMondays(start, end);

    const slots = makePref(0, 'morning', 'no_work', 'even');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    // Odd-week Monday must not have preference
    const oddSlots = makePref(0, 'morning', 'no_work', 'odd');
    const forbidden = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      oddSlots,
      start,
      end,
    );
    for (const tid of forbidden) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }

    // Verify data-slots on an even-week Monday
    if (evenMonday) {
      const tid = ScheduleTestBase.buildPreferenceTestId(workerId, evenMonday, 'no_work');
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveAttribute('data-slots', 'morning');
    }
  });

  test('afternoon no work on odd weeks only', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'afternoon', 'no_work', 'odd');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    const evenSlots = makePref(0, 'afternoon', 'no_work', 'even');
    const forbidden = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      evenSlots,
      start,
      end,
    );
    for (const tid of forbidden) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }
  });

  test('night no work on even weeks only', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'night', 'no_work', 'even');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    const oddSlots = makePref(0, 'night', 'no_work', 'odd');
    const forbidden = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      oddSlots,
      start,
      end,
    );
    for (const tid of forbidden) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }
  });
});

test.describe('Weekly Preferences - Different Restriction Types', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const base = new ScheduleTestBase();
    testBasesMap.set(testRunId, base);
    (testInfo as any).testRunId = testRunId;

    const today = dayjs.utc();
    await base.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
      campaignDates: {
        start: today.startOf('month').utc(),
        end: today.endOf('month').utc(),
      },
    });

    await base.actAsOwner(page);
    await base.navigateToSchedulePage(page);

    const { start } = periodRange();
    await base.setScheduleViewSettings(page, {
      periodStartDate: start,
      timeFrame: 'month',
      groupBy: 'worker',
      showWorkerPreferences: true,
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const id = (testInfo as any).testRunId as string;
    if (id) testBasesMap.delete(id);
  });

  test('morning no duties (all weeks)', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'morning', 'no_duty', 'all');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      const el = page.locator(`[data-testid="${tid}"]`);
      await expect(el).toBeVisible();
      await expect(el).toHaveClass(/bg-blue-500/);
    }
  });

  test('morning no normal (all weeks)', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots = makePref(0, 'morning', 'no_normal', 'all');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      const el = page.locator(`[data-testid="${tid}"]`);
      await expect(el).toBeVisible();
      await expect(el).toHaveClass(/bg-amber-500/);
    }
  });

  test('combo: morning no work + afternoon no normal + night no duties (all weeks)', async ({
    page,
  }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots: WeeklySlotPreference[] = [
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_work', shiftIds: [], weekParity: 'all' },
      {
        dayOfWeek: 0,
        slot: 'afternoon',
        restriction: 'no_normal',
        shiftIds: [],
        weekParity: 'all',
      },
      { dayOfWeek: 0, slot: 'night', restriction: 'no_duty', shiftIds: [], weekParity: 'all' },
    ];
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      const el = page.locator(`[data-testid="${tid}"]`);
      await expect(el).toBeVisible();

      if (tid.endsWith('-no_work')) {
        await expect(el).toHaveClass(/bg-red-500/);
      } else if (tid.endsWith('-no_normal')) {
        await expect(el).toHaveClass(/bg-amber-500/);
      } else if (tid.endsWith('-no_duty')) {
        await expect(el).toHaveClass(/bg-blue-500/);
      }
    }
  });
});

test.describe('Weekly Preferences - All Weeks + Even/Odd on Same Day', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const base = new ScheduleTestBase();
    testBasesMap.set(testRunId, base);
    (testInfo as any).testRunId = testRunId;

    const today = dayjs.utc();
    await base.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
      campaignDates: {
        start: today.startOf('month').utc(),
        end: today.endOf('month').utc(),
      },
    });

    await base.actAsOwner(page);
    await base.navigateToSchedulePage(page);

    const { start } = periodRange();
    await base.setScheduleViewSettings(page, {
      periodStartDate: start,
      timeFrame: 'month',
      groupBy: 'worker',
      showWorkerPreferences: true,
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const id = (testInfo as any).testRunId as string;
    if (id) testBasesMap.delete(id);
  });

  test('morning no work all + morning no work even on same day', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots: WeeklySlotPreference[] = [
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_work', shiftIds: [], weekParity: 'all' },
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_work', shiftIds: [], weekParity: 'even' },
    ];
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    // Both merge into a single no_work cell per Monday
    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(1);
    }
  });

  test('morning no work all + afternoon no work odd on same day', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();
    const { evenMonday, oddMonday } = findParityMondays(start, end);

    const slots: WeeklySlotPreference[] = [
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_work', shiftIds: [], weekParity: 'all' },
      { dayOfWeek: 0, slot: 'afternoon', restriction: 'no_work', shiftIds: [], weekParity: 'odd' },
    ];
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(1);
    }

    // On even-week Monday: only morning, no afternoon
    if (evenMonday) {
      const tid = ScheduleTestBase.buildPreferenceTestId(workerId, evenMonday, 'no_work');
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveAttribute('data-slots', 'morning');
    }

    // On odd-week Monday: both morning and afternoon merge into one cell
    if (oddMonday) {
      const tid = ScheduleTestBase.buildPreferenceTestId(workerId, oddMonday, 'no_work');
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveAttribute(
        'data-slots',
        'afternoon,morning',
      );
    }
  });

  test('morning no work all + morning no normal even on same day', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots: WeeklySlotPreference[] = [
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_work', shiftIds: [], weekParity: 'all' },
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_normal', shiftIds: [], weekParity: 'even' },
    ];
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    // no_work subsumes no_normal on the same slot — only no_work cells visible
    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
      // All merged cells should be no_work (no no_normal cells)
      expect(tid.endsWith('-no_work')).toBe(true);
    }

    // no_normal should not appear anywhere
    const noNormalOnly = makePref(0, 'morning', 'no_normal', 'even');
    const noNormalIds = []; // manually check: no_normal IDs shouldn't exist
    let current = start.clone();
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      if ((current.day() + 6) % 7 === 0 && current.isoWeek() % 2 === 0) {
        noNormalIds.push(
          ScheduleTestBase.buildPreferenceTestId(
            workerId,
            current.format('YYYY-MM-DD'),
            'no_normal',
          ),
        );
      }
      current = current.add(1, 'day');
    }
    for (const tid of noNormalIds) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }
  });

  test('morning no duties all + morning no normal odd on same day', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

    const slots: WeeklySlotPreference[] = [
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_duty', shiftIds: [], weekParity: 'all' },
      { dayOfWeek: 0, slot: 'morning', restriction: 'no_normal', shiftIds: [], weekParity: 'odd' },
    ];
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    // no_normal on even weeks must be absent
    const noNormalEvenSlots = makePref(0, 'morning', 'no_normal', 'even');
    const noNormalEvenIds = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      noNormalEvenSlots,
      start,
      end,
    );
    for (const tid of noNormalEvenIds) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }

    // On odd weeks: no_duty + no_normal merges to no_work
    const { oddMonday } = findParityMondays(start, end);
    if (oddMonday) {
      const tid = ScheduleTestBase.buildPreferenceTestId(workerId, oddMonday, 'no_work');
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveAttribute('data-slots', 'morning');
    }

    // On even weeks: only no_duty (no merge)
    const { evenMonday } = findParityMondays(start, end);
    if (evenMonday) {
      const tid = ScheduleTestBase.buildPreferenceTestId(workerId, evenMonday, 'no_duty');
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveAttribute('data-slots', 'morning');
    }
  });
});

test.describe('Weekly Preferences - Show/Hide Toggle', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const base = new ScheduleTestBase();
    testBasesMap.set(testRunId, base);
    (testInfo as any).testRunId = testRunId;

    const today = dayjs.utc();
    await base.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
      campaignDates: {
        start: today.startOf('month').utc(),
        end: today.endOf('month').utc(),
      },
    });

    const workerId = base.getTestWorkers()[0].id;
    await base.setWorkerWeeklyPreferences(workerId, makePref(0, 'morning', 'no_work', 'all'));

    await base.actAsOwner(page);
    await base.navigateToSchedulePage(page);

    const { start } = periodRange();
    await base.setScheduleViewSettings(page, {
      periodStartDate: start,
      timeFrame: 'month',
      groupBy: 'worker',
      showWorkerPreferences: true,
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const id = (testInfo as any).testRunId as string;
    if (id) testBasesMap.delete(id);
  });

  async function openSettingsAndToggle(page: any, check: boolean) {
    await page.locator('[data-testid="schedule-settings-button"]').click();
    await expect(page.locator('[data-testid="schedule-settings-popover"]')).toBeVisible();

    const checkbox = page.locator('[data-testid="settings-checkbox-worker-preferences"]');
    if (check) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="schedule-settings-popover"]')).not.toBeVisible();
  }

  test('should hide preferences when toggle is turned off', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();
    const slots = makePref(0, 'morning', 'no_work', 'all');

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    await openSettingsAndToggle(page, false);

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }
  });

  test('should show preferences when toggle is turned back on', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();
    const slots = makePref(0, 'morning', 'no_work', 'all');

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);

    await openSettingsAndToggle(page, false);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }

    await openSettingsAndToggle(page, true);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }
  });

  test('should persist show/hide preference across page reload', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();
    const slots = makePref(0, 'morning', 'no_work', 'all');

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);

    await openSettingsAndToggle(page, false);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }
  });
});
