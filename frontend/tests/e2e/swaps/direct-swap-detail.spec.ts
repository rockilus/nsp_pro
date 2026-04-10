/**
 * E2E tests for Direct Swap Detail Functionality
 *
 * These tests verify the complete direct swap lifecycle including:
 * - Swap creator actions (view details, cancel, check acceptance status)
 * - Target worker actions (accept/reject, view status)
 * - Team leader approval (complete swap, verify assignment changes)
 */

import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { SwapTestBase } from '../../utils/swap-test-base';
import { SwapStatus } from '../../../src/types/swap';
import { TEST_USER, TEST_USER_2 } from '../../utils/database-utils';
import type { AssignmentT } from '../../../src/types/assignment';
import { ShiftType } from '../../../src/types/shift';
import { ShiftRestType } from '../../../src/types/shift';

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

test.describe('Direct Swap Detail - Swap Creator Tests', () => {
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
    await swapTestBase.selectMySwapsTab(page);
  });

  test('should display swap details when clicking view details', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    expect(swaps.length).toBeGreaterThan(0);

    const testSwap = swaps[0];

    // Find and click the view details button for the test swap
    const swapCard = page.locator(`[data-testid="swap-card-${testSwap.id}"]`);
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
    await expect(swapTypeChip).toHaveText('Direct Swap');

    // Verify status chip is visible
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toBeVisible();

    console.log('✅ Swap details dialog displayed correctly');
  });

  test('should show offered assignments section', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify offered assignments section exists
    const offeredSection = page.locator('[data-testid="offered-assignments-section"]');
    await expect(offeredSection).toBeVisible();

    // Verify offered assignments are displayed
    for (const assignmentId of testSwap.offeredAssignmentIds) {
      const assignmentCard = page.locator(
        `[data-testid="swap-detail-${testSwap.id}-assignment-${assignmentId}"]`,
      );
      await expect(assignmentCard).toBeVisible();
    }

    console.log(`✅ All ${testSwap.offeredAssignmentIds.length} offered assignments displayed`);
  });

  test('should show requested assignments section for direct swap', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify requested assignments section exists
    const requestedSection = page.locator('[data-testid="requested-assignments-section"]');
    await expect(requestedSection).toBeVisible();

    // Verify target worker name is displayed
    const targetWorkerName = page.locator('[data-testid="target-worker-name"]');
    await expect(targetWorkerName).toBeVisible();

    // Verify requested assignments are displayed
    if (testSwap.requestedAssignmentIds) {
      for (const assignmentId of testSwap.requestedAssignmentIds) {
        const assignmentCard = page.locator(
          `[data-testid="swap-detail-${testSwap.id}-assignment-${assignmentId}"]`,
        );
        await expect(assignmentCard).toBeVisible();
      }

      console.log(
        `✅ All ${testSwap.requestedAssignmentIds.length} requested assignments displayed`,
      );
    }
  });

  test('should show delete button for swap creator', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify delete button is visible
    const deleteButton = page.locator('[data-testid="delete-swap-button"]');
    await expect(deleteButton).toBeVisible();

    console.log('✅ Delete button visible for swap creator');
  });

  test('should be able to delete swap', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Count initial swap cards
    const initialSwapCards = await page.locator('[data-testid^="swap-card-"]').count();

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click delete button
    const deleteButton = page.locator('[data-testid="delete-swap-button"]');
    await deleteButton.click();

    // Wait for dialog to close
    await page.waitForSelector('[data-testid="swap-detail-dialog"]', {
      state: 'hidden',
      timeout: 10000,
    });

    console.log('✅ SwapDetailDialog closed after delete');

    // Wait for the swap list to refresh
    await page.waitForTimeout(1000);

    // Verify swap is no longer visible in SwapTab
    const deletedSwapCard = await page.locator(`[data-testid="swap-card-${testSwap.id}"]`);
    expect(deletedSwapCard).toHaveCount(0);

    console.log('✅ Deleted swap no longer visible in SwapTab');
  });

  test('should show target worker acceptance status (before acceptance)', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Status should be ACTIVE (not yet accepted by target)
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toContainText('active');

    // Should NOT show accept button (only target worker can accept)
    const acceptButton = page.locator('[data-testid="accept-direct-swap-button"]');
    await expect(acceptButton).not.toBeVisible();

    console.log('✅ Status correctly shows ACTIVE before target acceptance');
  });
});

