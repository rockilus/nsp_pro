/**
 * E2E tests for Stats Visibility Toggle
 *
 * Covers toggling showStats in team general settings via UI,
 * API verification of persisted value, and member access control
 * changes when the setting is enabled or disabled.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { RoleTestBase } from '../../../utils/role-test-base';
import { TeamApi } from '../../../../src/app/lib/api/teamApi';

test.describe('Stats Visibility Toggle', () => {
  const testBasesMap = new Map<string, RoleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting stats visibility toggle test setup`);

    const base = new RoleTestBase();
    testBasesMap.set(testRunId, base);
    (testInfo as any).testRunId = testRunId;

    await base.setupRoleTests(workerIndex);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test.describe('Settings UI', () => {
    test('owner can see the showStats checkbox in team general settings', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;

      await base.actAsOwner(page);
      await base.navigateToTeamGeneralPage(page);

      await expect(page.locator('[data-testid="team-general-page-heading"]')).toBeVisible();

      const showStatsCheckbox = page.locator('[data-testid="show-stats-checkbox"]');
      await expect(showStatsCheckbox).toBeVisible();

      console.log('✅ Owner can see showStats checkbox in team general settings');
    });

    test('showStats is unchecked by default for new teams', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;

      const testTeam = base.getTestTeam();
      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(base.getOwnerUser().userId);
      const team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      expect(team.showStats).toBe(false);

      console.log('✅ showStats is false by default for new teams');
    });

    test('toggling showStats via UI persists the value', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const testTeam = base.getTestTeam();

      await base.actAsOwner(page);
      await base.navigateToTeamGeneralPage(page);

      await expect(page.locator('[data-testid="team-general-page-heading"]')).toBeVisible();

      const showStatsCheckbox = page.locator('[data-testid="show-stats-checkbox"]');
      await expect(showStatsCheckbox).toBeVisible();

      // Toggle on
      await showStatsCheckbox.check();
      await page.waitForTimeout(500);

      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(base.getOwnerUser().userId);
      let team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      expect(team.showStats).toBe(true);

      // Toggle off
      await showStatsCheckbox.uncheck();
      await page.waitForTimeout(500);

      team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      expect(team.showStats).toBe(false);

      console.log('✅ Toggling showStats via UI persists correctly');
    });
  });

  test.describe('Member Access Control', () => {
    test('member can access stats page after owner enables showStats', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const testTeam = base.getTestTeam();

      // Owner enables showStats
      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(base.getOwnerUser().userId);
      const team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      await TeamApi.updateTeam(ownerClient, testTeam.teamId, {
        ...team,
        showStats: true,
      });

      // Member navigates to stats page
      await base.actAsMember(page);
      await base.navigateToStatsPage(page);

      await expect(page.locator('[data-testid="stats-page-heading"]')).toBeVisible();
      await base.verifyPageAccessible(page, '/plan/stats');

      console.log('✅ Member can access stats page when showStats is enabled');
    });

    test('member is redirected when owner disables showStats', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const testTeam = base.getTestTeam();

      // Owner enables showStats first
      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(base.getOwnerUser().userId);
      const team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      await TeamApi.updateTeam(ownerClient, testTeam.teamId, {
        ...team,
        showStats: true,
      });

      // Verify member can access
      await base.actAsMember(page);
      await base.navigateToStatsPage(page);
      await expect(page.locator('[data-testid="stats-page-heading"]')).toBeVisible();

      // Owner disables showStats
      const updatedTeam = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      await TeamApi.updateTeam(ownerClient, testTeam.teamId, {
        ...updatedTeam,
        showStats: false,
      });

      // Member tries to navigate again
      await base.actAsMember(page);
      await base.navigateToStatsPage(page);

      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);
      await base.verifyPageNotAccessible(page, '/plan/stats');

      console.log('✅ Member is redirected after owner disables showStats');
    });

    test('owner always sees stats page regardless of showStats value', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const testTeam = base.getTestTeam();

      // Ensure showStats is false
      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(base.getOwnerUser().userId);
      const team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      await TeamApi.updateTeam(ownerClient, testTeam.teamId, {
        ...team,
        showStats: false,
      });

      // Owner should still be able to access stats
      await base.actAsOwner(page);
      await base.navigateToStatsPage(page);

      await expect(page.locator('[data-testid="stats-page-heading"]')).toBeVisible();
      await base.verifyPageAccessible(page, '/plan/stats');

      console.log('✅ Owner always sees stats page regardless of showStats');
    });

    test('member cannot access stats page by default (showStats=false)', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;

      await base.actAsMember(page);
      await base.navigateToStatsPage(page);

      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);
      await base.verifyPageNotAccessible(page, '/plan/stats');

      console.log('✅ Member cannot access stats page by default');
    });
  });
});
