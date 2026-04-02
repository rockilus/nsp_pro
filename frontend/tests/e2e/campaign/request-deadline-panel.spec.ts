import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { RoleTestBase } from '../../utils/role-test-base';
import { formatToInputDateTime } from '@/lib/date-utils';

dayjs.extend(utc);

const roleTestBase = new RoleTestBase();

test.describe('RequestDeadlinePanel (campaign page)', () => {
  let team: { teamId: string; name: string };
  let schedule: any;

  test.beforeEach(async () => {
    // Create team and users
    await roleTestBase.setupRoleTests(test.info().workerIndex);
    team = roleTestBase.getTestTeam();
    // Create a campaign schedule for the team
    schedule = await roleTestBase.dbUtils.createSchedule(team.teamId);
  });

  test('no deadline display and set button visible', async ({ page }) => {
    await roleTestBase.actAsOwner(page);
    await roleTestBase.navigateToCampaignPage(page);

    const panel = page.locator('[data-testid="request-deadline-panel"]');
    await expect(panel).toBeVisible();

    // When no deadline set, current-deadline should show the fallback text
    await expect(panel.locator('[data-testid="current-deadline"]')).toBeVisible();
    await expect(panel.locator('[data-testid="set-deadline-button"]')).toBeVisible();
  });

  test('open set input shows input + confirm + cancel', async ({ page }) => {
    await roleTestBase.actAsOwner(page);
    await roleTestBase.navigateToCampaignPage(page);
    const panel = page.locator('[data-testid="request-deadline-panel"]');

    await panel.locator('[data-testid="set-deadline-button"]').click();

    await expect(panel.locator('[data-testid="deadline-input"]')).toBeVisible();
    await expect(panel.locator('[data-testid="confirm-deadline-button"]')).toBeVisible();
    await expect(panel.locator('[data-testid="cancel-deadline-button"]')).toBeVisible();
  });

  test('confirming set updates request deadline and lastReminderSentAt', async ({ page }) => {
    await roleTestBase.actAsOwner(page);
    await roleTestBase.navigateToCampaignPage(page);
    const panel = page.locator('[data-testid="request-deadline-panel"]');

    await panel.locator('[data-testid="set-deadline-button"]').click();

    const newDeadline = dayjs.utc().add(2, 'day').startOf('minute');
    const inputValue = formatToInputDateTime(newDeadline);

    await panel.locator('[data-testid="deadline-input"]').fill(inputValue);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/request-deadline') && r.status() === 200),
      panel.locator('[data-testid="confirm-deadline-button"]').click(),
    ]);

    // UI shows formatted deadline
    await expect(panel.locator('[data-testid="current-deadline"]')).toContainText(
      newDeadline.format('DD/MM/YYYY HH:mm'),
    );

    // Server-side schedule should have requestDeadline and lastReminderSentAt set
    const schedules = await roleTestBase.dbUtils.getSchedules(team.teamId);
    const updated = schedules.find((s: any) => s.id === schedule.id);
    expect(updated.requestDeadline).toBeTruthy();
    expect(updated.lastReminderSentAt).toBeTruthy();
  });

  test('action buttons appear after deadline set', async ({ page }) => {
    await roleTestBase.actAsOwner(page);
    await roleTestBase.navigateToCampaignPage(page);
    const panel = page.locator('[data-testid="request-deadline-panel"]');

    // Set initial deadline via API to reach the state
    const apiDeadline = dayjs.utc().add(1, 'day').toDate();
    await roleTestBase.dbUtils.setRequestDeadlineAs(
      roleTestBase.getOwnerUser().userId,
      schedule.id,
      team.teamId,
      apiDeadline,
    );

    await page.reload();

    await expect(panel.locator('[data-testid="edit-deadline-button"]')).toBeVisible();
    await expect(panel.locator('[data-testid="send-reminder-button"]')).toBeVisible();
    await expect(panel.locator('[data-testid="delete-deadline-button"]')).toBeVisible();
  });

  test('editing updates the deadline', async ({ page }) => {
    await roleTestBase.actAsOwner(page);
    await roleTestBase.navigateToCampaignPage(page);
    const panel = page.locator('[data-testid="request-deadline-panel"]');

    // Ensure a deadline exists first
    await roleTestBase.dbUtils.setRequestDeadlineAs(
      roleTestBase.getOwnerUser().userId,
      schedule.id,
      team.teamId,
      dayjs.utc().add(1, 'day').toDate(),
    );

    await page.reload();

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

    const schedules = await roleTestBase.dbUtils.getSchedules(team.teamId);
    const updated = schedules.find((s: any) => s.id === schedule.id);
    expect(updated.requestDeadline).toBeTruthy();
  });

  test('resend reminder updates lastReminderSentAt', async ({ page }) => {
    await roleTestBase.actAsOwner(page);
    await roleTestBase.navigateToCampaignPage(page);
    const panel = page.locator('[data-testid="request-deadline-panel"]');

    // Ensure a deadline exists first
    await roleTestBase.dbUtils.setRequestDeadlineAs(
      roleTestBase.getOwnerUser().userId,
      schedule.id,
      team.teamId,
      dayjs.utc().add(1, 'day').toDate(),
    );

    await page.reload();

    const before = (await roleTestBase.dbUtils.getSchedules(team.teamId)).find(
      (s: any) => s.id === schedule.id,
    ).lastReminderSentAt;

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/reminder') && r.status() === 200),
      panel.locator('[data-testid="send-reminder-button"]').click(),
    ]);

    const after = (await roleTestBase.dbUtils.getSchedules(team.teamId)).find(
      (s: any) => s.id === schedule.id,
    ).lastReminderSentAt;

    expect(after).toBeTruthy();
    if (before) {
      expect(dayjs.utc(after).isAfter(dayjs.utc(before))).toBeTruthy();
    }
  });

  test('delete clears deadline and lastReminderSentAt and UI returns to no-deadline', async ({ page }) => {
    await roleTestBase.actAsOwner(page);
    await roleTestBase.navigateToCampaignPage(page);
    const panel = page.locator('[data-testid="request-deadline-panel"]');

    // Ensure a deadline exists first
    await roleTestBase.dbUtils.setRequestDeadlineAs(
      roleTestBase.getOwnerUser().userId,
      schedule.id,
      team.teamId,
      dayjs.utc().add(1, 'day').toDate(),
    );

    await page.reload();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/request-deadline') && r.status() === 200),
      panel.locator('[data-testid="delete-deadline-button"]').click(),
    ]);

    // Server should show fields cleared
    const updated = (await roleTestBase.dbUtils.getSchedules(team.teamId)).find(
      (s: any) => s.id === schedule.id,
    );
    expect(updated.requestDeadline).toBeFalsy();
    expect(updated.lastReminderSentAt).toBeFalsy();

    // UI returns to no-deadline state
    await expect(panel.locator('[data-testid="current-deadline"]')).toBeVisible();
    await expect(panel.locator('[data-testid="set-deadline-button"]')).toBeVisible();
  });
});
