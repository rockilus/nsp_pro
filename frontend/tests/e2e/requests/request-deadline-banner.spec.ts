import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { randomUUID } from 'crypto';
import { RoleTestBase } from '../../utils/role-test-base';

dayjs.extend(utc);

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
];

interface RequestBannerTestCtx {
  roleTestBase: RoleTestBase;
  team: { teamId: string; name: string };
  ownerUser: any;
  memberUser: any;
  ownerWorker?: any;
  memberWorker?: any;
}

const ctxMap = new Map<string, RequestBannerTestCtx>();

function makeTestRunId(testInfo: { workerIndex: number; title: string }): string {
  return `${testInfo.workerIndex}-${testInfo.title}-${randomUUID()}`;
}

function getCtx(testInfo: object): RequestBannerTestCtx {
  return ctxMap.get((testInfo as any).__runId as string)!;
}

for (const vp of viewports) {
  test.describe(`Request Deadline Banner - ${vp.name}`, () => {
    let team: { teamId: string; name: string };

    test.beforeEach(async ({ page }, testInfo) => {
      const runId = makeTestRunId(testInfo as any);
      (testInfo as any).__runId = runId;

      const roleTestBase = new RoleTestBase();
      await roleTestBase.setupRoleTests(testInfo.workerIndex);
      team = roleTestBase.getTestTeam();

      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Create and attach workers for owner and member users to avoid
      // test leakage similar to schedule-notifications tests
      const owner = roleTestBase.getOwnerUser();
      const ownerWorker = await roleTestBase.createWorkerForUser(
        owner.userId,
        `Owner Worker ${runId}`,
      );
      const memberWorker = await roleTestBase.createWorkerForMember(`Member Worker ${runId}`);

      ctxMap.set(runId, {
        roleTestBase,
        team,
        ownerUser: owner,
        memberUser: roleTestBase.getMemberUser(),
        ownerWorker,
        memberWorker,
      });

      // Act as member (banner is shown to members)
      await roleTestBase.actAsMember(page);

      // Navigate to requests page for the created team
      await roleTestBase.navigateToRequestsPage(page);
      await page.waitForSelector('[data-testid="request-tab"]', { timeout: 10000 });
    });

    test.afterEach(async ({}, testInfo) => {
      ctxMap.delete((testInfo as any).__runId as string);
    });

    test('not displayed if no deadline', async ({ page }, testInfo) => {
      // No deadline set for this team
      await expect(page.locator('[data-testid="request-deadline-banner"]')).toHaveCount(0);
    });

    test('not displayed if deadline belongs to another team', async ({ page }, testInfo) => {
      const ctx = getCtx(testInfo);
      const owner = ctx.roleTestBase.getOwnerUser();

      // Create another team and set a deadline there
      const otherTeam = await ctx.roleTestBase.dbUtils.createTeam({
        name: `Other Team ${Date.now()}`,
        ownerUserId: owner.userId,
      });
      const otherSchedule = await ctx.roleTestBase.dbUtils.createSchedule(otherTeam.teamId);
      const otherDeadline = dayjs.utc().add(2, 'day').toDate();

      await ctx.roleTestBase.dbUtils.setRequestDeadlineAs(
        owner.userId,
        otherSchedule.id,
        otherTeam.teamId,
        otherDeadline,
      );

      // Reload as member of the primary team and ensure banner is not present
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="request-deadline-banner"]')).toHaveCount(0);
    });

    test('not displayed if deadline only on a VALIDATED schedule', async ({ page }, testInfo) => {
      const ctx = getCtx(testInfo);
      const owner = ctx.roleTestBase.getOwnerUser();

      // Create a schedule and set a deadline, then validate the schedule
      const schedule = await ctx.roleTestBase.dbUtils.createSchedule(team.teamId);
      const deadline = dayjs.utc().add(2, 'day').toDate();

      await ctx.roleTestBase.dbUtils.setRequestDeadlineAs(
        owner.userId,
        schedule.id,
        team.teamId,
        deadline,
      );
      await ctx.roleTestBase.dbUtils.validateSchedule(schedule.id, team.teamId);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="request-deadline-banner"]')).toHaveCount(0);
    });

    test('displayed when deadline is on campaign schedule with expected content', async ({
      page,
    }, testInfo) => {
      const ctx = getCtx(testInfo);
      const owner = ctx.roleTestBase.getOwnerUser();

      // Create a campaign schedule and set a future deadline
      const schedule = await ctx.roleTestBase.dbUtils.createSchedule(team.teamId);
      const deadlineDate = dayjs.utc().add(1, 'day').startOf('minute').toDate();

      await ctx.roleTestBase.dbUtils.setRequestDeadlineAs(
        owner.userId,
        schedule.id,
        team.teamId,
        deadlineDate,
      );

      await page.reload();
      await page.waitForLoadState('networkidle');

      const banner = page.locator('[data-testid="request-deadline-banner"]');
      await expect(banner).toBeVisible();

      // The component renders the localized deadline string. For these tests we use 'en'
      const expectedDeadlineStr = dayjs.utc(deadlineDate).locale('en').format('DD MMM [at] HH:mm');
      await expect(banner).toContainText(expectedDeadlineStr);
    });
  });
}
