import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { DatabaseTestUtils, TestUser } from "../../utils/database-utils";
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
      name: `Notif Page Team ${testInfo.workerIndex}-${Date.now()}`,
      ownerUserId: user1.user_id,
    });

    testContextMap.set(runId, { dbUtils, team, user1, user2 });
  });

  test.afterEach(async ({}, testInfo) => {
    const runId = testContextMap.getRunId(testInfo);
    if (!runId) return;
    testContextMap.delete(runId);
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

    // Notification B (newer): user2 joins a second team via addTeamMember then leaves
    // → user1 receives user_left_team
    // Use addTeamMember (not invite) to ensure full membership before leaveTeamAs
    const team2 = await dbUtils.createTeam({
      name: `Notif Order Team2 ${Date.now()}`,
      ownerUserId: user1!.user_id,
    });
    await dbUtils.addTeamMember(user2!.user_id, team2.teamId, "member");
    await dbUtils.leaveTeamAs(user2!.user_id, team2.teamId);

    await navigateToNotificationsAsUser(page, dbUtils, user1!.user_id);

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

    // Invite user2 — creates an unread notification for them
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    await navigateToNotificationsAsUser(page, dbUtils, user2!.user_id);

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

    // Create two separate teams, both owned by user1
    const teamA = await dbUtils.createTeam({
      name: `Team A ${Date.now()}`,
      ownerUserId: user1!.user_id,
    });
    const teamB = await dbUtils.createTeam({
      name: `Team B ${Date.now()}`,
      ownerUserId: user1!.user_id,
    });

    // Use two distinct users (one per team) so no membership state is reused.
    // Reusing the same user across both teams can suppress the second notification
    // if the backend rechecks membership presence at notification dispatch time.
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

    await navigateToNotificationsAsUser(page, dbUtils, user1!.user_id);

    const items = page.locator('[data-testid="notification-item"]');
    await expect(items).toHaveCount(2);
  });

  test("each notification shows message text and timestamp", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 → they receive user_received_team_invite notification
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    await navigateToNotificationsAsUser(page, dbUtils, user2!.user_id);

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

  test("three-dots menu button is visible in page header", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await navigateToNotificationsAsUser(page, dbUtils, user1!.user_id);

    await expect(
      page.locator('[data-testid="notifications-page-menu-button"]'),
    ).toBeVisible();
  });

  test("mark all as read from menu marks all notifications as read", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 → user2 receives an unread notification
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );

    await navigateToNotificationsAsUser(page, dbUtils, user2!.user_id);

    const firstItem = page.locator('[data-testid="notification-item"]').first();
    await expect(firstItem).toHaveAttribute("data-read", "false");

    await page.click('[data-testid="notifications-page-menu-button"]');
    await page.click('[data-testid="notifications-page-mark-all-read"]');

    await expect(firstItem).toHaveAttribute("data-read", "true", {
      timeout: 10_000,
    });
  });

  test("clicking notification settings from menu navigates to settings", async ({
    page,
  }, testInfo) => {
    const { dbUtils, user1 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await navigateToNotificationsAsUser(page, dbUtils, user1!.user_id);
    await page.click('[data-testid="notifications-page-menu-button"]');
    await page.click('[data-testid="notifications-page-open-settings"]');

    await expect(page).toHaveURL(/\/plan\/settings\/notifications/, {
      timeout: 10_000,
    });
  });

  test("clicking a notification navigates to the correct page", async ({
    page,
  }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    // Invite user2 → user2 receives user_received_team_invite (links to /settings/teams)
    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );
    await navigateToNotificationsAsUser(page, dbUtils, user2!.user_id);

    await page.locator('[data-testid="notification-item"] a').first().click();
    await page.waitForURL(/\/plan\/settings\/teams/, { timeout: 10_000 });
  });

  test("item menu marks notification as read", async ({ page }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );
    await navigateToNotificationsAsUser(page, dbUtils, user2!.user_id);

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toHaveAttribute("data-read", "false");

    await item.locator('[data-testid="notification-item-menu-button"]').click();
    await page.locator('[data-testid="notification-mark-read-button"]').click();

    await expect(item).toHaveAttribute("data-read", "true", {
      timeout: 10_000,
    });
  });

  test("item menu deletes the notification", async ({ page }, testInfo) => {
    const { dbUtils, team, user1, user2 } = testContextMap.get(
      testContextMap.getRunId(testInfo),
    );

    await dbUtils.createTeamInvitationAs(
      user1!.user_id,
      team.teamId,
      user2!.email,
    );
    await navigateToNotificationsAsUser(page, dbUtils, user2!.user_id);

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toBeVisible();

    await item.locator('[data-testid="notification-item-menu-button"]').click();
    await page.locator('[data-testid="notification-delete-button"]').click();

    await expect(item).not.toBeVisible({ timeout: 10_000 });
  });
});