test.describe('Direct Swap Detail - Target Worker Tests', () => {
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
    await swapTestBase.selectMySwapsTab(page);
  });

  test('should NOT show delete button for target worker', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify delete button is NOT visible for target worker
    const deleteButton = page.locator('[data-testid="delete-swap-button"]');
    await expect(deleteButton).not.toBeVisible();

    console.log('✅ Delete button correctly hidden for target worker');
  });

  test('should show accept button for target worker when swap is active', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify accept button is visible
    const acceptButton = page.locator('[data-testid="accept-direct-swap-button"]');
    await expect(acceptButton).toBeVisible();

    console.log('✅ Accept button visible for target worker');
  });

  test('should be able to accept direct swap', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click accept button
    const acceptButton = page.locator('[data-testid="accept-direct-swap-button"]');
    await acceptButton.click();

    // Wait for the accept action to complete (button might be disabled during loading)
    await page.waitForTimeout(2000);

    // Verify swap status changed to PENDING_APPROVAL via API
    const updatedSwap = await swapTestBase.getSwapById(testSwap.id);
    expect(updatedSwap.status).toBe(SwapStatus.PENDING_APPROVAL);

    console.log('✅ Direct swap accepted, status changed to PENDING_APPROVAL');
  });

  test('should show pending approval status after acceptance', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap via API
    await swapTestBase.acceptDirectSwap(testSwap.id);

    // Reload page to see updated status
    await page.reload();
    await page.waitForLoadState('networkidle');
    await swapTestBase.selectMySwapsTab(page);

    // Open swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Status should show PENDING_APPROVAL
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toContainText('pending_approval');

    // Accept button should no longer be visible
    const acceptButton = page.locator('[data-testid="accept-direct-swap-button"]');
    await expect(acceptButton).not.toBeVisible();

    console.log('✅ Status correctly shows PENDING_APPROVAL after acceptance');
  });

  test('should NOT show approve button for member even when swap is pending approval', async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap via API (changes status to PENDING_APPROVAL)
    await swapTestBase.acceptDirectSwap(testSwap.id);

    // Reload page to see updated status
    await page.reload();
    await page.waitForLoadState('networkidle');
    await swapTestBase.selectMySwapsTab(page);

    // Open swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify status is PENDING_APPROVAL
    const statusChip = page.locator('[data-testid="swap-status-chip"]');
    await expect(statusChip).toContainText('pending_approval');

    // Approve button should NOT be visible for member user
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).not.toBeVisible();

    console.log('✅ Approve button correctly hidden for member even when swap is PENDING_APPROVAL');
  });

  //   test("should NOT allow member to approve swap via API", async ({ page }) => {
  //     const swaps = swapTestBase.getTestSwaps();
  //     const testSwap = swaps[0];

  //     // First, accept the swap via API (changes status to PENDING_APPROVAL)
  //     await swapTestBase.acceptDirectSwap(testSwap.id);

  //     // Try to approve swap as member (should fail with permission error)
  //     let approvalFailed = false;
  //     try {
  //       await swapTestBase.approveSwapAsMember(testSwap.id);
  //     } catch (error: any) {
  //       approvalFailed = true;
  //       // Verify it's a permission/authorization error
  //       expect(error.message).toMatch(/permission|forbidden|unauthorized|403/i);
  //     }

  //     // Verify the approval attempt failed
  //     expect(approvalFailed).toBe(true);

  //     // Verify swap status is still PENDING_APPROVAL (not COMPLETED)
  //     const swapAfterAttempt = await swapTestBase.getSwapById(testSwap.id);
  //     expect(swapAfterAttempt.status).toBe(SwapStatus.PENDING_APPROVAL);

  //     console.log("✅ Member correctly prevented from approving swap via API");
  //   });
});

