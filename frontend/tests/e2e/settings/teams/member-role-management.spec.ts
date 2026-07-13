/**
 * E2E tests for Member Role Management
 *
 * Covers role promotion/demotion via UI, API verification of persisted roles,
 * access control changes after role transitions, and invitation role selection.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { RoleTestBase } from '../../../utils/role-test-base';
import { TeamApi } from '../../../../src/app/lib/api/teamApi';
import { TeamInvitationApi } from '../../../../src/app/lib/api/teamInvitationApi';
import { TeamMembershipRole } from '../../../../src/types/team';
import { TeamInvitationType } from '../../../../src/types/team-invitation';

test.describe('Member Role Management', () => {
  const testBasesMap = new Map<string, RoleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting member role management test setup`);

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

  test.describe('Role Change via UI', () => {
    test('owner can promote member to owner via edit dialog and role is persisted', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const memberUser = base.getMemberUser();
      const testTeam = base.getTestTeam();

      await base.actAsOwner(page);
      await base.navigateToTeamMembersPage(page);

      await expect(page.locator('[data-testid="team-members-page-heading"]')).toBeVisible();

      const memberRow = page.locator(`[data-testid="member-row-${memberUser.userId}"]`);
      await expect(memberRow).toBeVisible();

      const roleBadge = memberRow.locator(`[data-testid="member-role-badge-${memberUser.userId}"]`);
      await expect(roleBadge).toBeVisible();

      await memberRow.locator(`[data-testid="member-edit-button-${memberUser.userId}"]`).click();

      const dialog = page.locator('[data-testid="edit-member-dialog"]');
      await expect(dialog).toBeVisible();

      await dialog.locator('[data-testid="edit-member-role-select"]').click();
      await page.locator('[data-testid="edit-member-role-option-owner"]').click();

      await dialog.locator('[data-testid="edit-member-save-button"]').click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(base.getOwnerUser().userId);
      const users = await TeamApi.getTeamUsersWithMemberships(ownerClient, testTeam.teamId);
      const updatedUser = users.find((u) => u.user.id === memberUser.userId);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.membership.role).toBe(TeamMembershipRole.OWNER);

      console.log('✅ Member promoted to owner via edit dialog, verified via API');
    });

    test('owner can demote owner back to member via edit dialog and role is persisted', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const memberUser = base.getMemberUser();
      const testTeam = base.getTestTeam();

      await base.dbUtils.changeMemberRole(testTeam.teamId, memberUser.userId, 'owner');

      await base.actAsOwner(page);
      await base.navigateToTeamMembersPage(page);

      await expect(page.locator('[data-testid="team-members-page-heading"]')).toBeVisible();

      const memberRow = page.locator(`[data-testid="member-row-${memberUser.userId}"]`);
      await expect(memberRow).toBeVisible();

      await memberRow.locator(`[data-testid="member-edit-button-${memberUser.userId}"]`).click();

      const dialog = page.locator('[data-testid="edit-member-dialog"]');
      await expect(dialog).toBeVisible();

      await dialog.locator('[data-testid="edit-member-role-select"]').click();
      await page.locator('[data-testid="edit-member-role-option-member"]').click();

      await dialog.locator('[data-testid="edit-member-save-button"]').click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(base.getOwnerUser().userId);
      const users = await TeamApi.getTeamUsersWithMemberships(ownerClient, testTeam.teamId);
      const updatedUser = users.find((u) => u.user.id === memberUser.userId);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.membership.role).toBe(TeamMembershipRole.MEMBER);

      console.log('✅ Owner demoted to member via edit dialog, verified via API');
    });
  });

  test.describe('Access Control After Role Change', () => {
    test('promoted member (now owner) can access workers page', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const memberUser = base.getMemberUser();
      const testTeam = base.getTestTeam();

      await base.dbUtils.changeMemberRole(testTeam.teamId, memberUser.userId, 'owner');

      await base.dbUtils.authenticatePageAsUser(page, memberUser.userId);
      await base.navigateToWorkersPage(page);

      await expect(page.locator('[data-testid="workers-page-heading"]')).toBeVisible();
      await base.verifyPageAccessible(page, '/plan/workers');

      console.log('✅ Promoted member can access workers page');
    });

    test('demoted member cannot access workers page', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const memberUser = base.getMemberUser();
      const testTeam = base.getTestTeam();

      await base.dbUtils.changeMemberRole(testTeam.teamId, memberUser.userId, 'owner');
      await base.dbUtils.changeMemberRole(testTeam.teamId, memberUser.userId, 'member');

      await base.dbUtils.authenticatePageAsUser(page, memberUser.userId);
      await base.navigateToWorkersPage(page);

      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);
      await base.verifyPageNotAccessible(page, '/plan/workers');

      console.log('✅ Demoted member cannot access workers page');
    });
  });

  test.describe('UI Edge Cases', () => {
    test("last remaining owner's role select is disabled in edit dialog", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const ownerUser = base.getOwnerUser();

      await base.actAsOwner(page);
      await base.navigateToTeamMembersPage(page);

      await expect(page.locator('[data-testid="team-members-page-heading"]')).toBeVisible();

      const ownerRow = page.locator(`[data-testid="member-row-${ownerUser.userId}"]`);
      await expect(ownerRow).toBeVisible();

      const editButton = ownerRow.locator(`[data-testid="member-edit-button-${ownerUser.userId}"]`);
      await expect(editButton).toBeVisible();
      await editButton.click();

      const dialog = page.locator('[data-testid="edit-member-dialog"]');
      await expect(dialog).toBeVisible();

      const roleSelectTrigger = dialog.locator('[data-testid="edit-member-role-select"]');
      await expect(roleSelectTrigger).toBeDisabled();

      const workerSelectTrigger = dialog.locator('[data-testid="edit-member-worker-select"]');
      await expect(workerSelectTrigger).not.toBeDisabled();

      await dialog.locator('[data-testid="edit-member-cancel-button"]').click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      console.log('✅ Last owner role select disabled, worker select enabled');
    });

    test('member cannot access team members page', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;

      await base.actAsMember(page);
      await base.navigateToTeamMembersPage(page);

      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);
      await base.verifyPageNotAccessible(page, '/teams/members');

      console.log('✅ Member cannot access team members page');
    });
  });

  test.describe('Invitation Role Selection', () => {
    test('invite dialog defaults role to member', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;

      await base.actAsOwner(page);
      await base.navigateToTeamMembersPage(page);

      await expect(page.locator('[data-testid="team-members-page-heading"]')).toBeVisible();

      const inviteButton = page.getByRole('button', { name: 'Invite user' });
      await inviteButton.click();

      await expect(page.locator('[data-testid="add-member-dialog"]')).toBeVisible();

      const roleSelect = page.locator('[data-testid="add-member-role-select"]');
      await expect(roleSelect).toHaveValue(TeamInvitationType.MEMBER);

      console.log('✅ Invite dialog defaults role to member');
    });

    test('create invitation with owner role shows correct role in list', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const base = testBasesMap.get(testRunId)!;
      const testTeam = base.getTestTeam();
      const ownerUser = base.getOwnerUser();

      const testEmail = `test-invite-owner-${Date.now()}@example.com`;

      await base.actAsOwner(page);
      await base.navigateToTeamMembersPage(page);

      await expect(page.locator('[data-testid="team-members-page-heading"]')).toBeVisible();

      const inviteButton = page.getByRole('button', { name: 'Invite user' });
      await inviteButton.click();

      await expect(page.locator('[data-testid="add-member-dialog"]')).toBeVisible();

      await page.locator('[data-testid="add-member-email-input"]').fill(testEmail);
      await page.getByLabel('First name').fill('Test');
      await page.getByLabel('Last name').fill('OwnerInvite');

      const roleSelect = page.locator('[data-testid="add-member-role-select"]');
      await roleSelect.click();
      await page.locator('[data-testid="add-member-role-option-owner"]').click();

      await page.getByRole('button', { name: 'Send invite' }).click();

      await expect(page.locator('[data-testid="add-member-dialog"]')).not.toBeVisible({
        timeout: 5000,
      });

      const ownerClient = base.dbUtils.createAuthenticatedClientForUser(ownerUser.userId);
      const invitations = await TeamInvitationApi.getTeamInvitations(ownerClient, testTeam.teamId);
      const createdInvitation = invitations.find((inv) => inv.email === testEmail);
      expect(createdInvitation).toBeDefined();
      expect(createdInvitation!.type).toBe(TeamInvitationType.OWNER);

      console.log('✅ Invitation created with owner role, verified via API');
    });
  });
});
