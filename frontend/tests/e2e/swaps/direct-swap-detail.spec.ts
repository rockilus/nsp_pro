/**
 * E2E tests for Direct Swap Detail Functionality
 *
 * These tests verify the complete direct swap lifecycle including:
 * - Swap creator actions (view details, cancel, check acceptance status)
 * - Target worker actions (accept/reject, view status)
 * - Team leader approval (complete swap, verify assignment changes)
 */

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { SwapTestBase } from "../../utils/swap-test-base";
import { SwapStatus } from "../../../src/types/swap";
import { TEST_USER, TEST_USER_2 } from "../../utils/database-utils";

dayjs.extend(utc);

test.describe("Direct Swap Detail - Swap Creator Tests", () => {
  const swapTestBase = new SwapTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and swaps
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should display swap details when clicking view details", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    expect(swaps.length).toBeGreaterThan(0);

    const testSwap = swaps[0];

    // Find and click the view details button for the test swap
    const swapCard = page
      .locator(`[data-testid="view-details-button"]`)
      .first();
    await swapCard.click();

    // Wait for dialog to open
    await page.waitForSelector('[data-testid="swap-detail-dialog"]', {
      timeout: 10000,
    });

    // Verify dialog is visible
    const dialog = page.locator('[data-testid="swap-detail-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify swap type chip shows "Direct Swap"
    const swapTypeChip = page.locator('[data-testid="swap-type-chip"]');
    await expect(swapTypeChip).toHaveText("Direct Swap");

    // Verify status chip is visible
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toBeVisible();

    console.log("✅ Swap details dialog displayed correctly");
  });

  test("should show offered assignments section", async ({ page }) => {
    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify offered assignments section exists
    const offeredSection = page.locator(
      '[data-testid="offered-assignments-section"]',
    );
    await expect(offeredSection).toBeVisible();

    // Verify offered assignments are displayed
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    for (const assignmentId of testSwap.offeredAssignmentIds) {
      const assignmentCard = page.locator(
        `[data-testid="offered-assignment-${assignmentId}"]`,
      );
      await expect(assignmentCard).toBeVisible();
    }

    console.log(
      `✅ All ${testSwap.offeredAssignmentIds.length} offered assignments displayed`,
    );
  });

  test("should show requested assignments section for direct swap", async ({
    page,
  }) => {
    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify requested assignments section exists
    const requestedSection = page.locator(
      '[data-testid="requested-assignments-section"]',
    );
    await expect(requestedSection).toBeVisible();

    // Verify target worker name is displayed
    const targetWorkerName = page.locator('[data-testid="target-worker-name"]');
    await expect(targetWorkerName).toBeVisible();

    // Verify requested assignments are displayed
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    if (testSwap.requestedAssignmentIds) {
      for (const assignmentId of testSwap.requestedAssignmentIds) {
        const assignmentCard = page.locator(
          `[data-testid="requested-assignment-${assignmentId}"]`,
        );
        await expect(assignmentCard).toBeVisible();
      }

      console.log(
        `✅ All ${testSwap.requestedAssignmentIds.length} requested assignments displayed`,
      );
    }
  });

  test("should show delete button for swap creator", async ({ page }) => {
    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify delete button is visible
    const deleteButton = page.locator('[data-testid="delete-swap-button"]');
    await expect(deleteButton).toBeVisible();

    console.log("✅ Delete button visible for swap creator");
  });

  test("should be able to delete swap", async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Count initial swap cards
    const initialSwapCards = await page
      .locator('[data-testid="view-details-button"]')
      .count();

    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click delete button
    const deleteButton = page.locator('[data-testid="delete-swap-button"]');
    await deleteButton.click();

    // Wait for dialog to close
    await page.waitForSelector('[data-testid="swap-detail-dialog"]', {
      state: "hidden",
      timeout: 10000,
    });

    console.log("✅ SwapDetailDialog closed after delete");

    // Wait for the swap list to refresh
    await page.waitForTimeout(1000);

    // Verify swap is no longer visible in SwapTab
    const currentSwapCards = await page
      .locator('[data-testid="view-details-button"]')
      .count();
    expect(currentSwapCards).toBe(initialSwapCards - 1);

    console.log("✅ Deleted swap no longer visible in SwapTab");
  });

  test("should show target worker acceptance status (before acceptance)", async ({
    page,
  }) => {
    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Status should be ACTIVE (not yet accepted by target)
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toContainText("active");

    // Should NOT show accept button (only target worker can accept)
    const acceptButton = page.locator(
      '[data-testid="accept-direct-swap-button"]',
    );
    await expect(acceptButton).not.toBeVisible();

    console.log("✅ Status correctly shows ACTIVE before target acceptance");
  });
});

