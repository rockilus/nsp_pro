import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { DatabaseTestUtils, TestUser } from "../../utils/database-utils";
import { testConfig } from "../../utils/test-config";
import {
  NotifTestContext,
  NotificationTestContextMap,
  navigateToPlanAndOpenBellAsUser,
} from "./helpers/notification-test-helpers";

const BELL_BASE_URL = `${testConfig.frontendUrl}/en/plan/settings/teams`;

const testContextMap = new NotificationTestContextMap<NotifTestContext>();

test.describe("NotificationBell", () => {
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

    const id1 = randomUUID().replace(/-/g, "").slice(0, 24);
    const id2 = randomUUID().replace(/-/g, "").slice(0, 24);
    const user1: TestUser = {
      user_id: id1,
      email: `testuser-${id1}@example.com`,
      username: `testuser-${id1}`,
      first_name: "Test",
      last_name: "User",
    };
    const user2: TestUser = {
      user_id: id2,
      email: `testuser2-${id2}@example.com`,
      username: `testuser2-${id2}`,
      first_name: "Test",
      last_name: "User2",
    };
    await dbUtils.createTestUser(user1);
    await dbUtils.createTestUser(user2);

    const team = await dbUtils.createTeam({
      name: `Bell Team ${testInfo.workerIndex}-${Date.now()}`,
      ownerUserId: user1.user_id,
    });

    testContextMap.set(runId, { dbUtils, team, user1, user2 });
  });

  test.afterEach(async ({}, testInfo) => {
    const runId = testContextMap.getRunId(testInfo);
    if (!runId) return;
    testContextMap.delete(runId);
  });

  test("badge shows the number of unseen notifications", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 → user2 gets 1 unread notification
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    await dbUtils.authenticatePageAsUser(page, user2!.user_id);
    await page.goto(BELL_BASE_URL);
    await page.waitForSelector('[data-testid="notification-bell-button"]');

    const badge = page.locator('[data-testid="notification-badge-count"]');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("1");
  });

  test("badge is hidden when there are no unseen notifications", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // No notifications created
    await dbUtils.authenticatePageAsUser(page, user1!.user_id);
    await page.goto(BELL_BASE_URL);
    await page.waitForSelector('[data-testid="notification-bell-button"]');

    const badge = page.locator('[data-testid="notification-badge-count"]');
    await expect(badge).not.toBeVisible();
  });

  test("shows notifications in newest-first order", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Notification A (older): invite user2 and have them accept
    // → user1 receives user_accepted_team_invite
    const invitation = await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );
    await dbUtils.acceptTeamInvitationAs(user2!.user_id, invitation.token);

    // Notification B (newer): user2 joins a second team then leaves
    // → user1 receives user_left_team
    const team2 = await dbUtils.createTeam({
      name: `Bell Order Team2 ${Date.now()}`,
      ownerUserId: user1!.user_id,
    });
    await dbUtils.addTeamMember(user2!.user_id, team2.teamId, "member");
    await dbUtils.leaveTeamAs(user2!.user_id, team2.teamId);

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user1!.user_id);

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
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 — creates an unread notification for user2
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user2!.user_id);

    const firstItem = page.locator('[data-testid="notification-item"]').first();
    await expect(firstItem).toBeVisible();
    await expect(firstItem).toHaveAttribute("data-read", "false");
  });

  test("shows notifications from all teams the user belongs to", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    const teamA = await dbUtils.createTeam({
      name: `Bell Team A ${Date.now()}`,
      ownerUserId: user1!.user_id,
    });
    const teamB = await dbUtils.createTeam({
      name: `Bell Team B ${Date.now()}`,
      ownerUserId: user1!.user_id,
    });

    const idA = randomUUID().replace(/-/g, "").slice(0, 24);
    const idB = randomUUID().replace(/-/g, "").slice(0, 24);
    const memberA: TestUser = {
      user_id: idA,
      email: `memberA-${idA}@example.com`,
      username: `memberA-${idA}`,
      first_name: "Member",
      last_name: "A",
    };
    const memberB: TestUser = {
      user_id: idB,
      email: `memberB-${idB}@example.com`,
      username: `memberB-${idB}`,
      first_name: "Member",
      last_name: "B",
    };
    await dbUtils.createTestUser(memberA);
    await dbUtils.createTestUser(memberB);

    // memberA joins and leaves Team A → user1 gets user_left_team from Team A
    await dbUtils.addTeamMember(memberA.user_id, teamA.teamId, "member");
    await dbUtils.leaveTeamAs(memberA.user_id, teamA.teamId);

    // memberB joins and leaves Team B → user1 gets user_left_team from Team B
    await dbUtils.addTeamMember(memberB.user_id, teamB.teamId, "member");
    await dbUtils.leaveTeamAs(memberB.user_id, teamB.teamId);

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user1!.user_id);

    const items = page.locator('[data-testid="notification-item"]');
    await expect(items).toHaveCount(2);
  });

  test("each notification shows message text and timestamp", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 → user2 receives user_received_team_invite notification
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user2!.user_id);

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

  test("clicking 'see all' navigates to the notifications page", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user1!.user_id);

    const seeAll = page.locator('[data-testid="notification-bell-see-all"]');
    await expect(seeAll).toBeVisible();
    await seeAll.click();

    await expect(page).toHaveURL(/\/en\/plan\/notifications/);
  });

  test("three-dots menu button is visible in popover header", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user1!.user_id);

    await expect(
      page.locator('[data-testid="notification-bell-menu-button"]'),
    ).toBeVisible();
  });

  test("badge clears after opening the bell popover", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 → user2 gets 1 unseen notification
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    // Navigate without opening the bell — badge should show 1 (unseen)
    await dbUtils.authenticatePageAsUser(page, user2!.user_id);
    await page.goto(BELL_BASE_URL);
    await page.waitForSelector('[data-testid="notification-bell-button"]');

    const badge = page.locator('[data-testid="notification-badge-count"]');
    await expect(badge).toHaveText("1");

    // Open the bell — markAllSeen fires, unseen count drops to 0
    await page.click('[data-testid="notification-bell-button"]');
    await expect(
      page.locator('[data-testid="notification-bell-popover"]'),
    ).toBeVisible({ timeout: 10_000 });

    await expect(badge).not.toBeVisible({ timeout: 10_000 });
  });

  test("mark all as read from menu marks all notification items as read", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 → user2 gets 1 unread notification
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user2!.user_id);

    const firstItem = page.locator('[data-testid="notification-item"]').first();
    await expect(firstItem).toBeVisible();
    await expect(firstItem).toHaveAttribute("data-read", "false");

    await page.click('[data-testid="notification-bell-menu-button"]');
    await page.click('[data-testid="notification-bell-mark-all-read"]');

    await expect(firstItem).toHaveAttribute("data-read", "true", {
      timeout: 10_000,
    });
  });

  test("clicking notification settings from menu navigates to settings page", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user1!.user_id);
    await page.click('[data-testid="notification-bell-menu-button"]');
    await page.click('[data-testid="notification-bell-open-settings"]');

    await expect(page).toHaveURL(/\/plan\/settings\/notifications/, {
      timeout: 10_000,
    });
  });

  test("clicking open notifications from menu navigates to notifications page", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user1!.user_id);
    await page.click('[data-testid="notification-bell-menu-button"]');
    await page.click('[data-testid="notification-bell-open-notifications"]');

    await expect(page).toHaveURL(/\/en\/plan\/notifications/, {
      timeout: 10_000,
    });
  });

  test("badge does not show when inApp is disabled for the notification type", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Disable inApp for user_left_team on user1
    const prefs = await dbUtils.getNotificationPreferencesAs(user1!.user_id);
    prefs.preferences["user_left_team"].inApp = false;
    await dbUtils.setNotificationPreferencesAs(user1!.user_id, prefs);

    // Trigger user_left_team event → would normally notify user1
    await dbUtils.addTeamMember(user2!.user_id, team.teamId, "member");
    await dbUtils.leaveTeamAs(user2!.user_id, team.teamId);

    await dbUtils.authenticatePageAsUser(page, user1!.user_id);
    await page.goto(BELL_BASE_URL);
    await page.waitForSelector('[data-testid="notification-bell-button"]');

    const badge = page.locator('[data-testid="notification-badge-count"]');
    await expect(badge).not.toBeVisible();
  });

  test("notification item not shown in popover when inApp is disabled for the notification type", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Disable inApp for user_left_team on user1
    const prefs = await dbUtils.getNotificationPreferencesAs(user1!.user_id);
    prefs.preferences["user_left_team"].inApp = false;
    await dbUtils.setNotificationPreferencesAs(user1!.user_id, prefs);

    // Trigger user_left_team event → would normally notify user1
    await dbUtils.addTeamMember(user2!.user_id, team.teamId, "member");
    await dbUtils.leaveTeamAs(user2!.user_id, team.teamId);

    await navigateToPlanAndOpenBellAsUser(page, dbUtils, user1!.user_id);

    const items = page.locator('[data-testid="notification-item"]');
    await expect(items).toHaveCount(0);
  });
});
