import { test, expect } from "@playwright/test";
import {
  DatabaseTestUtils,
  TEST_USER,
  TEST_USER_2,
} from "../../utils/database-utils";
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
    async setup(dbUtils, team) {
      await dbUtils.createTeamInvitationAs(
        TEST_USER.user_id,
        team.teamId,
        TEST_USER_2.email,
      );
      return TEST_USER_2.user_id;
    },
    expectedText: (name) => `Test User invited you to join ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
  {
    type: "user_accepted_team_invite",
    description: "TEST_USER_2 accepts invite sent by TEST_USER",
    async setup(dbUtils, team) {
      const invitation = await dbUtils.createTeamInvitationAs(
        TEST_USER.user_id,
        team.teamId,
        TEST_USER_2.email,
      );
      await dbUtils.acceptTeamInvitationAs(
        TEST_USER_2.user_id,
        invitation.token,
      );
      return TEST_USER.user_id;
    },
    expectedText: (name) => `Test User2 accepted your invitation to ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
  {
    type: "user_removed_from_team",
    description: "TEST_USER removes TEST_USER_2 from team",
    async setup(dbUtils, team) {
      await dbUtils.addTeamMember(TEST_USER_2.user_id, team.teamId, "member");
      await dbUtils.removeTeamMemberAs(
        TEST_USER.user_id,
        team.teamId,
        TEST_USER_2.user_id,
      );
      return TEST_USER_2.user_id;
    },
    expectedText: (name) => `You have been removed from team ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
  {
    type: "user_left_team",
    description: "TEST_USER_2 leaves team",
    async setup(dbUtils, team) {
      await dbUtils.addTeamMember(TEST_USER_2.user_id, team.teamId, "member");
      await dbUtils.leaveTeamAs(TEST_USER_2.user_id, team.teamId);
      return TEST_USER.user_id;
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
  const team = await dbUtils.createTeam({
    name: `Content Test ${Date.now()}`,
  });
  ctxMap.set(runId, { dbUtils, team });
});

test.afterEach(async ({}, testInfo) => {
  ctxMap.delete(ctxMap.getRunId(testInfo));
});

for (const tc of NOTIFICATION_TEST_CASES) {
  test.describe(tc.type, () => {
    test("shows correct notification message", async ({ page }, testInfo) => {
      const { dbUtils, team } = ctxMap.get(ctxMap.getRunId(testInfo));
      const recipientId = await tc.setup(dbUtils, team);
      await navigateToNotificationsAsUser(page, dbUtils, recipientId);

      const msg = page
        .locator(`[data-notification-type="${tc.type}"]`)
        .locator('[data-testid="notification-message"]');
      await expect(msg).toHaveText(tc.expectedText(team.name));
    });

    test("clicking navigates to correct page", async ({ page }, testInfo) => {
      const { dbUtils, team } = ctxMap.get(ctxMap.getRunId(testInfo));
      const recipientId = await tc.setup(dbUtils, team);
      await navigateToNotificationsAsUser(page, dbUtils, recipientId);

      await page
        .locator(`[data-notification-type="${tc.type}"] a`)
        .first()
        .click();
      await page.waitForURL(tc.expectedUrlPattern, { timeout: 10_000 });
    });
  });
}