test.describe("Direct Swap Detail - Target Worker Tests", () => {
  const swapTestBase = new SwapTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and swaps
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex + 1000, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });
  });

  test.beforeEach(async ({ page }) => {
    // Authenticate as the target worker (Worker 2 is linked to TEST_USER_2)
    await swapTestBase.actAsMember(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should NOT show delete button for target worker", async ({ page }) => {
    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify delete button is NOT visible for target worker
    const deleteButton = page.locator('[data-testid="delete-swap-button"]');
    await expect(deleteButton).not.toBeVisible();

    console.log("✅ Delete button correctly hidden for target worker");
  });

  test("should show accept button for target worker when swap is active", async ({
    page,
  }) => {
    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify accept button is visible
    const acceptButton = page.locator(
      '[data-testid="accept-direct-swap-button"]',
    );
    await expect(acceptButton).toBeVisible();

    console.log("✅ Accept button visible for target worker");
  });

  test("should be able to accept direct swap", async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click accept button
    const acceptButton = page.locator(
      '[data-testid="accept-direct-swap-button"]',
    );
    await acceptButton.click();

    // Wait for the accept action to complete (button might be disabled during loading)
    await page.waitForTimeout(2000);

    // Verify swap status changed to PENDING_APPROVAL via API
    const dbUtils = (swapTestBase as any).dbUtils;
    const updatedSwap = await dbUtils.getSwapById(testSwap.id);
    expect(updatedSwap.status).toBe(SwapStatus.PENDING_APPROVAL);

    console.log("✅ Direct swap accepted, status changed to PENDING_APPROVAL");
  });

  test("should show pending approval status after acceptance", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap via API
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);

    // Reload page to see updated status
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Status should show PENDING_APPROVAL
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toContainText("pending_approval");

    // Accept button should no longer be visible
    const acceptButton = page.locator(
      '[data-testid="accept-direct-swap-button"]',
    );
    await expect(acceptButton).not.toBeVisible();

    console.log("✅ Status correctly shows PENDING_APPROVAL after acceptance");
  });

  test("should NOT show approve button for member even when swap is pending approval", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap via API (changes status to PENDING_APPROVAL)
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);

    // Reload page to see updated status
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify status is PENDING_APPROVAL
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toContainText("pending_approval");

    // Approve button should NOT be visible for member user
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).not.toBeVisible();

    console.log(
      "✅ Approve button correctly hidden for member even when swap is PENDING_APPROVAL",
    );
  });

  test("should NOT allow member to approve swap via API", async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap via API (changes status to PENDING_APPROVAL)
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);

    // Try to approve swap as member (should fail with permission error)
    let approvalFailed = false;
    try {
      await dbUtils.approveSwap(testSwap.id);
    } catch (error: any) {
      approvalFailed = true;
      // Verify it's a permission/authorization error
      expect(error.message).toMatch(/permission|forbidden|unauthorized|403/i);
    }

    // Verify the approval attempt failed
    expect(approvalFailed).toBe(true);

    // Verify swap status is still PENDING_APPROVAL (not COMPLETED)
    const swapAfterAttempt = await dbUtils.getSwapById(testSwap.id);
    expect(swapAfterAttempt.status).toBe(SwapStatus.PENDING_APPROVAL);

    console.log("✅ Member correctly prevented from approving swap via API");
  });
});