test.describe('Direct Swap Detail - Team Leader Approval Tests', () => {
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
    await swapTestBase.selectAllSwapsTab(page);
  });

  test('should NOT show approve button when swap is still active', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Open first swap (should be ACTIVE)
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Approve button should NOT be visible
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).not.toBeVisible();

    console.log('✅ Approve button correctly hidden when swap is ACTIVE');
  });

  test('should show approve button when both parties accepted (pending approval)', async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap as target worker via API
    await swapTestBase.acceptDirectSwap(testSwap.id);

    // Reload page to see updated status
    await page.reload();
    await page.waitForLoadState('networkidle');
    await swapTestBase.selectAllSwapsTab(page);

    // Open swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Approve button should now be visible
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).toBeVisible();

    console.log('✅ Approve button visible when swap is in PENDING_APPROVAL state');
  });

  test('should complete swap and update status when approved', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // First, accept the swap as target worker via API
    await swapTestBase.acceptDirectSwap(testSwap.id);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await swapTestBase.selectAllSwapsTab(page);

    // Open swap
    await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click approve button
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await approveButton.click();

    // Wait for approval to complete
    await page.waitForTimeout(2000);

    // Verify swap status changed to COMPLETED via API
    const completedSwap = await swapTestBase.getSwapById(testSwap.id);
    expect(completedSwap.status).toBe(SwapStatus.COMPLETED);

    console.log('✅ Swap status changed to COMPLETED after approval');
  });

  test('should update completedAt timestamp when swap is completed', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve via API
    await swapTestBase.acceptDirectSwap(testSwap.id);
    const completedSwap = await swapTestBase.approveSwap(testSwap.id);

    // Verify completedAt is set
    expect(completedSwap.completedAt).not.toBeNull();
    expect(completedSwap.completedAt).toBeDefined();

    // Verify it's a recent timestamp (within last minute)
    const now = dayjs.utc();
    const completedTime = completedSwap.completedAt!;
    const diffSeconds = now.diff(completedTime, 'second');
    expect(diffSeconds).toBeLessThan(60);

    console.log('✅ completedAt timestamp correctly set');
  });

  test('should set completedByUserId to team leader when approved', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve via API
    await swapTestBase.acceptDirectSwap(testSwap.id);
    const completedSwap = await swapTestBase.approveSwap(testSwap.id);

    // Verify completedByUserId is set to the team leader (TEST_USER)
    expect(completedSwap.completedByUserId).toBe(TEST_USER.user_id);

    console.log('✅ completedByUserId correctly set to team leader');
  });

  test('should populate auditData with original assignment information', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Get all test assignments and filter to swap assignments only
    const allAssignments = swapTestBase.getTestAssignments();
    const swapAssignmentIds = [
      ...testSwap.offeredAssignmentIds,
      ...(testSwap.requestedAssignmentIds || []),
    ];

    // Store original assignment data before swap
    const originalAssignments = new Map();
    for (const assignmentId of swapAssignmentIds) {
      const assignment = allAssignments.find((a) => a.id === assignmentId);
      if (assignment) {
        originalAssignments.set(assignmentId, {
          id: assignment.id,
          workerId: assignment.workerId,
          shiftId: assignment.shiftId,
          dateIso: assignment.date.format('YYYY-MM-DD'),
        });
      }
    }

    // Accept and approve via API
    await swapTestBase.acceptDirectSwap(testSwap.id);
    const completedSwap = await swapTestBase.approveSwap(testSwap.id);

    // Verify auditData is populated
    expect(completedSwap.auditData).toBeDefined();
    expect(completedSwap.auditData.length).toBeGreaterThan(0);

    // Verify auditData contains entries for all swapped assignments
    const totalAssignments = swapAssignmentIds.length;
    expect(completedSwap.auditData.length).toBe(totalAssignments);

    // Verify each audit entry matches the original assignment data
    for (const audit of completedSwap.auditData) {
      const original = originalAssignments.get(audit.assignmentId);
      expect(original).toBeDefined();
      expect(audit.assignmentId).toBe(original.id);
      expect(audit.workerId).toBe(original.workerId);
      expect(audit.shiftId).toBe(original.shiftId);
      expect(audit.dateIso).toBe(original.dateIso);
    }

    // Verify auditData contains only the offered and requested assignments
    const auditAssignmentIds = completedSwap.auditData.map((a) => a.assignmentId);
    expect(auditAssignmentIds.sort()).toEqual(swapAssignmentIds.sort());

    console.log(
      `✅ auditData populated with ${completedSwap.auditData.length} entries matching original assignment data`,
    );
  });

  test('should swap assignments correctly between workers', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];
    const workers = swapTestBase.getTestWorkers();
    const teamId = swapTestBase.getTestTeam()!.teamId;

    // Get original assignments before swap
    const originalOfferedAssignments = testSwap.offeredAssignmentIds;
    const originalRequestedAssignments = testSwap.requestedAssignmentIds || [];

    // Store original worker IDs for each assignment
    const worker1Id = workers[0].id;
    const worker2Id = workers[1].id;

    // Accept and approve swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    await swapTestBase.approveSwap(testSwap.id);

    // Fetch all assignments after swap using AssignmentApi
    const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const allAssignments = ARResult.assignmentsRead;

    // Verify offered assignments now belong to worker2
    for (const offeredAssignmentId of originalOfferedAssignments) {
      const assignment = allAssignments.find((a) => a.id === offeredAssignmentId);
      expect(assignment).toBeDefined();
      expect(assignment!.workerId).toBe(worker2Id);
    }

    // Verify requested assignments now belong to worker1
    for (const requestedAssignmentId of originalRequestedAssignments) {
      const assignment = allAssignments.find((a) => a.id === requestedAssignmentId);
      expect(assignment).toBeDefined();
      expect(assignment!.workerId).toBe(worker1Id);
    }

    console.log('✅ Assignments successfully swapped between workers');
  });

  test('should verify assignments maintain their shift and date after swap', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];
    const teamId = swapTestBase.getTestTeam()!.teamId;

    // Get original assignment details using AssignmentApi
    const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsBefore = ARResult.assignmentsRead;

    // Store original shift and date for each assignment
    const originalData = new Map();
    for (const assignmentId of [
      ...testSwap.offeredAssignmentIds,
      ...(testSwap.requestedAssignmentIds || []),
    ]) {
      const assignment = assignmentsBefore.find((a) => a.id === assignmentId);
      if (assignment) {
        originalData.set(assignmentId, {
          shiftId: assignment.shiftId,
          date: assignment.date.format('YYYY-MM-DD'),
        });
      }
    }

    // Accept and approve swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    await swapTestBase.approveSwap(testSwap.id);

    // Fetch assignments after swap using AssignmentApi
    const ARResultAfter = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsAfter = ARResultAfter.assignmentsRead;

    // Verify each assignment kept its original shift and date
    for (const [assignmentId, original] of originalData.entries()) {
      const assignmentAfter = assignmentsAfter.find((a) => a.id === assignmentId);
      expect(assignmentAfter).toBeDefined();
      expect(assignmentAfter!.shiftId).toBe(original.shiftId);
      expect(assignmentAfter!.date.format('YYYY-MM-DD')).toBe(original.date);
    }

    console.log('✅ Assignments maintained their shift and date after swap (only worker changed)');
  });

  test('should correctly swap 2 normal shifts for 1 duty shift', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();

    // Find the duty swap (second swap in the array)
    const dutySwap = swaps.find((s) => s.comment?.includes('duty swap'));

    if (!dutySwap) {
      console.log('⏭️  Duty swap not found, skipping test');
      return;
    }

    const workers = swapTestBase.getTestWorkers();
    const teamId = swapTestBase.getTestTeam()!.teamId;

    // Worker1 offered 2 normal shifts (morning + afternoon)
    expect(dutySwap.offeredAssignmentIds.length).toBe(2);

    // Worker2 offered 1 duty shift
    expect(dutySwap.requestedAssignmentIds?.length).toBe(1);

    const worker1Id = workers[0].id;
    const worker2Id = workers[1].id;

    // Accept and approve the duty swap
    await swapTestBase.acceptDirectSwap(dutySwap.id);
    await swapTestBase.approveSwap(dutySwap.id);

    // Fetch all assignments after swap using AssignmentApi
    const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const allAssignments = ARResult.assignmentsRead;

    // Verify the 2 normal shifts (morning + afternoon) now belong to worker2
    for (const offeredAssignmentId of dutySwap.offeredAssignmentIds) {
      const assignment = allAssignments.find((a: any) => a.id === offeredAssignmentId);
      expect(assignment).toBeDefined();
      expect(assignment!.workerId).toBe(worker2Id);
    }

    // Verify the 1 duty shift now belongs to worker1
    for (const requestedAssignmentId of dutySwap.requestedAssignmentIds!) {
      const assignment = allAssignments.find((a: any) => a.id === requestedAssignmentId);
      expect(assignment).toBeDefined();
      expect(assignment!.workerId).toBe(worker1Id);
    }

    // Verify audit data contains all 3 assignments (2 normal + 1 duty)
    const completedDutySwap = await swapTestBase.getSwapById(dutySwap.id);
    expect(completedDutySwap.auditData.length).toBe(3);

    console.log('✅ Duty swap completed successfully: 2 normal shifts swapped for 1 duty shift');
  });
});

