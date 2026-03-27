import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { DatabaseTestUtils, TestUser } from "../../utils/database-utils";
import {
  NotifTestContext,
  NotificationTestCase,
  NotificationTestContextMap,
  navigateToNotificationsAsUser,
} from "./helpers/notification-test-helpers";

const NOTIFICATION_TEST_CASES: NotificationTestCase[] = [
  {
    type: "user_received_team_invite",
    description: "invite sent to TEST_USER_2",
    async setup(dbUtils, team, user1, user2) {
      await dbUtils.createTeamInvitationAs(
        user1.user_id,
        team.teamId,
        user2.email,
      );
      return user2.user_id;
    },
    expectedText: (name) => `Test User invited you to join ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
  {
    type: "user_accepted_team_invite",
    description: "TEST_USER_2 accepts invite sent by TEST_USER",
    async setup(dbUtils, team, user1, user2) {
      const invitation = await dbUtils.createTeamInvitationAs(
        user1.user_id,
        team.teamId,
        user2.email,
      );
      await dbUtils.acceptTeamInvitationAs(user2.user_id, invitation.token);
      return user1.user_id;
    },
    expectedText: (name) => `Test User2 accepted your invitation to ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
  {
    type: "user_removed_from_team",
    description: "TEST_USER removes TEST_USER_2 from team",
    async setup(dbUtils, team, user1, user2) {
      await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
      await dbUtils.removeTeamMemberAs(
        user1.user_id,
        team.teamId,
        user2.user_id,
      );
      return user2.user_id;
    },
    expectedText: (name) => `You have been removed from team ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
  {
    type: "user_left_team",
    description: "TEST_USER_2 leaves team",
    async setup(dbUtils, team, user1, user2) {
      await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
      await dbUtils.leaveTeamAs(user2.user_id, team.teamId);
      return user1.user_id;
    },
    expectedText: (name) => `Test User2 left your team ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
];

const ctxMap = new NotificationTestContextMap<NotifTestContext>();

test.beforeEach(async ({}, testInfo) => {
  const runId = ctxMap.initRunId(testInfo);
  const dbUtils = new DatabaseTestUtils();
  await dbUtils.resetDatabase({
    collections: [
      "teams",
      "team_memberships",
      "team_invitations",
      "notifications",
    ],
  });
  // Use unique users per test run to prevent cross-worker notification leakage.
  // Notifications are shown for all teams a user belongs to, so different tests
  // sharing the same user IDs see each other's notifications when run in parallel.
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
    name: `Content Test ${Date.now()}`,
    ownerUserId: user1.user_id,
  });
  ctxMap.set(runId, { dbUtils, team, user1, user2 });
});

test.afterEach(async ({}, testInfo) => {
  ctxMap.delete(ctxMap.getRunId(testInfo));
});

for (const tc of NOTIFICATION_TEST_CASES) {
  test.describe(tc.type, () => {
    test("shows correct notification message", async ({ page }, testInfo) => {
      const { dbUtils, team, user1, user2 } = ctxMap.get(
        ctxMap.getRunId(testInfo),
      );
      const recipientId = await tc.setup(dbUtils, team, user1!, user2!);
      await navigateToNotificationsAsUser(page, dbUtils, recipientId);

      const msg = page
        .locator(`[data-notification-type="${tc.type}"]`)
        .locator('[data-testid="notification-message"]');
      await expect(msg).toHaveText(tc.expectedText(team.name));
    });

    test("clicking navigates to correct page", async ({ page }, testInfo) => {
      const { dbUtils, team, user1, user2 } = ctxMap.get(
        ctxMap.getRunId(testInfo),
      );
      const recipientId = await tc.setup(dbUtils, team, user1!, user2!);
      await navigateToNotificationsAsUser(page, dbUtils, recipientId);

      await page
        .locator(`[data-notification-type="${tc.type}"] a`)
        .first()
        .click();
      await page.waitForURL(tc.expectedUrlPattern, { timeout: 10_000 });
    });

    test("item menu marks notification as read", async ({ page }, testInfo) => {
      const { dbUtils, team, user1, user2 } = ctxMap.get(
        ctxMap.getRunId(testInfo),
      );
      const recipientId = await tc.setup(dbUtils, team, user1!, user2!);
      await navigateToNotificationsAsUser(page, dbUtils, recipientId);

      const item = page.locator(`[data-notification-type="${tc.type}"]`);
      await expect(item).toHaveAttribute("data-read", "false");

      await item
        .locator('[data-testid="notification-item-menu-button"]')
        .click();
      await page
        .locator('[data-testid="notification-mark-read-button"]')
        .click();

      await expect(
        page.locator(`[data-notification-type="${tc.type}"][data-read="true"]`),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("item menu deletes the notification", async ({ page }, testInfo) => {
      const { dbUtils, team, user1, user2 } = ctxMap.get(
        ctxMap.getRunId(testInfo),
      );
      const recipientId = await tc.setup(dbUtils, team, user1!, user2!);
      await navigateToNotificationsAsUser(page, dbUtils, recipientId);

      const item = page.locator(`[data-notification-type="${tc.type}"]`);
      await expect(item).toBeVisible();

      await item
        .locator('[data-testid="notification-item-menu-button"]')
        .click();
      await page.locator('[data-testid="notification-delete-button"]').click();

      await expect(item).not.toBeVisible({ timeout: 10_000 });
    });
  });
}
