import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DatabaseTestUtils, TestUser } from '../../utils/database-utils';
import { formatToInputDateTime } from '@/lib/date-utils';
import { testConfig } from '../../utils/test-config';

dayjs.extend(utc);

interface RequestDeadlineTestContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
  owner: TestUser;
  schedule: any;
}

const testContextMap = new Map<string, RequestDeadlineTestContext>();

test.describe('RequestDeadlinePanel (campaign page)', () => {
  test.beforeEach(async ({}, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const dbUtils = new DatabaseTestUtils();
    await dbUtils.waitForApiReady();

    const id1 = randomUUID().replace(/-/g, '').slice(0, 24);
    const owner: TestUser = {
      user_id: id1,
      email: `testuser-${id1}@example.com`,
      username: `testuser-${id1}`,
      first_name: 'Test',
      last_name: 'User',
    };

    await dbUtils.createTestUser(owner);

    const team = await dbUtils.createTeam({
      name: `E2E Request Deadline Team ${workerIndex}-${Date.now()}`,
      ownerUserId: owner.user_id,
    });

    const schedule = await dbUtils.createSchedule(team.teamId);

    testContextMap.set(testRunId, { dbUtils, team, owner, schedule });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  test('no deadline display and set button visible', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner } = testContextMap.get(testRunId)!;

    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto(`${testConfig.frontendUrl}/en/plan/campaign/`);
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="request-deadline-panel"]');
    await expect(panel).toBeVisible();

    await expect(panel.locator('[data-testid="current-deadline"]')).toBeVisible();
    await expect(panel.locator('[data-testid="set-deadline-button"]')).toBeVisible();
  });

  test('open set input shows input + confirm + cancel', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner } = testContextMap.get(testRunId)!;

    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto(`${testConfig.frontendUrl}/en/plan/campaign/`);
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="request-deadline-panel"]');

    await panel.locator('[data-testid="set-deadline-button"]').click();

    await expect(panel.locator('[data-testid="deadline-input"]')).toBeVisible();
    await expect(panel.locator('[data-testid="confirm-deadline-button"]')).toBeVisible();
    await expect(panel.locator('[data-testid="cancel-deadline-button"]')).toBeVisible();
  });

  test('confirming set updates request deadline and lastReminderSentAt', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, schedule } = testContextMap.get(testRunId)!;

    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto(`${testConfig.frontendUrl}/en/plan/campaign/`);
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="request-deadline-panel"]');

    await panel.locator('[data-testid="set-deadline-button"]').click();

    const newDeadline = dayjs.utc().add(2, 'day').startOf('minute');
    const inputValue = formatToInputDateTime(newDeadline);

    await panel.locator('[data-testid="deadline-input"]').fill(inputValue);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/request-deadline') && r.status() === 200),
      panel.locator('[data-testid="confirm-deadline-button"]').click(),
    ]);

    await expect(panel.locator('[data-testid="current-deadline"]')).toContainText(
      newDeadline.format('DD/MM/YYYY HH:mm'),
    );

    const schedules = await dbUtils.getSchedules(team.teamId);
    const updated = schedules.find((s: any) => s.id === schedule.id);
    expect(updated.requestDeadline).toBeTruthy();
    expect(updated.lastReminderSentAt).toBeTruthy();
  });

  test('action buttons appear after deadline set', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, schedule } = testContextMap.get(testRunId)!;

    // Set initial deadline via API to reach the state
    const apiDeadline = dayjs.utc().add(1, 'day').toDate();
    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, apiDeadline);

    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto(`${testConfig.frontendUrl}/en/plan/campaign/`);
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="request-deadline-panel"]');

    await expect(panel.locator('[data-testid="edit-deadline-button"]')).toBeVisible();
    await expect(panel.locator('[data-testid="send-reminder-button"]')).toBeVisible();
    await expect(panel.locator('[data-testid="delete-deadline-button"]')).toBeVisible();
  });

  test('editing updates the deadline', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, schedule } = testContextMap.get(testRunId)!;

    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, dayjs.utc().add(1, 'day').toDate());

    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto(`${testConfig.frontendUrl}/en/plan/campaign/`);
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="request-deadline-panel"]');

    await panel.locator('[data-testid="edit-deadline-button"]').click();
    await expect(panel.locator('[data-testid="deadline-input"]')).toBeVisible();

    const updatedDeadline = dayjs.utc().add(3, 'day').startOf('minute');
    await panel.locator('[data-testid="deadline-input"]').fill(formatToInputDateTime(updatedDeadline));

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/request-deadline') && r.status() === 200),
      panel.locator('[data-testid="confirm-deadline-button"]').click(),
    ]);

    await expect(panel.locator('[data-testid="current-deadline"]')).toContainText(
      updatedDeadline.format('DD/MM/YYYY HH:mm'),
    );

    const schedules = await dbUtils.getSchedules(team.teamId);
    const updated = schedules.find((s: any) => s.id === schedule.id);
    expect(updated.requestDeadline).toBeTruthy();
  });

  test('resend reminder updates lastReminderSentAt', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, schedule } = testContextMap.get(testRunId)!;

    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, dayjs.utc().add(1, 'day').toDate());

    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto(`${testConfig.frontendUrl}/en/plan/campaign/`);
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="request-deadline-panel"]');

    const before = (await dbUtils.getSchedules(team.teamId)).find((s: any) => s.id === schedule.id)
      .lastReminderSentAt;

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/reminder') && r.status() === 200),
      panel.locator('[data-testid="send-reminder-button"]').click(),
    ]);

    const after = (await dbUtils.getSchedules(team.teamId)).find((s: any) => s.id === schedule.id)
      .lastReminderSentAt;

    expect(after).toBeTruthy();
    if (before) {
      expect(dayjs.utc(after).isAfter(dayjs.utc(before))).toBeTruthy();
    }
  });

  test('delete clears deadline and lastReminderSentAt and UI returns to no-deadline', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, schedule } = testContextMap.get(testRunId)!;

    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, dayjs.utc().add(1, 'day').toDate());

    await dbUtils.authenticatePageAsUser(page, owner.user_id);
    await page.goto(`${testConfig.frontendUrl}/en/plan/campaign/`);
    await page.evaluate((teamId) => localStorage.setItem('selectedTeamId', teamId), team.teamId);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('[data-testid="request-deadline-panel"]');

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/request-deadline') && r.status() === 200),
      panel.locator('[data-testid="delete-deadline-button"]').click(),
    ]);

    const updated = (await dbUtils.getSchedules(team.teamId)).find((s: any) => s.id === schedule.id);
    expect(updated.requestDeadline).toBeFalsy();
    expect(updated.lastReminderSentAt).toBeFalsy();

    await expect(panel.locator('[data-testid="current-deadline"]')).toBeVisible();
    await expect(panel.locator('[data-testid="set-deadline-button"]')).toBeVisible();
  });
});
