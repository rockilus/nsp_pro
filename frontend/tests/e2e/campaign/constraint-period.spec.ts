import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DatabaseTestUtils, TestUser } from '../../utils/database-utils';
import {
  ConstraintType,
  BlockNameOptions,
  BlockTypeOptions,
  SWOIdTypes,
  type ConstraintT,
} from '@/types/constraint';
import { ShiftType, ShiftRestType, ShiftLeaveType } from '@/types/shift';
import { ScheduleT } from '@/types/schedule';

dayjs.extend(utc);

interface ConstraintPeriodTestContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
  owner: TestUser;
  constraint: ConstraintT;
  worker: any;
  morningShift: any;
  schedule: ScheduleT;
}

const testContextMap = new Map<string, ConstraintPeriodTestContext>();

test.describe('Constraint effective period', () => {
  test.beforeEach(async ({}, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const dbUtils = new DatabaseTestUtils();

    const ownerId = randomUUID().replace(/-/g, '').slice(0, 24);

    const owner: TestUser = {
      user_id: ownerId,
      email: `owner-${ownerId}@example.com`,
      username: `owner-${ownerId}`,
      first_name: 'Owner',
      last_name: 'User',
    };

    await dbUtils.createTestUser(owner);

    const team = await dbUtils.createTeam({
      name: `ConstrPeriod ${workerIndex}-${Date.now()}`,
      ownerUserId: owner.user_id,
    });

    const worker = await dbUtils.createWorker({
      teamId: team.teamId,
      name: 'Worker 0',
      weeklyHours: 40,
    });

    const morningShift = await dbUtils.createShift({
      teamId: team.teamId,
      name: 'Morning',
      acronym: 'MOR',
      startTime: dayjs.utc('2026-01-01T08:00:00Z'),
      endTime: dayjs.utc('2026-01-01T14:00:00Z'),
      shiftType: ShiftType.NORMAL,
      restType: ShiftRestType.NONE,
      leaveType: ShiftLeaveType.NONE,
    });
    await dbUtils.createShift({
      teamId: team.teamId,
      name: 'Afternoon',
      acronym: 'AFT',
      startTime: dayjs.utc('2026-01-01T14:00:00Z'),
      endTime: dayjs.utc('2026-01-01T20:00:00Z'),
      shiftType: ShiftType.NORMAL,
      restType: ShiftRestType.NONE,
      leaveType: ShiftLeaveType.NONE,
    });

    const constraint = await dbUtils.createConstraint({
      teamId: team.teamId,
      constraintType: ConstraintType.FIL,
      templateId: '5',
      language: 'en',
      blocks: [
        {
          name: BlockNameOptions.WORKER,
          type: BlockTypeOptions.SHIFT_WORKER_OPTION,
          value: [
            {
              name: 'Worker 0',
              id: worker.id,
              idType: SWOIdTypes.WORKER,
              isBoolDim: false,
              categoryName: 'Workers',
            },
          ],
        },
        {
          name: BlockNameOptions.OPERATOR,
          type: BlockTypeOptions.STRING,
          value: 'should not',
        },
        {
          name: BlockNameOptions.TEXT,
          type: BlockTypeOptions.STRING,
          value: 'work',
        },
        {
          name: BlockNameOptions.SHIFT,
          type: BlockTypeOptions.SHIFT_WORKER_OPTION,
          value: [
            {
              name: 'Morning',
              id: morningShift.id,
              idType: SWOIdTypes.SHIFT,
              isBoolDim: false,
              categoryName: 'Shifts',
            },
          ],
        },
      ],
      text: 'Worker 0 should not work Morning',
      hard: true,
      priority: 'medium',
      active: true,
    });

    const schedule = await dbUtils.createSchedule(team.teamId);

    testContextMap.set(testRunId, {
      dbUtils,
      team,
      owner,
      constraint,
      worker,
      morningShift,
      schedule,
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  test('sets a custom effective period and updates the schedule', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const ctx = testContextMap.get(testRunId)!;
    const { dbUtils, team, owner, constraint, schedule } = ctx;

    // Add constraint to schedule via API
    await dbUtils.updateSchedule({
      ...schedule,
      startDate: dayjs.utc('2026-01-01'),
      endDate: dayjs.utc('2026-01-07'),
      constraintBuildIds: [constraint.id],
    });

    // Navigate to campaign page
    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto('http://localhost:3000/en/plan/campaign/');
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="campaign-page-heading"]');

    // Click calendar button for the constraint
    const calendarButton = page.locator(
      `[data-testid="constraint-period-button-${constraint.id}"]`,
    );
    await calendarButton.waitFor({ state: 'visible' });
    await calendarButton.click();

    // Uncheck "entire campaign"
    const entireCheckbox = page.locator(
      '[data-testid="constraint-period-entire-campaign-checkbox"]',
    );
    await entireCheckbox.waitFor({ state: 'visible' });
    await expect(entireCheckbox).toBeChecked();
    await entireCheckbox.uncheck();

    // Fill start date
    const startInput = page.locator('[data-testid="constraint-period-start-date"]');
    await startInput.waitFor({ state: 'visible' });
    await startInput.click({ clickCount: 3 });
    await startInput.fill('02/01/2026');
    await startInput.blur();

    // Fill end date
    const endInput = page.locator('[data-testid="constraint-period-end-date"]');
    await endInput.waitFor({ state: 'visible' });
    await endInput.click({ clickCount: 3 });
    await endInput.fill('05/01/2026');
    await endInput.blur();

    // Save
    await page.click('[data-testid="constraint-period-save-button"]');

    // Verify UI: period display text
    const display = page.locator(`[data-testid="constraint-period-display-${constraint.id}"]`);
    await display.waitFor({ state: 'visible' });
    await expect(display).toContainText('Jan 2, 2026');
    await expect(display).toContainText('Jan 5, 2026');

    // Verify API: schedule has correct constraintEffectivePeriods
    const schedules = await dbUtils.getSchedules(team.teamId);
    const campaign = schedules.find((s) => s.status === 0) as ScheduleT;
    expect(campaign).toBeDefined();
    const effectivePeriod = campaign.constraintEffectivePeriods?.[constraint.id];
    expect(effectivePeriod).toBeDefined();
    expect(effectivePeriod).not.toBeNull();
    if (effectivePeriod) {
      expect(effectivePeriod.startDate.format('YYYY-MM-DD')).toBe('2026-01-02');
      expect(effectivePeriod.endDate.format('YYYY-MM-DD')).toBe('2026-01-05');
    }
  });

  test('reverts to entire campaign when checkbox is toggled', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const ctx = testContextMap.get(testRunId)!;
    const { dbUtils, team, owner, constraint, schedule } = ctx;

    // Set schedule with constraint selected AND a pre-existing effective period
    await dbUtils.updateSchedule({
      ...schedule,
      startDate: dayjs.utc('2026-01-01'),
      endDate: dayjs.utc('2026-01-07'),
      constraintBuildIds: [constraint.id],
      constraintEffectivePeriods: {
        [constraint.id]: {
          startDate: dayjs.utc('2026-01-02'),
          endDate: dayjs.utc('2026-01-05'),
        },
      },
    });

    // Navigate to campaign page
    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto('http://localhost:3000/en/plan/campaign/');
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="campaign-page-heading"]');

    // Verify initial display shows date range
    const display = page.locator(`[data-testid="constraint-period-display-${constraint.id}"]`);
    await display.waitFor({ state: 'visible' });
    await expect(display).toContainText('Jan 2, 2026');

    // Open dialog
    const calendarButton = page.locator(
      `[data-testid="constraint-period-button-${constraint.id}"]`,
    );
    await calendarButton.waitFor({ state: 'visible' });
    await calendarButton.click();

    // Verify dialog shows dates pre-filled (checkbox unchecked)
    const entireCheckbox = page.locator(
      '[data-testid="constraint-period-entire-campaign-checkbox"]',
    );
    await entireCheckbox.waitFor({ state: 'visible' });
    await expect(entireCheckbox).not.toBeChecked();

    // Check "entire campaign"
    await entireCheckbox.check();

    // Save
    await page.click('[data-testid="constraint-period-save-button"]');

    // Verify UI: period display now shows "Entire campaign"
    await expect(display).toContainText('Entire campaign');

    // Verify API: constraintEffectivePeriods now has null
    const schedules = await dbUtils.getSchedules(team.teamId);
    const campaign = schedules.find((s) => s.status === 0) as ScheduleT;
    expect(campaign).toBeDefined();
    const effectivePeriod = campaign.constraintEffectivePeriods?.[constraint.id];
    expect(effectivePeriod).toBeNull();
  });

  test('clamps effective period when campaign end date is reduced', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const ctx = testContextMap.get(testRunId)!;
    const { dbUtils, team, owner, constraint, schedule } = ctx;

    // Set schedule with effective period Jan 2–5 on a Jan 1–7 campaign
    await dbUtils.updateSchedule({
      ...schedule,
      startDate: dayjs.utc('2026-01-01'),
      endDate: dayjs.utc('2026-01-07'),
      constraintBuildIds: [constraint.id],
      constraintEffectivePeriods: {
        [constraint.id]: {
          startDate: dayjs.utc('2026-01-02'),
          endDate: dayjs.utc('2026-01-05'),
        },
      },
    });

    // Navigate to campaign page
    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto('http://localhost:3000/en/plan/campaign/');
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="campaign-page-heading"]');

    // Verify initial period display
    const display = page.locator(`[data-testid="constraint-period-display-${constraint.id}"]`);
    await display.waitFor({ state: 'visible' });
    await expect(display).toContainText('Jan 2, 2026');
    await expect(display).toContainText('Jan 5, 2026');

    // Change campaign end date from Jan 7 to Jan 3
    const endDateInput = page.locator('[data-testid="campaign-end-date"]');
    await endDateInput.fill('2026-01-03');
    await endDateInput.blur();
    await endDateInput.dispatchEvent('change');

    // Wait for the period display to update (clamped to Jan 2–3)
    await expect(display).toContainText('Jan 3, 2026');
    await expect(display).not.toContainText('Jan 5, 2026');

    // Verify API: constraintEffectivePeriods is now clamped
    const schedules = await dbUtils.getSchedules(team.teamId);
    const campaign = schedules.find((s) => s.status === 0) as ScheduleT;
    expect(campaign).toBeDefined();
    const effectivePeriod = campaign.constraintEffectivePeriods?.[constraint.id];
    expect(effectivePeriod).toBeDefined();
    expect(effectivePeriod).not.toBeNull();
    if (effectivePeriod) {
      expect(effectivePeriod.startDate.format('YYYY-MM-DD')).toBe('2026-01-02');
      expect(effectivePeriod.endDate.format('YYYY-MM-DD')).toBe('2026-01-03');
    }
  });
});