test.describe('Direct Swap Detail - Reversion Tests', () => {
  const swapTestBase = new SwapTestBase();
  let completedSwapId: string;

  test.beforeAll(async () => {
    // Setup with assignments and swaps
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex + 3000, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });
  });

  test.beforeEach(async ({ page }) => {
    // Authenticate as owner (leader)
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
    await swapTestBase.selectCompletedSwapsTab(page);
  });

  test('should allow leader to revert a completed swap', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    expect(swaps.length).toBeGreaterThan(0);

    const testSwap = swaps[0];

    // Step 1: Accept the swap (as target worker)
    await swapTestBase.acceptDirectSwap(testSwap.id);

    // Step 2: Approve the swap (as leader)
    const approvedSwap = await swapTestBase.approveSwap(testSwap.id);
    expect(approvedSwap.status).toBe(SwapStatus.COMPLETED);
    completedSwapId = approvedSwap.id;

    // Step 3: Revert the swap (as leader)
    const revertedSwap = await swapTestBase.revertSwap(completedSwapId);

    // Verify swap status changed to REVERTED
    expect(revertedSwap.status).toBe(SwapStatus.REVERTED);

    console.log('✅ Swap successfully reverted');
  });

  test('should set revertedAt timestamp when swap is reverted', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    await swapTestBase.approveSwap(testSwap.id);

    // Record time before reversion
    const beforeRevert = dayjs.utc();

    // Revert the swap
    const revertedSwap = await swapTestBase.revertSwap(testSwap.id);

    // Verify revertedAt is set and reasonable
    expect(revertedSwap.revertedAt).not.toBeNull();
    expect(revertedSwap.revertedAt!.isValid()).toBe(true);

    // Check that revertedAt is after the start time and not in the future
    const afterRevert = dayjs.utc();
    expect(revertedSwap.revertedAt!.isSameOrAfter(beforeRevert.subtract(10, 'second'))).toBe(true);
    expect(revertedSwap.revertedAt!.isSameOrBefore(afterRevert.add(10, 'second'))).toBe(true);

    console.log('✅ revertedAt timestamp correctly set');
  });

  test('should set revertedByUserId to leader when reverted', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    await swapTestBase.approveSwap(testSwap.id);

    // Revert the swap
    const revertedSwap = await swapTestBase.revertSwap(testSwap.id);

    // Verify revertedByUserId is set to TEST_USER (owner/leader)
    expect(revertedSwap.revertedByUserId).toBe(TEST_USER.user_id);

    console.log('✅ revertedByUserId correctly set to leader');
  });

  test('should preserve audit data after reversion', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Accept and approve swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    const approvedSwap = await swapTestBase.approveSwap(testSwap.id);

    // Verify audit data was created during approval
    expect(approvedSwap.auditData.length).toBeGreaterThan(0);
    const originalAuditData = approvedSwap.auditData;

    // Revert the swap
    const revertedSwap = await swapTestBase.revertSwap(testSwap.id);

    // Verify audit data is preserved (not cleared)
    expect(revertedSwap.auditData.length).toBe(originalAuditData.length);
    expect(revertedSwap.auditData).toEqual(originalAuditData);

    console.log('✅ Audit data preserved after reversion');
  });

  test('should restore offered assignments to original worker after reversion', async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];
    const workers = swapTestBase.getTestWorkers();
    const creatorWorker = workers[0];

    // Get original assignments before swap
    const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsBeforeSwap = ARResult.assignmentsRead;

    // Find offered assignments and verify they belong to creator worker
    const offeredAssignmentsBefore = assignmentsBeforeSwap.filter((a) =>
      testSwap.offeredAssignmentIds.includes(a.id),
    );
    expect(offeredAssignmentsBefore.every((a) => a.workerId === creatorWorker.id)).toBe(true);

    // Accept, approve, and revert swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    await swapTestBase.approveSwap(testSwap.id);
    await swapTestBase.revertSwap(testSwap.id);

    // Get assignments after reversion
    const ARResultAfter = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsAfterRevert = ARResultAfter.assignmentsRead;

    // Verify offered assignments are back to original worker
    const offeredAssignmentsAfter = assignmentsAfterRevert.filter((a) =>
      testSwap.offeredAssignmentIds.includes(a.id),
    );

    for (const assignment of offeredAssignmentsAfter) {
      expect(assignment.workerId).toBe(creatorWorker.id);
    }

    console.log(
      `✅ All ${offeredAssignmentsBefore.length} offered assignments restored to creator`,
    );
  });

  test('should restore requested assignments to original worker after reversion', async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];
    const workers = swapTestBase.getTestWorkers();
    const targetWorker = workers[1];

    // Get original assignments before swap
    const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsBeforeSwap = ARResult.assignmentsRead;

    // Find requested assignments and verify they belong to target worker
    const requestedAssignmentsBefore = assignmentsBeforeSwap.filter(
      (a) => testSwap.requestedAssignmentIds && testSwap.requestedAssignmentIds.includes(a.id),
    );
    expect(requestedAssignmentsBefore.every((a) => a.workerId === targetWorker.id)).toBe(true);

    // Accept, approve, and revert swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    await swapTestBase.approveSwap(testSwap.id);
    await swapTestBase.revertSwap(testSwap.id);

    // Get assignments after reversion
    const ARResultAfter = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsAfterRevert = ARResultAfter.assignmentsRead;

    // Verify requested assignments are back to original worker
    const requestedAssignmentsAfter = assignmentsAfterRevert.filter(
      (a) => testSwap.requestedAssignmentIds && testSwap.requestedAssignmentIds.includes(a.id),
    );

    for (const assignment of requestedAssignmentsAfter) {
      expect(assignment.workerId).toBe(targetWorker.id);
    }

    console.log(
      `✅ All ${requestedAssignmentsBefore.length} requested assignments restored to target`,
    );
  });

  test('should maintain shift and date for assignments after reversion', async ({ page }) => {
    const swaps = swapTestBase.getTestSwaps();
    const testSwap = swaps[0];

    // Get assignments before swap
    const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsBeforeSwap = ARResult.assignmentsRead;

    // Map assignment IDs to their shift/date info
    const assignmentDetails = new Map<string, { shiftId: string; date: string }>();
    for (const assignmentId of [
      ...testSwap.offeredAssignmentIds,
      ...(testSwap.requestedAssignmentIds || []),
    ]) {
      const assignment = assignmentsBeforeSwap.find((a) => a.id === assignmentId);
      if (assignment) {
        assignmentDetails.set(assignment.id, {
          shiftId: assignment.shiftId,
          date: assignment.date.format('YYYY-MM-DD'),
        });
      }
    }

    // Accept, approve, and revert swap
    await swapTestBase.acceptDirectSwap(testSwap.id);
    await swapTestBase.approveSwap(testSwap.id);
    await swapTestBase.revertSwap(testSwap.id);

    // Get assignments after reversion
    const ARResultAfter = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsAfterRevert = ARResultAfter.assignmentsRead;

    // Verify shift and date remain unchanged
    for (const [assignmentId, originalDetails] of assignmentDetails) {
      const assignment = assignmentsAfterRevert.find((a) => a.id === assignmentId);
      expect(assignment).toBeDefined();
      expect(assignment!.shiftId).toBe(originalDetails.shiftId);
      expect(assignment!.date.format('YYYY-MM-DD')).toBe(originalDetails.date);
    }

    console.log('✅ All assignments maintained their shift and date after reversion');
  });

  test('should restore recuperation assignments when reverting DUTY shift swap', async ({
    page,
  }) => {
    const swaps = swapTestBase.getTestSwaps();
    const workers = swapTestBase.getTestWorkers();
    const shifts = swapTestBase.getTestShifts();

    // Find a swap involving a DUTY shift
    const dutyShift = shifts.find((s) => s.shiftType === ShiftType.DUTY);
    if (!dutyShift) {
      console.log('⚠️ No DUTY shift found, skipping test');
      return;
    }

    // Find the recuperation shift linked to the duty shift
    const recupShift = shifts.find(
      (s) =>
        s.shiftType === ShiftType.REST &&
        s.restType === ShiftRestType.RECUPERATION &&
        s.recuperationDutyId === dutyShift.id,
    );

    if (!recupShift) {
      console.log('⚠️ No recuperation shift found, skipping test');
      return;
    }

    // Find a swap with duty shift assignments
    let dutySwap = null;
    for (const swap of swaps) {
      const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
        true,
        dayjs.utc().subtract(2, 'month'),
        dayjs.utc().add(2, 'month'),
      );
      const assignments = ARResult.assignmentsRead;
      const hasOfferedDuty = assignments.some(
        (a) => swap.offeredAssignmentIds.includes(a.id) && a.shiftId === dutyShift.id,
      );
      const hasRequestedDuty =
        swap.requestedAssignmentIds &&
        assignments.some(
          (a) => swap.requestedAssignmentIds!.includes(a.id) && a.shiftId === dutyShift.id,
        );

      if (hasOfferedDuty || hasRequestedDuty) {
        dutySwap = swap;
        break;
      }
    }

    if (!dutySwap) {
      console.log('⚠️ No swap with DUTY shift found, skipping test');
      return;
    }

    // Get all assignments before swap (including recuperation)
    const ARResult = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsBeforeSwap = ARResult.assignmentsRead;

    // Find duty assignments and their linked recuperation assignments
    const dutyAssignments = assignmentsBeforeSwap.filter((a) => a.shiftId === dutyShift.id);
    const recupAssignments = assignmentsBeforeSwap.filter((a) => a.shiftId === recupShift.id);

    // Map duty assignments to their recuperation assignments
    const dutyToRecupMap = new Map<string, AssignmentT>();
    for (const dutyAssignment of dutyAssignments) {
      const recupAssignment = recupAssignments.find(
        (r) =>
          r.workerId === dutyAssignment.workerId &&
          r.date.isSame(dutyAssignment.date.add(1, 'day'), 'day'),
      );
      if (recupAssignment) {
        dutyToRecupMap.set(dutyAssignment.id, recupAssignment);
      }
    }

    // Accept, approve, and revert swap
    await swapTestBase.acceptDirectSwap(dutySwap.id);
    await swapTestBase.approveSwap(dutySwap.id);
    await swapTestBase.revertSwap(dutySwap.id);

    // Get assignments after reversion
    const ARResultAfter = await swapTestBase.getAssignmentsAndRecurrences(
      true,
      dayjs.utc().subtract(2, 'month'),
      dayjs.utc().add(2, 'month'),
    );
    const assignmentsAfterRevert = ARResultAfter.assignmentsRead;

    // Verify duty assignments and their recuperation assignments are restored
    for (const [dutyAssignmentId, originalRecupAssignment] of dutyToRecupMap) {
      const dutyAssignmentAfter = assignmentsAfterRevert.find((a) => a.id === dutyAssignmentId);
      const recupAssignmentAfter = assignmentsAfterRevert.find(
        (a) => a.id === originalRecupAssignment.id,
      );

      // Both should exist
      expect(dutyAssignmentAfter).toBeDefined();
      expect(recupAssignmentAfter).toBeDefined();

      // Both should have the same worker (restored)
      expect(dutyAssignmentAfter!.workerId).toBe(recupAssignmentAfter!.workerId);
    }

    console.log(
      `✅ Recuperation assignments correctly restored for ${dutyToRecupMap.size} DUTY assignments`,
    );
  });
});
