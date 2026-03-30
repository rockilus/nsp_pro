import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { DatabaseTestUtils, TestUser } from "../../../utils/database-utils";
import { NotificationTypeT } from "@/types/notification";

interface NotifTestContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
  user1: TestUser;
  user2: TestUser;
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
      name: `Notif Team ${workerIndex}-${Date.now()}`,
      ownerUserId: user1.user_id,
    });

    testContextMap.set(testRunId, { dbUtils, team, user1, user2 });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  test("invited user receives notification when invited to a team", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, user1, user2 } = testContextMap.get(testRunId)!;

    await dbUtils.createTeamInvitationAs(
      user1.user_id,
      team.teamId,
      user2.email,
    );

    const notifications = await dbUtils.getNotificationsAs(user2.user_id);
    const notification = notifications.find(
      (n) => n.type === "user_received_team_invite",
    );

    expect(notification).toBeDefined();

    expect(notification!.userId).toBe(user2.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_received_team_invite" as NotificationTypeT,
    );
    expect(notification!.eventData.teamName).toBe(team.name);
    expect(notification!.eventData.senderName).toBe(
      `${user1.first_name} ${user1.last_name}`,
    );

    // Target display format
    // [TEAM NAME] You have been invited to join [TEAM NAME] by [SENDER NAME].
  });

  test("inviter is notified when invited user accepts the invitation", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, user1, user2 } = testContextMap.get(testRunId)!;

    const invitation = await dbUtils.createTeamInvitationAs(
      user1.user_id,
      team.teamId,
      user2.email,
    );

    await dbUtils.acceptTeamInvitationAs(user2.user_id, invitation.token);

    const notifications = await dbUtils.getNotificationsAs(user1.user_id);
    const notification = notifications.find(
      (n) => n.type === "user_accepted_team_invite",
    );

    expect(notification).toBeDefined();

    expect(notification!.userId).toBe(user1.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_accepted_team_invite" as NotificationTypeT,
    );
    expect(notification!.eventData.acceptedUserName).toBe(
      `${user2.first_name} ${user2.last_name}`,
    );
    expect(notification!.eventData.teamName).toBe(team.name);

    // Target display format
    // [TEAM NAME] [ACCEPTED USER NAME] has accepted the invitation to join [TEAM NAME].
  });

  test("team owner is notified when a member leaves the team", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, user1, user2 } = testContextMap.get(testRunId)!;

    await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
    await dbUtils.leaveTeamAs(user2.user_id, team.teamId);

    const notifications = await dbUtils.getNotificationsAs(user1.user_id);
    const notification = notifications.find((n) => n.type === "user_left_team");

    expect(notification).toBeDefined();

    expect(notification!.userId).toBe(user1.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe("user_left_team" as NotificationTypeT);
    expect(notification!.eventData.userName).toBe(
      `${user2.first_name} ${user2.last_name}`,
    );
    expect(notification!.eventData.teamName).toBe(team.name);
  });

  test("removed member is notified when kicked from the team", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, user1, user2 } = testContextMap.get(testRunId)!;

    await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
    await dbUtils.removeTeamMemberAs(user1.user_id, team.teamId, user2.user_id);

    const notifications = await dbUtils.getNotificationsAs(user2.user_id);
    const notification = notifications.find(
      (n) => n.type === "user_removed_from_team",
    );

    expect(notification).toBeDefined();

    expect(notification!.userId).toBe(user2.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_removed_from_team" as NotificationTypeT,
    );
    expect(notification!.eventData.teamName).toBe(team.name);
  });
});
