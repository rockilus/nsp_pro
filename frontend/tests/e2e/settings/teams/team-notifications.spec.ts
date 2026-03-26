import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import {
  DatabaseTestUtils,
  TEST_USER,
  TEST_USER_2,
} from "../../../utils/database-utils";

interface NotifTestContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
}

const testContextMap = new Map<string, NotifTestContext>();

test.describe("Team notifications", () => {
  test.beforeEach(async ({}, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

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
      name: `Notif Team ${workerIndex}-${Date.now()}`,
    });

    testContextMap.set(testRunId, { dbUtils, team });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  test("invited user receives notification when invited to a team", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team } = testContextMap.get(testRunId)!;

    await dbUtils.createTeamInvitationAs(
      TEST_USER.user_id,
      team.teamId,
      TEST_USER_2.email,
    );

    const notifications = await dbUtils.getNotificationsAs(TEST_USER_2.user_id);
    const notification = notifications.find(
      (n) => n.type === "user_received_team_invite",
    );

    expect(notification).toBeDefined();
    expect(notification!.eventData.team_name).toBe(team.name);
    expect(notification!.eventData.sender_name).toBe(
      `${TEST_USER.first_name} ${TEST_USER.last_name}`,
    );
  });

  test("inviter is notified when invited user accepts the invitation", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team } = testContextMap.get(testRunId)!;

    const invitation = await dbUtils.createTeamInvitationAs(
      TEST_USER.user_id,
      team.teamId,
      TEST_USER_2.email,
    );

    await dbUtils.acceptTeamInvitationAs(TEST_USER_2.user_id, invitation.token);

    const notifications = await dbUtils.getNotificationsAs(TEST_USER.user_id);
    const notification = notifications.find(
      (n) => n.type === "user_accepted_team_invite",
    );

    expect(notification).toBeDefined();
    expect(notification!.eventData.accepted_user_name).toBe(
      `${TEST_USER_2.first_name} ${TEST_USER_2.last_name}`,
    );
    expect(notification!.eventData.team_name).toBe(team.name);
  });

  test("team owner is notified when a member leaves the team", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team } = testContextMap.get(testRunId)!;

    await dbUtils.addTeamMember(TEST_USER_2.user_id, team.teamId, "member");
    await dbUtils.leaveTeamAs(TEST_USER_2.user_id, team.teamId);

    const notifications = await dbUtils.getNotificationsAs(TEST_USER.user_id);
    const notification = notifications.find((n) => n.type === "user_left_team");

    expect(notification).toBeDefined();
    expect(notification!.eventData.member_name).toBe(
      `${TEST_USER_2.first_name} ${TEST_USER_2.last_name}`,
    );
    expect(notification!.eventData.team_name).toBe(team.name);
  });

  test("removed member is notified when kicked from the team", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team } = testContextMap.get(testRunId)!;

    await dbUtils.addTeamMember(TEST_USER_2.user_id, team.teamId, "member");
    await dbUtils.removeTeamMemberAs(
      TEST_USER.user_id,
      team.teamId,
      TEST_USER_2.user_id,
    );

    const notifications = await dbUtils.getNotificationsAs(TEST_USER_2.user_id);
    const notification = notifications.find(
      (n) => n.type === "user_removed_from_team",
    );

    expect(notification).toBeDefined();
    expect(notification!.eventData.team_name).toBe(team.name);
  });
});
