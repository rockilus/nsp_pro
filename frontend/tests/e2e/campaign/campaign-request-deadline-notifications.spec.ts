import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { DatabaseTestUtils, TestUser } from '../../utils/database-utils';
import { NotificationTypeT } from '@/types/notification';

interface NotifTestContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
  owner: TestUser;
  memberA: TestUser;
  memberB: TestUser;
  schedule: any;
}

const testContextMap = new Map<string, NotifTestContext>();

async function findNotification(dbUtils: DatabaseTestUtils, userId: string, type: string, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const notifs = await dbUtils.getNotificationsAs(userId);
    const n = notifs.find((x) => x.type === type);
    if (n) return n;
    await new Promise((r) => setTimeout(r, 200));
  }
  return undefined;
}

test.describe('Campaign request-deadline notifications', () => {
  test.beforeEach(async ({}, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const dbUtils = new DatabaseTestUtils();

    const ownerId = randomUUID().replace(/-/g, '').slice(0, 24);
    const memberAId = randomUUID().replace(/-/g, '').slice(0, 24);
    const memberBId = randomUUID().replace(/-/g, '').slice(0, 24);

    const owner: TestUser = {
      user_id: ownerId,
      email: `owner-${ownerId}@example.com`,
      username: `owner-${ownerId}`,
      first_name: 'Owner',
      last_name: 'User',
    };
    const memberA: TestUser = {
      user_id: memberAId,
      email: `memberA-${memberAId}@example.com`,
      username: `memberA-${memberAId}`,
      first_name: 'Member',
      last_name: 'A',
    };
    const memberB: TestUser = {
      user_id: memberBId,
      email: `memberB-${memberBId}@example.com`,
      username: `memberB-${memberBId}`,
      first_name: 'Member',
      last_name: 'B',
    };

    await dbUtils.createTestUser(owner);
    await dbUtils.createTestUser(memberA);
    await dbUtils.createTestUser(memberB);

    const team = await dbUtils.createTeam({
      name: `Campaign Notif ${workerIndex}-${Date.now()}`,
      ownerUserId: owner.user_id,
    });

    await dbUtils.addTeamMember(memberA.user_id, team.teamId, 'member');
    await dbUtils.addTeamMember(memberB.user_id, team.teamId, 'member');

    // Create workers and attach them to the corresponding users so
    // notifications are delivered to the linked users (mirrors schedule tests).
    const ownerWorker = await dbUtils.createWorker({
      teamId: team.teamId,
      name: 'Owner Worker',
      weeklyHours: 40,
    });
    await dbUtils.attachWorkerToUser(ownerWorker.id, owner.user_id, team.teamId);

    const workerA = await dbUtils.createWorker({
      teamId: team.teamId,
      name: 'Member A Worker',
      weeklyHours: 40,
    });
    await dbUtils.attachWorkerToUser(workerA.id, memberA.user_id, team.teamId);

    const workerB = await dbUtils.createWorker({
      teamId: team.teamId,
      name: 'Member B Worker',
      weeklyHours: 40,
    });
    await dbUtils.attachWorkerToUser(workerB.id, memberB.user_id, team.teamId);

    const schedule = await dbUtils.createSchedule(team.teamId);

    testContextMap.set(testRunId, { dbUtils, team, owner, memberA, memberB, schedule });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  test('creates notification when setting deadline for the first time', async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, memberA, memberB, schedule } = testContextMap.get(testRunId)!;

    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, deadline);

    const notifA = await findNotification(dbUtils, memberA.user_id, 'campaign_request_deadline_set');
    const notifB = await findNotification(dbUtils, memberB.user_id, 'campaign_request_deadline_set');

    expect(notifA).toBeDefined();
    expect(notifA!.userId).toBe(memberA.user_id);
    expect(notifA!.teamId).toBe(team.teamId);
    expect(notifA!.type).toBe('campaign_request_deadline_set' as NotificationTypeT);
    expect(notifA!.eventData.teamName).toBe(team.name);

    expect(notifB).toBeDefined();
    expect(notifB!.userId).toBe(memberB.user_id);
    expect(notifB!.teamId).toBe(team.teamId);
    expect(notifB!.type).toBe('campaign_request_deadline_set' as NotificationTypeT);
    expect(notifB!.eventData.teamName).toBe(team.name);
  });

  test('creates notification when editing (extending) deadline', async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, memberA, memberB, schedule } = testContextMap.get(testRunId)!;

    const initialDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const newDeadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, initialDeadline);
    await dbUtils.editRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, newDeadline);

    const notifA = await findNotification(dbUtils, memberA.user_id, 'campaign_request_deadline_updated');
    const notifB = await findNotification(dbUtils, memberB.user_id, 'campaign_request_deadline_updated');

    expect(notifA).toBeDefined();
    expect(notifA!.type).toBe('campaign_request_deadline_updated' as NotificationTypeT);
    expect(notifA!.teamId).toBe(team.teamId);

    expect(notifB).toBeDefined();
    expect(notifB!.type).toBe('campaign_request_deadline_updated' as NotificationTypeT);
    expect(notifB!.teamId).toBe(team.teamId);
  });

  test('creates notification when sending reminder', async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, memberA, memberB, schedule } = testContextMap.get(testRunId)!;

    const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, deadline);

    await dbUtils.sendRequestDeadlineReminderAs(owner.user_id, schedule.id, team.teamId);

    const notifA = await findNotification(dbUtils, memberA.user_id, 'campaign_request_deadline_reminder');
    const notifB = await findNotification(dbUtils, memberB.user_id, 'campaign_request_deadline_reminder');

    expect(notifA).toBeDefined();
    expect(notifA!.type).toBe('campaign_request_deadline_reminder' as NotificationTypeT);
    expect(notifA!.teamId).toBe(team.teamId);

    expect(notifB).toBeDefined();
    expect(notifB!.type).toBe('campaign_request_deadline_reminder' as NotificationTypeT);
    expect(notifB!.teamId).toBe(team.teamId);
  });

  test('does not create notification when deleting a deadline', async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, memberA, memberB, schedule } = testContextMap.get(testRunId)!;

    const deadline = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    await dbUtils.setRequestDeadlineAs(owner.user_id, schedule.id, team.teamId, deadline);

    const beforeA = (await dbUtils.getNotificationsAs(memberA.user_id)).filter((n) =>
      n.type.startsWith('campaign_request_deadline'),
    ).length;
    const beforeB = (await dbUtils.getNotificationsAs(memberB.user_id)).filter((n) =>
      n.type.startsWith('campaign_request_deadline'),
    ).length;

    await dbUtils.deleteRequestDeadlineAs(owner.user_id, schedule.id, team.teamId);

    // small delay to allow any async notifications (there should be none)
    await new Promise((r) => setTimeout(r, 500));

    const afterA = (await dbUtils.getNotificationsAs(memberA.user_id)).filter((n) =>
      n.type.startsWith('campaign_request_deadline'),
    ).length;
    const afterB = (await dbUtils.getNotificationsAs(memberB.user_id)).filter((n) =>
      n.type.startsWith('campaign_request_deadline'),
    ).length;

    expect(afterA).toBe(beforeA);
    expect(afterB).toBe(beforeB);
  });
});
