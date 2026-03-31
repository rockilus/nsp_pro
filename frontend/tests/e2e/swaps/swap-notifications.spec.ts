/**
 * E2E tests for Swap Notification functionality
 *
 * Follows the request-notifications.spec.ts pattern: API-level DB checks
 * (no page navigation) to verify notifications are created correctly.
 *
 * Covers all 11 granular swap notification types:
 *  1. user_created_direct_swap
 *  2. user_accepted_direct_swap
 *  3. user_refused_direct_swap
 *  4. user_created_open_swap
 *  5. user_bid_open_swap
 *  6. user_selected_bid_open_swap
 *  7. user_selected_other_bid_open_swap
 *  8. swap_ready_for_review
 *  9. user_validated_swap
 * 10. user_denied_swap
 * 11. user_reversed_swap
 */
import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DatabaseTestUtils, TestUser } from "../../utils/database-utils";
import { ShiftType } from "@/types/shift";
import { SwapType } from "@/types/swap";
import { NotificationTypeT } from "@/types/notification";

dayjs.extend(utc);

// Future date: first working day of a month 2 months from now.
const SWAP_DATE = dayjs
  .utc()
  .add(2, "month")
  .startOf("month")
  .add(1, "day")
  .format("YYYY-MM-DD");

interface SwapNotifContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
  /** Team owner / manager */
  owner: TestUser;
  /** Team member (will be linked to memberWorker) */
  member: TestUser;
  ownerWorkerId: string;
  memberWorkerId: string;
  /** Assignment ID owned by ownerWorker on SWAP_DATE */
  ownerAssignmentId: string;
  /** Assignment ID owned by memberWorker on SWAP_DATE */
  memberAssignmentId: string;
  shiftName: string;
}

const testContextMap = new Map<string, SwapNotifContext>();

