import { test, expect } from "@playwright/test";
import {
  DatabaseTestUtils,
  TEST_USER,
  TEST_USER_2,
} from "../../utils/database-utils";
import {
  NotifTestContext,
  NotificationTestContextMap,
  navigateToNotificationsAsUser,
} from "./helpers/notification-test-helpers";

const testContextMap = new NotificationTestContextMap<NotifTestContext>();

test.describe("NotificationsPage", () => {
  test.beforeEach(async ({}, testInfo) => {
    const runId = testContextMap.initRunId(testInfo);

    const dbUtils = new DatabaseTestUtils();
    await dbUtils.resetDatabase({
      collections: [
        "teams",
        "team_memberships",
        "team_invitations",
        "notifications",
      ],
    });

    const team = await dbUtils.createTeam({
      name: `Notif Page Team ${testInfo.workerIndex}-${Date.now()}`,
    });

    testContextMap.set(runId, { dbUtils, team });
  });

  test.afterEach(async ({}, testInfo) => {
    const runId = testContextMap.getRunId(testInfo);
    if (!runId) return;
    testContextMap.delete(runId);
  });

  test("shows notifications in newest-first order", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Notification A (older): invite TEST_USER_2 then have them accept
    // → TEST_USER receives user_accepted_team_invite
    const invitation = await dbUtils.createTeamInvitationAs(
      TEST_USER.user_id,
      team.teamId,
      TEST_USER_2.email,
    );
    await dbUtils.acceptTeamInvitationAs(TEST_USER_2.user_id, invitation.token);

    // Notification B (newer): TEST_USER_2 leaves team
    // → TEST_USER receives user_left_team
    await dbUtils.leaveTeamAs(TEST_USER_2.user_id, team.teamId);

    await navigateToNotificationsAsUser(page, dbUtils, TEST_USER.user_id);

    const items = page.locator('[data-testid="notification-item"]');
    await expect(items).toHaveCount(2);

    await expect(items.nth(0)).toHaveAttribute(
      "data-notification-type",
      "user_left_team",
    );
    await expect(items.nth(1)).toHaveAttribute(
      "data-notification-type",
      "user_accepted_team_invite",
    );
  });

  test("unread notifications are highlighted", async ({ page }, testInfo) => {
    const { dbUtils, team } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite TEST_USER_2 — creates an unread notification for them
    await dbUtils.createTeamInvitationAs(
      TEST_USER.user_id,
      team.teamId,
      TEST_USER_2.email,
    );

    await navigateToNotificationsAsUser(page, dbUtils, TEST_USER_2.user_id);

    const firstItem = page.locator('[data-testid="notification-item"]').first();
    await expect(firstItem).toBeVisible();
    await expect(firstItem).toHaveAttribute("data-read", "false");
  });

  test("shows notifications from all teams the user belongs to", async ({
    page,
  }, testInfo) => {
    const { dbUtils } = testContextMap.get(testContextMap.getRunId(testInfo));

    // Create two separate teams, both owned by TEST_USER
    const teamA = await dbUtils.createTeam({
      name: `Team A ${Date.now()}`,
    });
    const teamB = await dbUtils.createTeam({
      name: `Team B ${Date.now()}`,
    });

    // TEST_USER_2 joins and leaves Team A → TEST_USER gets user_left_team from Team A
    await dbUtils.addTeamMember(TEST_USER_2.user_id, teamA.teamId, "member");
    await dbUtils.leaveTeamAs(TEST_USER_2.user_id, teamA.teamId);

    // TEST_USER_2 joins and leaves Team B → TEST_USER gets user_left_team from Team B
    await dbUtils.addTeamMember(TEST_USER_2.user_id, teamB.teamId, "member");
    await dbUtils.leaveTeamAs(TEST_USER_2.user_id, teamB.teamId);

    await navigateToNotificationsAsUser(page, dbUtils, TEST_USER.user_id);

    const items = page.locator('[data-testid="notification-item"]');
    await expect(items).toHaveCount(2);
  });

  test("each notification shows message text and timestamp", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite TEST_USER_2 → they receive user_received_team_invite notification
    await dbUtils.createTeamInvitationAs(
      TEST_USER.user_id,
      team.teamId,
      TEST_USER_2.email,
    );

    await navigateToNotificationsAsUser(page, dbUtils, TEST_USER_2.user_id);

    const firstItem = page.locator('[data-testid="notification-item"]').first();
    await expect(firstItem).toBeVisible();

    const message = firstItem.locator('[data-testid="notification-message"]');
    await expect(message).toBeVisible();
    await expect(message).not.toBeEmpty();

    const timestamp = firstItem.locator(
      '[data-testid="notification-time-since"]',
    );
    await expect(timestamp).toBeVisible();
    await expect(timestamp).not.toBeEmpty();
  });

  test("clicking a team notification navigates to team settings", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite TEST_USER_2 → they receive user_received_team_invite notification
    await dbUtils.createTeamInvitationAs(
      TEST_USER.user_id,
      team.teamId,
      TEST_USER_2.email,
    );

    await navigateToNotificationsAsUser(page, dbUtils, TEST_USER_2.user_id);

    const notificationLink = page
      .locator('[data-testid="notification-item"] a')
      .first();
    await expect(notificationLink).toBeVisible();

    await notificationLink.click();

    await page.waitForURL(/\/plan\/settings\/teams/, { timeout: 10_000 });
    expect(page.url()).toContain("/plan/settings/teams");
  });
});
