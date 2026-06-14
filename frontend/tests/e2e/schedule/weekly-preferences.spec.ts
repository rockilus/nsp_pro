/**
 * E2E tests for Worker Weekly Preferences Display in Schedule Worker Table
 *
 * These tests verify:
 * - Preferences are rendered as expected for the 6-month period
 *   starting from the month following the current month
 * - All weeks and even/odd parity modes work correctly
 * - Multiple restriction types display with correct colors
 * - All-weeks + even/odd on same day show multiple preference elements
 * - Show/hide preferences toggle works
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ScheduleTestBase } from '../../utils/schedule-test-base';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { computePeriodEndDate } from '@/app/lib/utils/scheduleViewSettingsUtils';
import { WeeklySlotPreference } from '@/types/worker';

dayjs.extend(utc);

function periodRange() {
  const start = dayjs.utc().add(1, 'month').startOf('month');
  return { start, end: computePeriodEndDate(start, 'month') };
}

/**
 * Build a single-preference slots array for the common case of one
 * restriction on one day-of-week.
 */
function makePref(
  dayOfWeek: number,
  slot: WeeklySlotPreference['slot'],
  restriction: WeeklySlotPreference['restriction'],
  weekParity: WeeklySlotPreference['weekParity'],
): WeeklySlotPreference[] {
  return [{ dayOfWeek, slot, restriction, shiftIds: [], weekParity }];
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

    // Tuesday (dayOfWeek=1) should not have this preference
    const tuesdayDate = start.day(1);
    if (tuesdayDate.isBefore(start)) {
      tuesdayDate.add(1, 'week');
    }
    const absentId = ScheduleTestBase.buildPreferenceTestId(
      workerId,
      tuesdayDate.format('YYYY-MM-DD'),
      'morning',
      'no_work',
      'all',
    );
    await expect(page.locator(`[data-testid="${absentId}"]`)).toHaveCount(0);
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
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
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

    const slots = makePref(0, 'morning', 'no_work', 'even');
    await base.setWorkerWeeklyPreferences(workerId, slots);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);

    // Expected testids must be visible
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    // Build testids for the odd-weeks variant that MUST be absent
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

      if (tid.includes('-no_work-')) {
        await expect(el).toHaveClass(/bg-red-500/);
      } else if (tid.includes('-no_normal-')) {
        await expect(el).toHaveClass(/bg-amber-500/);
      } else if (tid.includes('-no_duty-')) {
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

    const allExpected = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      slots,
      start,
      end,
    );
    expect(allExpected.length).toBeGreaterThan(0);

    // Each distinct testid (slot/restriction/parity per date) has count 1
    for (const tid of allExpected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(1);
    }

    // Even-week variant present: build even-only expectation and check visible
    const evenOnlySlots = makePref(0, 'morning', 'no_work', 'even');
    const evenOnlyIds = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      evenOnlySlots,
      start,
      end,
    );
    for (const tid of evenOnlyIds) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(1);
    }

    // Odd-week dates must NOT have the even variant
    const oddParitySlots = makePref(0, 'morning', 'no_work', 'odd');
    const oddParityDates = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      oddParitySlots,
      start,
      end,
    );
    for (const oddTid of oddParityDates) {
      const evenVariantTid = oddTid.replace('-odd', '-even');
      await expect(page.locator(`[data-testid="${evenVariantTid}"]`)).toHaveCount(0);
    }
  });

  test('morning no work all + afternoon no work odd on same day', async ({ page }, testInfo) => {
    const base = testBasesMap.get((testInfo as any).testRunId)!;
    const workerId = base.getTestWorkers()[0].id;
    const { start, end } = periodRange();

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

    // Afternoon no_work on even weeks must be absent
    const afternoonEvenSlots = makePref(0, 'afternoon', 'no_work', 'even');
    const afternoonEvenIds = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      afternoonEvenSlots,
      start,
      end,
    );
    for (const tid of afternoonEvenIds) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
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

    // All expected testids visible
    const expected = ScheduleTestBase.buildExpectedPreferenceTestIds(workerId, slots, start, end);
    expect(expected.length).toBeGreaterThan(0);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    // Even weeks: both no_work + no_normal visible
    // Odd weeks: only no_work visible, no_normal absent
    const noNormalEvenSlots = makePref(0, 'morning', 'no_normal', 'even');
    const noNormalEvenIds = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      noNormalEvenSlots,
      start,
      end,
    );
    for (const tid of noNormalEvenIds) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    // no_normal on odd weeks must be absent
    const noNormalOddSlots = makePref(0, 'morning', 'no_normal', 'odd');
    const noNormalOnOdd = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      noNormalOddSlots,
      start,
      end,
    );
    for (const tid of noNormalOnOdd) {
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

    // no_normal on odd weeks must be visible
    const noNormalOddSlots = makePref(0, 'morning', 'no_normal', 'odd');
    const noNormalOddIds = ScheduleTestBase.buildExpectedPreferenceTestIds(
      workerId,
      noNormalOddSlots,
      start,
      end,
    );
    for (const tid of noNormalOddIds) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
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

    // Initially visible
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toBeVisible();
    }

    // Turn off
    await openSettingsAndToggle(page, false);

    // Now hidden
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

    // Turn off first
    await openSettingsAndToggle(page, false);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }

    // Turn back on
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

    // Turn off and verify hidden
    await openSettingsAndToggle(page, false);
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="schedule-table-worker"]', { timeout: 10000 });

    // Still hidden
    for (const tid of expected) {
      await expect(page.locator(`[data-testid="${tid}"]`)).toHaveCount(0);
    }
  });
});