test.describe("Swap notifications", () => {
  test.beforeEach(async ({}, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const dbUtils = new DatabaseTestUtils();

    // Create unique users per test run to prevent cross-worker notification leakage.
    const ownerId = randomUUID().replace(/-/g, "").slice(0, 24);
    const memberId = randomUUID().replace(/-/g, "").slice(0, 24);

    const owner: TestUser = {
      user_id: ownerId,
      email: `owner-${ownerId}@example.com`,
      username: `owner-${ownerId}`,
      first_name: "Swap",
      last_name: "Owner",
    };
    const member: TestUser = {
      user_id: memberId,
      email: `member-${memberId}@example.com`,
      username: `member-${memberId}`,
      first_name: "Swap",
      last_name: "Member",
    };

    await dbUtils.createTestUser(owner);
    await dbUtils.createTestUser(member);

    // Create team owned by the unique owner user.
    const team = await dbUtils.createTeam({
      name: `Swap Notif Team ${workerIndex}-${Date.now()}`,
      ownerUserId: owner.user_id,
    });

    // Add member as team member.
    await dbUtils.addTeamMember(member.user_id, team.teamId, "member");

    // Create workers (uses testApiClient / TEST_USER access in dev).
    const ownerWorker = await dbUtils.createWorker({
      teamId: team.teamId,
      name: "Owner Worker",
      weeklyHours: 40,
    });
    const memberWorker = await dbUtils.createWorker({
      teamId: team.teamId,
      name: "Member Worker",
      weeklyHours: 40,
    });

    // Attach each worker to the corresponding user.
    await dbUtils.attachWorkerToUser(
      ownerWorker.id,
      owner.user_id,
      team.teamId,
    );
    await dbUtils.attachWorkerToUser(
      memberWorker.id,
      member.user_id,
      team.teamId,
    );

    // Create a normal shift for the team.
    const shift = await dbUtils.createShift({
      teamId: team.teamId,
      name: "Day Shift",
      startTime: dayjs.utc().hour(8).minute(0).second(0).millisecond(0),
      endTime: dayjs.utc().hour(16).minute(0).second(0).millisecond(0),
      shiftType: ShiftType.NORMAL,
    });

    // Create a schedule that covers SWAP_DATE and validate it.
    const schedule = await dbUtils.createSchedule(team.teamId);
    await dbUtils.validateSchedule(schedule.id, team.teamId);

    // Create one assignment per worker on SWAP_DATE.
    const ownerAssignmentResult = await dbUtils.createAssignmentAndRecurrence({
      teamId: team.teamId,
      workerId: ownerWorker.id,
      shiftId: shift.id,
      date: dayjs.utc(SWAP_DATE),
      scheduleId: schedule.id,
    });
    const memberAssignmentResult = await dbUtils.createAssignmentAndRecurrence({
      teamId: team.teamId,
      workerId: memberWorker.id,
      shiftId: shift.id,
      date: dayjs.utc(SWAP_DATE).add(1, "day"), // slightly different date to avoid conflict
      scheduleId: schedule.id,
    });

    const ownerAssignmentId = ownerAssignmentResult.assignmentsCreated[0].id;
    const memberAssignmentId = memberAssignmentResult.assignmentsCreated[0].id;

    testContextMap.set(testRunId, {
      dbUtils,
      team,
      owner,
      member,
      ownerWorkerId: ownerWorker.id,
      memberWorkerId: memberWorker.id,
      ownerAssignmentId,
      memberAssignmentId,
      shiftName: "Day Shift",
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  // ---------------------------------------------------------------------------
  // 1. user_created_direct_swap
  // ---------------------------------------------------------------------------
  test("target worker is notified when requester creates a direct swap", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    // Owner creates a direct swap targeting the member's assignment.
    await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.DIRECT,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: [memberAssignmentId],
      targetWorkerId: memberWorkerId,
      comment: "Let's swap",
    });

    const notifications = await dbUtils.getNotificationsAs(member.user_id);
    const notification = notifications.find(
      (n) => n.type === ("user_created_direct_swap" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(member.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_created_direct_swap" as NotificationTypeT,
    );
  });

  // ---------------------------------------------------------------------------
  // 2. user_accepted_direct_swap
  // ---------------------------------------------------------------------------
  test("requester is notified when target accepts a direct swap", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.DIRECT,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: [memberAssignmentId],
      targetWorkerId: memberWorkerId,
      comment: "Let's swap",
    });

    await dbUtils.acceptDirectSwapAs(member.user_id, swap.id);

    const notifications = await dbUtils.getNotificationsAs(owner.user_id);
    const notification = notifications.find(
      (n) => n.type === ("user_accepted_direct_swap" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(owner.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_accepted_direct_swap" as NotificationTypeT,
    );
  });

  // ---------------------------------------------------------------------------
  // 3. user_refused_direct_swap
  // ---------------------------------------------------------------------------
  test("requester is notified when target refuses a direct swap", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.DIRECT,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: [memberAssignmentId],
      targetWorkerId: memberWorkerId,
      comment: "Let's swap",
    });

    await dbUtils.refuseDirectSwapAs(member.user_id, swap.id);

    const notifications = await dbUtils.getNotificationsAs(owner.user_id);
    const notification = notifications.find(
      (n) => n.type === ("user_refused_direct_swap" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(owner.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_refused_direct_swap" as NotificationTypeT,
    );
  });

  // ---------------------------------------------------------------------------
  // 4. user_created_open_swap
  // ---------------------------------------------------------------------------
  test("team members are notified when a worker creates an open swap", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, team, owner, member, ownerAssignmentId } =
      testContextMap.get(testRunId)!;

    await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.OPEN,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: null,
      targetWorkerId: null,
      comment: "Open swap",
    });

    const notifications = await dbUtils.getNotificationsAs(member.user_id);
    const notification = notifications.find(
      (n) => n.type === ("user_created_open_swap" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(member.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_created_open_swap" as NotificationTypeT,
    );
  });

  // ---------------------------------------------------------------------------
  // 5. user_bid_open_swap
  // ---------------------------------------------------------------------------
  test("open swap creator is notified when someone bids", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.OPEN,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: null,
      targetWorkerId: null,
      comment: "Open swap",
    });

    await dbUtils.addBidToOpenSwapAs(member.user_id, swap.id, memberWorkerId, [
      memberAssignmentId,
    ]);

    const notifications = await dbUtils.getNotificationsAs(owner.user_id);
    const notification = notifications.find(
      (n) => n.type === ("user_bid_open_swap" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(owner.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe("user_bid_open_swap" as NotificationTypeT);
  });

  // ---------------------------------------------------------------------------
  // 6. user_selected_bid_open_swap
  // ---------------------------------------------------------------------------
  test("selected bidder is notified when their bid is chosen", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.OPEN,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: null,
      targetWorkerId: null,
      comment: "Open swap",
    });

    const swapWithBid = await dbUtils.addBidToOpenSwapAs(
      member.user_id,
      swap.id,
      memberWorkerId,
      [memberAssignmentId],
    );

    const bid = swapWithBid.bids?.[0];
    expect(bid).toBeDefined();

    await dbUtils.acceptBidOnOpenSwapAs(owner.user_id, swap.id, bid!.id);

    const notifications = await dbUtils.getNotificationsAs(member.user_id);
    const notification = notifications.find(
      (n) => n.type === ("user_selected_bid_open_swap" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(member.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_selected_bid_open_swap" as NotificationTypeT,
    );
  });

  // ---------------------------------------------------------------------------
  // 7. user_selected_other_bid_open_swap
  // ---------------------------------------------------------------------------
  test("non-selected bidders are notified when another bid is chosen", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    // Create a third unique user who will also bid on the swap.
    const thirdId = randomUUID().replace(/-/g, "").slice(0, 24);
    const thirdUser: TestUser = {
      user_id: thirdId,
      email: `third-${thirdId}@example.com`,
      username: `third-${thirdId}`,
      first_name: "Third",
      last_name: "Bidder",
    };
    await dbUtils.createTestUser(thirdUser);
    await dbUtils.addTeamMember(thirdUser.user_id, team.teamId, "member");

    // Create a third worker and assignment.
    const thirdWorker = await dbUtils.createWorker({
      teamId: team.teamId,
      name: "Third Bidder Worker",
      weeklyHours: 40,
    });
    await dbUtils.attachWorkerToUser(
      thirdWorker.id,
      thirdUser.user_id,
      team.teamId,
    );
    const shift = (await dbUtils.getAllShifts(team.teamId)).find(
      (s) => s.shiftType === ShiftType.NORMAL,
    )!;
    const schedules = await dbUtils.getSchedules(team.teamId);
    const schedule = schedules[0];
    const thirdAssignmentResult = await dbUtils.createAssignmentAndRecurrence({
      teamId: team.teamId,
      workerId: thirdWorker.id,
      shiftId: shift.id,
      date: dayjs.utc(SWAP_DATE).add(2, "day"),
      scheduleId: schedule.id,
    });
    const thirdAssignmentId = thirdAssignmentResult.assignmentsCreated[0].id;

    // Owner creates an open swap.
    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.OPEN,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: null,
      targetWorkerId: null,
      comment: "Open swap",
    });

    // member bids (will NOT be selected).
    await dbUtils.addBidToOpenSwapAs(member.user_id, swap.id, memberWorkerId, [
      memberAssignmentId,
    ]);

    // thirdUser bids (will be selected).
    const swapWithBids = await dbUtils.addBidToOpenSwapAs(
      thirdUser.user_id,
      swap.id,
      thirdWorker.id,
      [thirdAssignmentId],
    );

    // Find the bid by thirdUser.
    const selectedBid = swapWithBids.bids?.find(
      (b) => b.workerId === thirdWorker.id,
    );
    expect(selectedBid).toBeDefined();

    // Owner selects thirdUser's bid.
    await dbUtils.acceptBidOnOpenSwapAs(
      owner.user_id,
      swap.id,
      selectedBid!.id,
    );

    // member (non-selected bidder) should receive user_selected_other_bid_open_swap.
    const notifications = await dbUtils.getNotificationsAs(member.user_id);
    const notification = notifications.find(
      (n) =>
        n.type === ("user_selected_other_bid_open_swap" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(member.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "user_selected_other_bid_open_swap" as NotificationTypeT,
    );
  });

  // ---------------------------------------------------------------------------
  // 8. swap_ready_for_review
  // ---------------------------------------------------------------------------
  test("team owner is notified when a swap is pending approval", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    // Create a direct swap (owner requests member's shift).
    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.DIRECT,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: [memberAssignmentId],
      targetWorkerId: memberWorkerId,
      comment: "Needs review",
    });

    // Member accepts: swap goes to pending_approval → triggers swap_ready_for_review.
    await dbUtils.acceptDirectSwapAs(member.user_id, swap.id);

    const notifications = await dbUtils.getNotificationsAs(owner.user_id);
    const notification = notifications.find(
      (n) => n.type === ("swap_ready_for_review" as NotificationTypeT),
    );

    expect(notification).toBeDefined();
    expect(notification!.userId).toBe(owner.user_id);
    expect(notification!.teamId).toBe(team.teamId);
    expect(notification!.type).toBe(
      "swap_ready_for_review" as NotificationTypeT,
    );
  });

  // ---------------------------------------------------------------------------
  // 9. user_validated_swap
  // ---------------------------------------------------------------------------
  test("swap parties are notified when the swap is approved", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.DIRECT,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: [memberAssignmentId],
      targetWorkerId: memberWorkerId,
      comment: "Approve this",
    });

    await dbUtils.acceptDirectSwapAs(member.user_id, swap.id);

    // Owner (who is also the manager) approves the swap.
    await dbUtils.approveSwapAsUser(swap.id, owner.user_id);

    // Both parties should receive user_validated_swap.
    const memberNotifications = await dbUtils.getNotificationsAs(
      member.user_id,
    );
    const memberNotif = memberNotifications.find(
      (n) => n.type === ("user_validated_swap" as NotificationTypeT),
    );

    expect(memberNotif).toBeDefined();
    expect(memberNotif!.userId).toBe(member.user_id);
    expect(memberNotif!.teamId).toBe(team.teamId);
    expect(memberNotif!.type).toBe("user_validated_swap" as NotificationTypeT);
  });

  // ---------------------------------------------------------------------------
  // 10. user_denied_swap
  // ---------------------------------------------------------------------------
  test("swap parties are notified when the swap is denied", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.DIRECT,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: [memberAssignmentId],
      targetWorkerId: memberWorkerId,
      comment: "Deny this",
    });

    await dbUtils.acceptDirectSwapAs(member.user_id, swap.id);

    // Owner (manager) denies the swap.
    await dbUtils.denySwapAs(owner.user_id, swap.id);

    // Both parties should receive user_denied_swap.
    const memberNotifications = await dbUtils.getNotificationsAs(
      member.user_id,
    );
    const memberNotif = memberNotifications.find(
      (n) => n.type === ("user_denied_swap" as NotificationTypeT),
    );

    expect(memberNotif).toBeDefined();
    expect(memberNotif!.userId).toBe(member.user_id);
    expect(memberNotif!.teamId).toBe(team.teamId);
    expect(memberNotif!.type).toBe("user_denied_swap" as NotificationTypeT);
  });

  // ---------------------------------------------------------------------------
  // 11. user_reversed_swap
  // ---------------------------------------------------------------------------
  test("swap parties are notified when a completed swap is reversed", async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const {
      dbUtils,
      team,
      owner,
      member,
      ownerAssignmentId,
      memberAssignmentId,
      memberWorkerId,
    } = testContextMap.get(testRunId)!;

    const swap = await dbUtils.createSwapAs(owner.user_id, {
      teamId: team.teamId,
      swapType: SwapType.DIRECT,
      offeredAssignmentIds: [ownerAssignmentId],
      requestedAssignmentIds: [memberAssignmentId],
      targetWorkerId: memberWorkerId,
      comment: "Then reverse",
    });

    await dbUtils.acceptDirectSwapAs(member.user_id, swap.id);
    await dbUtils.approveSwapAsUser(swap.id, owner.user_id);

    // Owner (manager) reverts the completed swap.
    await dbUtils.revertSwap(swap.id);

    // Both parties should receive user_reversed_swap.
    const memberNotifications = await dbUtils.getNotificationsAs(
      member.user_id,
    );
    const memberNotif = memberNotifications.find(
      (n) => n.type === ("user_reversed_swap" as NotificationTypeT),
    );

    expect(memberNotif).toBeDefined();
    expect(memberNotif!.userId).toBe(member.user_id);
    expect(memberNotif!.teamId).toBe(team.teamId);
    expect(memberNotif!.type).toBe("user_reversed_swap" as NotificationTypeT);
  });
});
