/**
 * E2E tests for Request Notification functionality
 *
 * Follows the team-notifications.spec.ts pattern: API-level DB checks
 * (no page navigation) to verify notifications are created correctly.
 *
 * Three scenarios:
 * 1. Team manager is notified when a worker creates a new request.
 * 2. Request creator is notified when their request is approved.
 * 3. Request creator is notified when their request is denied.
 */
import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DatabaseTestUtils, TestUser } from "../../utils/database-utils";
import { RequestType } from "@/types/request";
import { NotificationTypeT } from "@/types/notification";

dayjs.extend(utc);

// Fixed future date used across all request notification tests so assertions
// can rely on a known start_date value in event_data.
const REQUEST_DATE = "2030-06-15";

interface RequestNotifContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
  manager: TestUser;
  worker: TestUser;
  workerId: string;
}

const testContextMap = new Map<string, RequestNotifContext>();

test.describe("Request notifications", () => {
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
        "notifications",
        "workers",
        "requests",
      ],
    });

    // Create two unique users per test run to prevent cross-worker leakage.
    const managerId = randomUUID().replace(/-/g, "").slice(0, 24);
    const workUserId = randomUUID().replace(/-/g, "").slice(0, 24);

    const manager: TestUser = {
      user_id: managerId,
      email: `manager-${managerId}@example.com`,
      username: `manager-${managerId}`,
      first_name: "Team",
      last_name: "Manager",
    };
    const workerUser: TestUser = {
      user_id: workUserId,
      email: `worker-${workUserId}@example.com`,
      username: `worker-${workUserId}`,
      first_name: "Worker",
      last_name: "User",
    };

    await dbUtils.createTestUser(manager);
    await dbUtils.createTestUser(workerUser);

    // Create team owned by manager.
    const team = await dbUtils.createTeam({
      name: `Request Notif Team ${workerIndex}-${Date.now()}`,
      ownerUserId: manager.user_id,
    });

    // Create a worker in the team and attach workerUser to it.
    const workerRecord = await dbUtils.createWorker({
      teamId: team.teamId,
      name: "Worker User",
      weeklyHours: 40,
    });
    await dbUtils.attachWorkerToUser(
      workerRecord.id,
      workerUser.user_id,
      team.teamId,
    );

    // workerUser needs to be a team member so they can create requests.
    await dbUtils.addTeamMember(workerUser.user_id, team.teamId, "member");

    testContextMap.set(testRunId, {
      dbUtils,
      team,
      manager,
      worker: workerUser,
      workerId: workerRecord.id,
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  test("team manager is notified when a worker creates a new request", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, manager, worker, workerId } =
      testContextMap.get(testRunId)!;

    await dbUtils.createRequestAs(worker.user_id, {
      teamId: team.teamId,
      workerId,
      requestType: RequestType.LEAVE,
      startDate: dayjs.utc(REQUEST_DATE),
      endDate: dayjs.utc(REQUEST_DATE),
    });

    const notifications = await dbUtils.getNotificationsAs(manager.user_id);
    const notification = notifications.find((n) => n.type === "new_request");

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(manager.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe("new_request" as NotificationTypeT);
    expect(notification!.eventData.workerName).toBe("Worker User");
    expect(notification!.eventData.startDate).toBe(REQUEST_DATE);
  });

  test("request creator is notified when their request is approved", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, manager, worker, workerId } =
      testContextMap.get(testRunId)!;

    const request = await dbUtils.createRequestAs(worker.user_id, {
      teamId: team.teamId,
      workerId,
      requestType: RequestType.LEAVE,
      startDate: dayjs.utc(REQUEST_DATE),
      endDate: dayjs.utc(REQUEST_DATE),
    });

    await dbUtils.approveRequestAs(manager.user_id, request.id, team.teamId);

    const notifications = await dbUtils.getNotificationsAs(worker.user_id);
    const notification = notifications.find(
      (n) => n.type === "request_status_changed",
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(worker.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "request_status_changed" as NotificationTypeT,
    );
    expect(notification!.eventData.newStatus).toBe("approved");
    expect(notification!.eventData.date).toBe(REQUEST_DATE);
  });

  test("request creator is notified when their request is denied", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, manager, worker, workerId } =
      testContextMap.get(testRunId)!;

    const request = await dbUtils.createRequestAs(worker.user_id, {
      teamId: team.teamId,
      workerId,
      requestType: RequestType.LEAVE,
      startDate: dayjs.utc(REQUEST_DATE),
      endDate: dayjs.utc(REQUEST_DATE),
    });

    await dbUtils.denyRequestAs(manager.user_id, request.id, team.teamId);

    const notifications = await dbUtils.getNotificationsAs(worker.user_id);
    const notification = notifications.find(
      (n) => n.type === "request_status_changed",
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(worker.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "request_status_changed" as NotificationTypeT,
    );
    expect(notification!.eventData.newStatus).toBe("denied");
    expect(notification!.eventData.date).toBe(REQUEST_DATE);
  });
});
