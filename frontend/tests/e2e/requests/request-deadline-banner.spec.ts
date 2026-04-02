import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { RoleTestBase } from '../../utils/role-test-base';

dayjs.extend(utc);

const roleTestBase = new RoleTestBase();

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
];

for (const vp of viewports) {
  test.describe(`Request Deadline Banner - ${vp.name}`, () => {
    let team: { teamId: string; name: string };

    test.beforeEach(async ({ page }, testInfo) => {
      await roleTestBase.setupRoleTests(testInfo.workerIndex);
      team = roleTestBase.getTestTeam();

      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Act as member (banner is shown to members)
      await roleTestBase.actAsMember(page);

      // Navigate to requests page for the created team
      await roleTestBase.navigateToRequestsPage(page);
      await page.waitForSelector('[data-testid="request-tab"]', { timeout: 10000 });
    });

    test('not displayed if no deadline', async ({ page }) => {
      await expect(page.locator('[data-testid="request-deadline-banner"]')).toHaveCount(0);
    });

    test('not displayed if deadline belongs to another team', async ({ page }) => {
      const owner = roleTestBase.getOwnerUser();

      // Create another team and set a deadline there
      const otherTeam = await roleTestBase.dbUtils.createTeam({
        name: `Other Team ${Date.now()}`,
        ownerUserId: owner.userId,
      });
      const otherSchedule = await roleTestBase.dbUtils.createSchedule(otherTeam.teamId);
      const otherDeadline = dayjs.utc().add(2, 'day').toDate();

      await roleTestBase.dbUtils.setRequestDeadlineAs(
        owner.userId,
        otherSchedule.id,
        otherTeam.teamId,
        otherDeadline,
      );

      // Reload as member of the primary team and ensure banner is not present
      await page.reload();
      await expect(page.locator('[data-testid="request-deadline-banner"]')).toHaveCount(0);
    });

    test('not displayed if deadline only on a VALIDATED schedule', async ({ page }) => {
      const owner = roleTestBase.getOwnerUser();

      // Create a schedule and set a deadline, then validate the schedule
      const schedule = await roleTestBase.dbUtils.createSchedule(team.teamId);
      const deadline = dayjs.utc().add(2, 'day').toDate();

      await roleTestBase.dbUtils.setRequestDeadlineAs(owner.userId, schedule.id, team.teamId, deadline);
      await roleTestBase.dbUtils.validateSchedule(schedule.id, team.teamId);

      await page.reload();
      await expect(page.locator('[data-testid="request-deadline-banner"]')).toHaveCount(0);
    });

    test('displayed when deadline is on campaign schedule with expected content', async ({ page }) => {
      const owner = roleTestBase.getOwnerUser();

      // Create a campaign schedule and set a future deadline
      const schedule = await roleTestBase.dbUtils.createSchedule(team.teamId);
      const deadlineDate = dayjs.utc().add(1, 'day').startOf('minute').toDate();

      await roleTestBase.dbUtils.setRequestDeadlineAs(owner.userId, schedule.id, team.teamId, deadlineDate);

      await page.reload();

      const banner = page.locator('[data-testid="request-deadline-banner"]');
      await expect(banner).toBeVisible();

      // The component renders the localized deadline string. For these tests we use 'en'
      const expectedDeadlineStr = dayjs.utc(deadlineDate).locale('en').format('DD MMM [at] HH:mm');
      await expect(banner).toContainText(expectedDeadlineStr);
    });
  });
}