test.describe("Direct Swap Detail - Team Leader Approval Tests", () => {
  const swapTestBase = new SwapTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and swaps
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex + 2000, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should NOT show approve button when swap is still active", async ({
    page,
  }) => {
    // Open first swap (should be ACTIVE)
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Approve button should NOT be visible
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).not.toBeVisible();

    console.log("✅ Approve button correctly hidden when swap is ACTIVE");
  });

  test("should show approve button when both parties accepted (pending approval)", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap as target worker via API
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);

    // Reload page to see updated status
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Approve button should now be visible
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).toBeVisible();

    console.log(
      "✅ Approve button visible when swap is in PENDING_APPROVAL state",
    );
  });

  test("should complete swap and update status when approved", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap as target worker via API
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click approve button
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await approveButton.click();

    // Wait for approval to complete
    await page.waitForTimeout(2000);

    // Verify swap status changed to COMPLETED via API
    const completedSwap = await dbUtils.getSwapById(testSwap.id);
    expect(completedSwap.status).toBe(SwapStatus.COMPLETED);

    console.log("✅ Swap status changed to COMPLETED after approval");
  });

  test("should update completedAt timestamp when swap is completed", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve via API
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);
    const completedSwap = await dbUtils.approveSwap(testSwap.id);

    // Verify completedAt is set
    expect(completedSwap.completedAt).not.toBeNull();
    expect(completedSwap.completedAt).toBeDefined();

    // Verify it's a recent timestamp (within last minute)
    const now = dayjs.utc();
    const completedTime = completedSwap.completedAt!;
    const diffSeconds = now.diff(completedTime, "second");
    expect(diffSeconds).toBeLessThan(60);

    console.log("✅ completedAt timestamp correctly set");
  });

  test("should set completedByUserId to team leader when approved", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve via API
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);
    const completedSwap = await dbUtils.approveSwap(testSwap.id);

    // Verify completedByUserId is set to the team leader (TEST_USER)
    expect(completedSwap.completedByUserId).toBe(TEST_USER.user_id);

    console.log("✅ completedByUserId correctly set to team leader");
  });

  test("should populate auditData with original assignment information", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve via API
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);
    const completedSwap = await dbUtils.approveSwap(testSwap.id);

    // Verify auditData is populated
    expect(completedSwap.auditData).toBeDefined();
    expect(completedSwap.auditData.length).toBeGreaterThan(0);

    // Verify auditData contains entries for all swapped assignments
    const totalAssignments =
      testSwap.offeredAssignmentIds.length +
      (testSwap.requestedAssignmentIds?.length || 0);
    expect(completedSwap.auditData.length).toBe(totalAssignments);

    // Verify each audit entry has required fields
    for (const audit of completedSwap.auditData) {
      expect(audit.assignmentId).toBeDefined();
      expect(audit.workerId).toBeDefined();
      expect(audit.shiftId).toBeDefined();
      expect(audit.dateIso).toBeDefined();
    }

    console.log(
      `✅ auditData populated with ${completedSwap.auditData.length} entries`,
    );
  });

  test("should swap assignments correctly between workers", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];
    const workers = swapTestBase.getTestWorkers();
    const teamId = swapTestBase.getTestTeam()!.teamId;

    // Get original assignments before swap
    const dbUtils = (swapTestBase as any).dbUtils;
    const originalOfferedAssignments = testSwap.offeredAssignmentIds;
    const originalRequestedAssignments = testSwap.requestedAssignmentIds || [];

    // Store original worker IDs for each assignment
    const worker1Id = workers[0].workerId;
    const worker2Id = workers[1].workerId;

    // Accept and approve swap
    await dbUtils.acceptDirectSwap(testSwap.id);
    await dbUtils.approveSwap(testSwap.id);

    // Fetch all assignments after swap
    const assignmentsResult = await dbUtils.makeAuthenticatedRequest(
      "GET",
      `/assignments/teams/${teamId}`,
    );
    const allAssignments = assignmentsResult.assignmentsRead;

    // Verify offered assignments now belong to worker2
    for (const offeredAssignmentId of originalOfferedAssignments) {
      const assignment = allAssignments.find(
        (a: any) => a.id === offeredAssignmentId,
      );
      expect(assignment).toBeDefined();
      expect(assignment.workerId).toBe(worker2Id);
    }

    // Verify requested assignments now belong to worker1
    for (const requestedAssignmentId of originalRequestedAssignments) {
      const assignment = allAssignments.find(
        (a: any) => a.id === requestedAssignmentId,
      );
      expect(assignment).toBeDefined();
      expect(assignment.workerId).toBe(worker1Id);
    }

    console.log("✅ Assignments successfully swapped between workers");
  });

  test("should verify assignments maintain their shift and date after swap", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];
    const teamId = swapTestBase.getTestTeam()!.teamId;

    // Get original assignment details
    const dbUtils = (swapTestBase as any).dbUtils;
    const assignmentsBeforeResult = await dbUtils.makeAuthenticatedRequest(
      "GET",
      `/assignments/teams/${teamId}`,
    );
    const assignmentsBefore = assignmentsBeforeResult.assignmentsRead;

    // Store original shift and date for each assignment
    const originalData = new Map();
    for (const assignmentId of [
      ...testSwap.offeredAssignmentIds,
      ...(testSwap.requestedAssignmentIds || []),
    ]) {
      const assignment = assignmentsBefore.find(
        (a: any) => a.id === assignmentId,
      );
      if (assignment) {
        originalData.set(assignmentId, {
          shiftId: assignment.shiftId,
          date: assignment.date,
        });
      }
    }

    // Accept and approve swap
    await dbUtils.acceptDirectSwap(testSwap.id);
    await dbUtils.approveSwap(testSwap.id);

    // Fetch assignments after swap
    const assignmentsAfterResult = await dbUtils.makeAuthenticatedRequest(
      "GET",
      `/assignments/teams/${teamId}`,
    );
    const assignmentsAfter = assignmentsAfterResult.assignmentsRead;

    // Verify each assignment kept its original shift and date
    for (const [assignmentId, original] of originalData.entries()) {
      const assignmentAfter = assignmentsAfter.find(
        (a: any) => a.id === assignmentId,
      );
      expect(assignmentAfter).toBeDefined();
      expect(assignmentAfter.shiftId).toBe(original.shiftId);
      expect(assignmentAfter.date).toBe(original.date);
    }

    console.log(
      "✅ Assignments maintained their shift and date after swap (only worker changed)",
    );
  });

  test("should show audit trail tab after swap is completed", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve via API
    const dbUtils = (swapTestBase as any).dbUtils;
    await dbUtils.acceptDirectSwap(testSwap.id);
    await dbUtils.approveSwap(testSwap.id);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open swap
    await page.click('[data-testid="view-details-button"]');
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify audit trail tab is visible
    const auditTrailTab = page.locator('[data-testid="audit-trail-tab"]');
    await expect(auditTrailTab).toBeVisible();

    console.log("✅ Audit trail tab visible for completed swap");
  });

  test("should correctly swap 2 normal shifts for 1 duty shift", async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();

    // Find the duty swap (second swap in the array)
    const dutySwap = swaps.find((s) => s.comment?.includes("duty swap"));

    if (!dutySwap) {
      console.log("⏭️  Duty swap not found, skipping test");
      return;
    }

    const workers = swapTestBase.getTestWorkers();
    const teamId = swapTestBase.getTestTeam()!.teamId;

    // Get original assignments before swap
    const dbUtils = (swapTestBase as any).dbUtils;

    // Worker1 offered 2 normal shifts (morning + afternoon)
    expect(dutySwap.offeredAssignmentIds.length).toBe(2);

    // Worker2 offered 1 duty shift
    expect(dutySwap.requestedAssignmentIds?.length).toBe(1);

    const worker1Id = workers[0].workerId;
    const worker2Id = workers[1].workerId;

    // Accept and approve the duty swap
    await dbUtils.acceptDirectSwap(dutySwap.id);
    await dbUtils.approveSwap(dutySwap.id);

    // Fetch all assignments after swap
    const assignmentsResult = await dbUtils.makeAuthenticatedRequest(
      "GET",
      `/assignments/teams/${teamId}`,
    );
    const allAssignments = assignmentsResult.assignmentsRead;

    // Verify the 2 normal shifts (morning + afternoon) now belong to worker2
    for (const offeredAssignmentId of dutySwap.offeredAssignmentIds) {
      const assignment = allAssignments.find(
        (a: any) => a.id === offeredAssignmentId,
      );
      expect(assignment).toBeDefined();
      expect(assignment.workerId).toBe(worker2Id);
    }

    // Verify the 1 duty shift now belongs to worker1
    for (const requestedAssignmentId of dutySwap.requestedAssignmentIds!) {
      const assignment = allAssignments.find(
        (a: any) => a.id === requestedAssignmentId,
      );
      expect(assignment).toBeDefined();
      expect(assignment.workerId).toBe(worker1Id);
    }

    // Verify audit data contains all 3 assignments (2 normal + 1 duty)
    const completedDutySwap = await dbUtils.getSwapById(dutySwap.id);
    expect(completedDutySwap.auditData.length).toBe(3);

    console.log(
      "✅ Duty swap completed successfully: 2 normal shifts swapped for 1 duty shift",
    );
  });
});
