import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DatabaseTestUtils, TestUser } from "../../utils/database-utils";
import { RequestType } from "@/types/request";
import { ShiftType } from "@/types/shift";
import {
  NotifTestContext,
  NotificationTestCase,
  NotificationTestContextMap,
  navigateToNotificationsAsUser,
} from "./helpers/notification-test-helpers";

dayjs.extend(utc);

// Future date computed at runtime to avoid hardcoded values rotting over time.
const REQUEST_DATE = dayjs.utc().add(2, "month").format("YYYY-MM-DD");

const NOTIFICATION_TEST_CASES: NotificationTestCase[] = [
  {
    type: "user_received_team_invite",
    description: "invite sent to TEST_USER_2",
    preferenceKey: "user_received_team_invite",
    recipientRole: "user2",
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
    preferenceKey: "user_accepted_team_invite",
    recipientRole: "user1",
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
    preferenceKey: "user_removed_from_team",
    recipientRole: "user2",
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
    preferenceKey: "user_left_team",
    recipientRole: "user1",
    async setup(dbUtils, team, user1, user2) {
      await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
      await dbUtils.leaveTeamAs(user2.user_id, team.teamId);
      return user1.user_id;
    },
    expectedText: (name) => `Test User2 left your team ${name}`,
    expectedUrlPattern: /\/plan\/settings\/teams/,
  },
  {
    type: "user_created_request",
    description: "user2 creates a request, team manager (user1) is notified",
    preferenceKey: "user_created_request",
    recipientRole: "user1",
    async setup(dbUtils, team, user1, user2) {
      await dbUtils.addTeamMember(user2!.user_id, team.teamId, "member");
      const worker = await dbUtils.createWorker({
        teamId: team.teamId,
        name: "Worker User",
        weeklyHours: 40,
      });
      await dbUtils.attachWorkerToUser(worker.id, user2!.user_id, team.teamId);
      const allShifts = await dbUtils.getAllShifts(team.teamId);
      const leaveShift = allShifts.find((s) => s.shiftType === ShiftType.LEAVE);
      await dbUtils.createRequestAs(user2!.user_id, {
        teamId: team.teamId,
        workerId: worker.id,
        requestType: RequestType.LEAVE,
        startDate: dayjs.utc(REQUEST_DATE),
        endDate: dayjs.utc(REQUEST_DATE),
        shiftId: leaveShift?.id ?? null,
      });
      return user1!.user_id;
    },
    expectedText: (_name) =>
      `Worker User created a new request for ${REQUEST_DATE}`,
    expectedUrlPattern: /\/plan\/requests/,
  },
  {
    type: "user_accepted_request",
    description:
      "user2 creates a request, user1 approves it, user2 is notified",
    preferenceKey: "user_accepted_request",
    recipientRole: "user2",
    async setup(dbUtils, team, user1, user2) {
      await dbUtils.addTeamMember(user2!.user_id, team.teamId, "member");
      const worker = await dbUtils.createWorker({
        teamId: team.teamId,
        name: "Worker User",
        weeklyHours: 40,
      });
      await dbUtils.attachWorkerToUser(worker.id, user2!.user_id, team.teamId);
      const allShifts = await dbUtils.getAllShifts(team.teamId);
      const leaveShift = allShifts.find((s) => s.shiftType === ShiftType.LEAVE);
      const request = await dbUtils.createRequestAs(user2!.user_id, {
        teamId: team.teamId,
        workerId: worker.id,
        requestType: RequestType.LEAVE,
        startDate: dayjs.utc(REQUEST_DATE),
        endDate: dayjs.utc(REQUEST_DATE),
        shiftId: leaveShift?.id ?? null,
      });
      await dbUtils.approveRequestAs(user1!.user_id, request.id, team.teamId);
      return user2!.user_id;
    },
    // shift_name can be dynamic (e.g. "Vacation"); accept any name
    expectedText: (_name) =>
      new RegExp(`^Your request for .* on ${REQUEST_DATE} was approved$`),
    expectedUrlPattern: /\/plan\/requests/,
  },
  {
    type: "user_denied_request",
    description: "user2 creates a request, user1 denies it, user2 is notified",
    preferenceKey: "user_denied_request",
    recipientRole: "user2",
    async setup(dbUtils, team, user1, user2) {
      await dbUtils.addTeamMember(user2!.user_id, team.teamId, "member");
      const worker = await dbUtils.createWorker({
        teamId: team.teamId,
        name: "Worker User",
        weeklyHours: 40,
      });
      await dbUtils.attachWorkerToUser(worker.id, user2!.user_id, team.teamId);
      const allShifts = await dbUtils.getAllShifts(team.teamId);
      const leaveShift = allShifts.find((s) => s.shiftType === ShiftType.LEAVE);
      const request = await dbUtils.createRequestAs(user2!.user_id, {
        teamId: team.teamId,
        workerId: worker.id,
        requestType: RequestType.LEAVE,
        startDate: dayjs.utc(REQUEST_DATE),
        endDate: dayjs.utc(REQUEST_DATE),
        shiftId: leaveShift?.id ?? null,
      });
      await dbUtils.denyRequestAs(user1!.user_id, request.id, team.teamId);
      return user2!.user_id;
    },
    expectedText: (_name) =>
      new RegExp(`^Your request for .* on ${REQUEST_DATE} was denied$`),
    expectedUrlPattern: /\/plan\/requests/,
  },
  {
    type: "user_published_schedule",
    description:
      "user1 validates a schedule; user2 (linked worker) is notified",
    preferenceKey: "user_published_schedule",
    recipientRole: "user2",
    async setup(dbUtils, team, _user1, user2) {
      await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
      const worker = await dbUtils.createWorker({
        teamId: team.teamId,
        name: "Worker User",
        weeklyHours: 40,
      });
      await dbUtils.attachWorkerToUser(worker.id, user2.user_id, team.teamId);
      const schedule = await dbUtils.createSchedule(team.teamId);
      await dbUtils.validateSchedule(schedule.id, team.teamId);
      return user2.user_id;
    },
    expectedText: (name) => new RegExp(`has been published for team ${name}`),
    expectedUrlPattern: /\/plan\/schedule/,
  },
  {
    type: "user_created_assignment",
    description:
      "manager creates an assignment in a published schedule; worker (user2) is notified",
    preferenceKey: "user_created_assignment",
    recipientRole: "user2",
    async setup(dbUtils, team, _user1, user2) {
      await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
      const worker = await dbUtils.createWorker({
        teamId: team.teamId,
        name: "Worker User",
        weeklyHours: 40,
      });
      // Validate BEFORE attaching so user2 does not receive a schedule-published notification.
      const schedule = await dbUtils.createSchedule(team.teamId);
      await dbUtils.validateSchedule(schedule.id, team.teamId);
      await dbUtils.attachWorkerToUser(worker.id, user2.user_id, team.teamId);
      const allShifts = await dbUtils.getAllShifts(team.teamId);
      const workShift = allShifts.find(
        (s) => s.shiftType === ShiftType.NORMAL,
      )!;
      await dbUtils.createAssignmentAndRecurrence({
        teamId: team.teamId,
        workerId: worker.id,
        shiftId: workShift.id,
        date: schedule.startDate,
        scheduleId: schedule.id,
      });
      return user2.user_id;
    },
    expectedText: (_name) => /has been added to your schedule/,
    expectedUrlPattern: /\/plan\/schedule/,
  },
  {
    type: "user_updated_assignment",
    description:
      "manager changes the date of an assignment in a published schedule; worker (user2) is notified",
    preferenceKey: "user_updated_assignment",
    recipientRole: "user2",
    async setup(dbUtils, team, _user1, user2) {
      await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
      const worker = await dbUtils.createWorker({
        teamId: team.teamId,
        name: "Worker User",
        weeklyHours: 40,
      });
      const schedule = await dbUtils.createSchedule(team.teamId);
      await dbUtils.validateSchedule(schedule.id, team.teamId);
      await dbUtils.attachWorkerToUser(worker.id, user2.user_id, team.teamId);
      const allShifts = await dbUtils.getAllShifts(team.teamId);
      const workShift = allShifts.find(
        (s) => s.shiftType === ShiftType.NORMAL,
      )!;
      const result = await dbUtils.createAssignmentAndRecurrence({
        teamId: team.teamId,
        workerId: worker.id,
        shiftId: workShift.id,
        date: schedule.startDate,
        scheduleId: schedule.id,
      });
      const assignment = result.assignmentsCreated[0];
      await dbUtils.updateAssignment(assignment.id, team.teamId, {
        date: schedule.startDate.add(1, "day"),
      });
      return user2.user_id;
    },
    expectedText: (_name) => /was updated/,
    expectedUrlPattern: /\/plan\/schedule/,
  },
  {
    type: "user_deleted_assignment",
    description:
      "manager deletes an assignment in a published schedule; worker (user2) is notified",
    preferenceKey: "user_deleted_assignment",
    recipientRole: "user2",
    async setup(dbUtils, team, _user1, user2) {
      await dbUtils.addTeamMember(user2.user_id, team.teamId, "member");
      const worker = await dbUtils.createWorker({
        teamId: team.teamId,
        name: "Worker User",
        weeklyHours: 40,
      });
      const schedule = await dbUtils.createSchedule(team.teamId);
      await dbUtils.validateSchedule(schedule.id, team.teamId);
      await dbUtils.attachWorkerToUser(worker.id, user2.user_id, team.teamId);
      const allShifts = await dbUtils.getAllShifts(team.teamId);
      const workShift = allShifts.find(
        (s) => s.shiftType === ShiftType.NORMAL,
      )!;
      const result = await dbUtils.createAssignmentAndRecurrence({
        teamId: team.teamId,
        workerId: worker.id,
        shiftId: workShift.id,
        date: schedule.startDate,
        scheduleId: schedule.id,
      });
      const assignment = result.assignmentsCreated[0];
      await dbUtils.deleteAssignment(assignment.id, team.teamId);
      return user2.user_id;
    },
    expectedText: (_name) => /was removed from your schedule/,
    expectedUrlPattern: /\/plan\/schedule/,
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
      const expected = tc.expectedText(team.name);
      if (expected instanceof RegExp) {
        await expect(msg).toHaveText(expected);
      } else {
        await expect(msg).toHaveText(expected);
      }
    });

    test("does not appear on page when inApp is disabled", async ({
      page,
    }, testInfo) => {
      const { dbUtils, team, user1, user2 } = ctxMap.get(
        ctxMap.getRunId(testInfo),
      );
      const recipient = tc.recipientRole === "user1" ? user1! : user2!;

      // Disable inApp before the event fires
      const prefs = await dbUtils.getNotificationPreferencesAs(
        recipient.user_id,
      );
      prefs.preferences[tc.preferenceKey].inApp = false;
      await dbUtils.setNotificationPreferencesAs(recipient.user_id, prefs);

      await tc.setup(dbUtils, team, user1!, user2!);

      await navigateToNotificationsAsUser(page, dbUtils, recipient.user_id);
      await expect(
        page.locator('[data-testid="notification-item"]'),
      ).toHaveCount(0);
    });
  });
}
