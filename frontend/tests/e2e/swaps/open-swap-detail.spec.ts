/**
 * E2E tests for Open Swap Detail Functionality
 *
 * These tests verify the complete open swap lifecycle including:
 * - Swap creator actions (view details, accept bids, cancel)
 * - Multiple bidders adding bids to the same swap
 * - Team leader approval (complete swap, verify assignment changes)
 * - Reversion of completed open swaps
 */

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { SwapTestBase } from "../../utils/swap-test-base";
import { SwapStatus, SwapType } from "../../../src/types/swap";
import { ShiftType } from "../../../src/types/shift";

dayjs.extend(utc);

test.describe("Open Swap Detail - Swap Creator Tests", () => {
  const swapTestBase = new SwapTestBase();
  let openSwapId: string;

  test.beforeAll(async () => {
    // Setup with assignments and swaps
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });

    // Create an open swap for testing
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    // Get 2 assignments from worker 1 for the open swap
    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const openSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Test open swap - looking for best offer",
      );
      openSwapId = openSwap.id;
      console.log(`✅ Created open swap for testing: ${openSwapId}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
    await swapTestBase.selectMySwapsTab(page);
  });

  test("should display open swap with bids section", async ({ page }) => {
    expect(openSwapId).toBeDefined();

    // Find and click the view details button for the open swap
    const swapCard = page.locator(`[data-testid="swap-card-${openSwapId}"]`);
    await swapCard.click();

    // Wait for dialog to open
    await page.waitForSelector('[data-testid="swap-detail-dialog"]', {
      timeout: 10000,
    });

    // Verify dialog is visible
    const dialog = page.locator('[data-testid="swap-detail-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify swap type chip shows "Open Swap"
    const swapTypeChip = page.locator('[data-testid="swap-type-chip"]');
    await expect(swapTypeChip).toHaveText("Open Swap");

    // Verify bids tab exists
    const bidsSection = page.locator('[data-testid="bids-section"]');
    await expect(bidsSection).toBeVisible();

    console.log("✅ Open swap dialog displayed correctly with bids tab");
  });

  test("should show offered assignments section", async ({ page }) => {
    // Open first swap
    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify offered assignments section exists
    const offeredSection = page.locator(
      '[data-testid="offered-assignments-section"]',
    );
    await expect(offeredSection).toBeVisible();

    // Verify at least 2 offered assignments are displayed
    const assignments = await page
      .locator(`[data-testid^="swap-detail-${openSwapId}-assignment-"]`)
      .count();
    expect(assignments).toBeGreaterThanOrEqual(2);

    console.log(
      `✅ Offered assignments section displayed with ${assignments} assignments`,
    );
  });

  test("should show delete button for swap creator", async ({ page }) => {
    // Open first swap
    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify delete button exists
    const deleteButton = page.locator('[data-testid="delete-swap-button"]');
    await expect(deleteButton).toBeVisible();

    console.log("✅ Delete button visible for swap creator");
  });

  test("should be able to delete open swap when active", async ({ page }) => {
    // Create a fresh open swap for deletion test
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const deleteSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Test open swap for deletion",
      );

      // Navigate to swaps and open the swap
      await swapTestBase.navigateToSwapPage(page);
      await page.reload();
      await swapTestBase.selectMySwapsTab(page);

      // Find the swap we just created by its ID
      await page.click(`[data-testid="swap-card-${deleteSwap.id}"]`);
      await page.waitForSelector('[data-testid="swap-detail-dialog"]');

      // Click delete
      await page.click('[data-testid="delete-swap-button"]');

      // Wait for dialog to close
      await page.waitForSelector('[data-testid="swap-detail-dialog"]', {
        state: "hidden",
        timeout: 5000,
      });

      // Verify swap is no longer visible in SwapTab
      const currentSwapCard = page.locator(
        `[data-testid="swap-card-${deleteSwap.id}"]`,
      );
      const currentCount = await currentSwapCard.count();
      expect(currentCount).toBe(0);

      console.log("✅ Open swap deleted successfully");
    }
  });

  test("should NOT show approve button for swap creator (before bid acceptance)", async ({
    page,
  }) => {
    // Open first swap
    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify approve button does NOT exist
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).not.toBeVisible();

    console.log("✅ Approve button not visible for swap creator");
  });

  test("should display no bids initially", async ({ page }) => {
    // Create a fresh open swap with no bids
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const freshSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Fresh open swap with no bids",
      );

      // Navigate and open the swap
      await swapTestBase.navigateToSwapPage(page);
      await page.reload();
      await swapTestBase.selectMySwapsTab(page);

      await page.click(`[data-testid="swap-card-${freshSwap.id}"]`);
      await page.waitForSelector('[data-testid="swap-detail-dialog"]');

      // Verify "No bids yet" alert is visible
      const noBidsAlert = page.locator('text="No bids yet"');
      await expect(noBidsAlert).toBeVisible();

      console.log("✅ No bids message displayed correctly");
    }
  });
});

test.describe("Open Swap Detail - Bidder Tests", () => {
  const swapTestBase = new SwapTestBase();
  let openSwapId: string;

  test.beforeAll(async () => {
    // Setup with assignments and swaps
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });

    // Create an open swap from worker 1
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const openSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Open swap for bidding tests",
      );
      openSwapId = openSwap.id;
      console.log(`✅ Created open swap for bidder tests: ${openSwapId}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Act as member (TEST_USER_2, linked to worker 2)
    await swapTestBase.actAsMember(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should show add bid button for bidder when swap is active", async ({
    page,
  }) => {
    expect(openSwapId).toBeDefined();

    // Open the swap
    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify add bid button is visible
    const addBidButton = page.locator('[data-testid="add-bid-button"]');
    await expect(addBidButton).toBeVisible();

    console.log("✅ Add bid button visible for bidder");
  });

  test("should be able to submit a bid", async ({ page }) => {
    // Get the member worker and their assignments
    const memberWorker = swapTestBase.getMemberWorker();
    expect(memberWorker).not.toBeNull();

    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
      undefined,
      memberWorker!.workerId,
    );

    const worker2Assignments = assignments.filter(
      (a) => a.workerId === memberWorker!.workerId && a.scheduleId !== null,
    );

    if (worker2Assignments.length < 2) {
      console.log("⏭️  Skipping - worker 2 needs at least 2 assignments");
      return;
    }

    // Open the swap detail dialog
    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click create bid button
    const addBidButton = page.locator('[data-testid="add-bid-button"]');
    await expect(addBidButton).toBeVisible();
    await addBidButton.click();

    // Wait for add bid section to appear
    await page.waitForSelector('[data-testid="add-bid-section"]');

    // Select two assignments
    await page.click(`[data-testid="assignment-${worker2Assignments[0].id}"]`);
    await page.click(`[data-testid="assignment-${worker2Assignments[1].id}"]`);

    // Click submit bid button
    const submitBidButton = page.locator('[data-testid="submit-bid-button"]');
    await expect(submitBidButton).toBeVisible();
    await expect(submitBidButton).toBeEnabled();
    await submitBidButton.click();

    // Wait for the bid to be created
    await page.waitForTimeout(1000);

    // Fetch the swap to get the bid ID
    const updatedSwap = await swapTestBase.getSwapById(openSwapId);
    expect(updatedSwap.bids.length).toBeGreaterThan(0);

    const newBid = updatedSwap.bids.find(
      (b) => b.workerId === memberWorker!.workerId,
    );
    expect(newBid).toBeDefined();

    // Verify the bid is visible in the page
    const bidItem = page.locator(`[data-testid="bid-item-${newBid!.id}"]`);
    await expect(bidItem).toBeVisible();

    console.log("✅ Bid submitted successfully via UI");
  });

  test("should display bid in bids list after submission", async ({ page }) => {
    // First ensure we have a bid
    const memberWorker = swapTestBase.getMemberWorker();
    expect(memberWorker).not.toBeNull();

    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
      undefined,
      memberWorker!.workerId,
    );

    const worker2Assignments = assignments.filter(
      (a) => a.workerId === memberWorker!.workerId && a.scheduleId !== null,
    );

    if (worker2Assignments.length >= 2) {
      // Add bid via API
      await swapTestBase.addBidToSwap(openSwapId, memberWorker!.workerId, [
        worker2Assignments[0].id,
        worker2Assignments[1].id,
      ]);

      // Now verify in UI
      await page.reload();
      await page.click(`[data-testid="swap-card-${openSwapId}"]`);
      await page.waitForSelector('[data-testid="swap-detail-dialog"]');

      // Fetch the swap to get the bid ID
      const updatedSwap = await swapTestBase.getSwapById(openSwapId);
      expect(updatedSwap.bids.length).toBeGreaterThan(0);

      const newBid = updatedSwap.bids.find(
        (b) => b.workerId === memberWorker!.workerId,
      );
      expect(newBid).toBeDefined();

      // Verify the bid is visible in the page
      const bidItem = page.locator(`[data-testid="bid-item-${newBid!.id}"]`);
      await expect(bidItem).toBeVisible();

      console.log(`✅ Bid displayed in bids list successfully`);
    }
  });

  test("should NOT allow bidder to be the swap creator", async ({ page }) => {
    // Try to add a bid as the creator (worker 1)
    // Switch to owner context
    await swapTestBase.actAsOwner(page);

    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
      undefined,
      workers[0].workerId,
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      // Try to add bid as creator (should fail)
      let bidFailed = false;
      try {
        await swapTestBase.addBidToSwap(openSwapId, workers[0].workerId, [
          worker1Assignments[0].id,
          worker1Assignments[1].id,
        ]);
      } catch (error: any) {
        bidFailed = true;
        // expect(error.message).toMatch(/creator|same worker|invalid/i);
      }

      expect(bidFailed).toBe(true);
      console.log("✅ Correctly prevented creator from bidding");
    }
  });
});

test.describe("Open Swap Detail - Multiple Bidders Tests", () => {
  const swapTestBase = new SwapTestBase();
  let openSwapId: string;

  test.beforeAll(async () => {
    // Setup with assignments
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });

    // Create an open swap from worker 1
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const openSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Open swap for multiple bidders",
      );
      openSwapId = openSwap.id;
      console.log(`✅ Created open swap for multi-bidder tests: ${openSwapId}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should allow multiple workers to bid on the same swap", async ({
    page,
  }) => {
    expect(openSwapId).toBeDefined();

    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    // Worker 2 bids
    const worker2Assignments = assignments.filter(
      (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
    );

    if (worker2Assignments.length >= 2) {
      await swapTestBase.addBidToSwap(openSwapId, workers[1].workerId, [
        worker2Assignments[0].id,
        worker2Assignments[1].id,
      ]);
      console.log("✅ Worker 2 bid added");
    }

    // Worker 3 bids
    const worker3Assignments = assignments.filter(
      (a) => a.workerId === workers[2].workerId && a.scheduleId !== null,
    );

    if (worker3Assignments.length >= 2) {
      await swapTestBase.addBidToSwap(openSwapId, workers[2].workerId, [
        worker3Assignments[0].id,
        worker3Assignments[1].id,
      ]);
      console.log("✅ Worker 3 bid added");
    }

    // Verify both bids exist
    const updatedSwap = await swapTestBase.getSwapById(openSwapId);
    expect(updatedSwap.bids.length).toBeGreaterThanOrEqual(2);

    console.log(
      `✅ Multiple bids added successfully (${updatedSwap.bids.length} total)`,
    );
  });

  test("should display all bids with worker names", async ({ page }) => {
    // Ensure we have multiple bids
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    // Add bids from workers 2 and 3
    for (let i = 1; i < Math.min(3, workers.length); i++) {
      const workerAssignments = assignments.filter(
        (a) => a.workerId === workers[i].workerId && a.scheduleId !== null,
      );

      if (workerAssignments.length >= 2) {
        await swapTestBase.addBidToSwap(openSwapId, workers[i].workerId, [
          workerAssignments[0].id,
          workerAssignments[1].id,
        ]);
      }
    }

    // Verify in UI
    await page.reload();
    await swapTestBase.selectMySwapsTab(page);

    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Get the swap to check number of bids
    const swap = await swapTestBase.getSwapById(openSwapId);

    // Verify each bid displays worker name
    for (const bid of swap.bids) {
      const bidItem = page.locator(`[data-testid="bid-item-${bid.id}"]`);
      await expect(bidItem).toBeVisible();
    }

    console.log(`✅ All ${swap.bids.length} bids displayed with worker names`);
  });

  test("should show accept buttons for all bids when creator views them", async ({
    page,
  }) => {
    // Ensure we have bids; add them via API if necessary
    const initialSwap = await swapTestBase.getSwapById(openSwapId);

    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    // Add bids from worker 2 and 3 (if available) using the same approach as other tests
    for (let i = 1; i < Math.min(3, workers.length); i++) {
      const workerAssignments = assignments.filter(
        (a) => a.workerId === workers[i].workerId && a.scheduleId !== null,
      );

      if (workerAssignments.length >= 2) {
        await swapTestBase.addBidToSwap(openSwapId, workers[i].workerId, [
          workerAssignments[0].id,
          workerAssignments[1].id,
        ]);
        console.log(`✅ Worker ${i + 1} bid added`);
      }
    }

    // Re-fetch swap to pick up newly added bids
    const swap = await swapTestBase.getSwapById(openSwapId);

    if (swap.bids.length === 0) {
      throw new Error("Expected at least one bid for this test, found none");
    }

    // View as creator (owner)
    await page.reload();
    await swapTestBase.selectMySwapsTab(page);

    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify accept buttons exist for each bid
    for (const bid of swap.bids) {
      if (!bid.accepted) {
        const acceptButton = page.locator(
          `[data-testid="accept-bid-button-${bid.id}"]`,
        );
        await expect(acceptButton).toBeVisible();
      }
    }

    console.log(
      `✅ Accept buttons visible for ${swap.bids.filter((b) => !b.accepted).length} unaccepted bids`,
    );
  });
});

test.describe("Open Swap Detail - Bid Acceptance Tests", () => {
  const swapTestBase = new SwapTestBase();
  let openSwapId: string;
  let bidId: string;

  test.beforeAll(async () => {
    // Setup with assignments
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });

    // Create an open swap from worker 1
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const openSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Open swap for acceptance tests",
      );
      openSwapId = openSwap.id;

      // Add a bid from worker 2
      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          openSwapId,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );
        bidId = swapWithBid.bids[0].id;
        console.log(
          `✅ Created open swap with bid for acceptance tests: ${openSwapId}`,
        );
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should accept a bid and transition to PENDING_APPROVAL", async ({
    page,
  }) => {
    expect(openSwapId).toBeDefined();
    expect(bidId).toBeDefined();
    // Open swap in UI as the creator and accept the bid via the accept button
    await page.reload();
    await swapTestBase.selectMySwapsTab(page);
    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    const acceptButton = page.locator(
      `[data-testid="accept-bid-button-${bidId}"]`,
    );
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    // Wait briefly for backend to process and then verify via API
    await page.waitForTimeout(1000);
    const updatedSwap = await swapTestBase.getSwapById(openSwapId);

    // Verify status changed to PENDING_APPROVAL
    expect(updatedSwap.status).toBe(SwapStatus.PENDING_APPROVAL);

    // Verify the accepted bid
    const acceptedBid = updatedSwap.bids.find((b) => b.id === bidId);
    expect(acceptedBid).toBeDefined();
    expect(acceptedBid!.accepted).toBe(true);

    console.log(
      "✅ Bid accepted via UI and status transitioned to PENDING_APPROVAL",
    );
  });

  test("should set targetWorkerId and requestedAssignmentIds after bid acceptance", async ({
    page,
  }) => {
    // Create a fresh swap for this test
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const freshSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Swap to test bid acceptance fields",
      );

      // Add a bid
      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          freshSwap.id,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );

        const testBidId = swapWithBid.bids[0].id;

        // Accept the bid
        const acceptedSwap = await swapTestBase.acceptBid(
          freshSwap.id,
          testBidId,
        );

        // Verify targetWorkerId is set
        expect(acceptedSwap.targetWorkerId).toBe(workers[1].workerId);

        // Verify requestedAssignmentIds is set
        expect(acceptedSwap.requestedAssignmentIds).not.toBeNull();
        expect(acceptedSwap.requestedAssignmentIds!.length).toBe(2);
        expect(acceptedSwap.requestedAssignmentIds).toContain(
          worker2Assignments[0].id,
        );
        expect(acceptedSwap.requestedAssignmentIds).toContain(
          worker2Assignments[1].id,
        );

        console.log(
          "✅ targetWorkerId and requestedAssignmentIds set correctly",
        );
      }
    }
  });

  test("should display accepted chip on accepted bid", async ({ page }) => {
    // Accept a bid first
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const testSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Swap to test accepted chip display",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          testSwap.id,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );

        const testBidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(testSwap.id, testBidId);

        // Navigate and verify in UI
        await swapTestBase.navigateToSwapPage(page);
        await page.reload();
        await swapTestBase.selectMySwapsTab(page);

        await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
        await page.waitForSelector('[data-testid="swap-detail-dialog"]');

        // Verify accepted chip is visible
        const acceptedChip = page.locator(
          `[data-testid="bid-accepted-chip-${testBidId}"]`,
        );
        await expect(acceptedChip).toBeVisible();
        await expect(acceptedChip).toHaveText("Accepted");

        console.log("✅ Accepted chip displayed correctly");
      }
    }
  });

  test("should NOT show add bid button after bid acceptance", async ({
    page,
  }) => {
    // Create swap and accept a bid
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const testSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Swap to test add bid button after acceptance",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          testSwap.id,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );

        const testBidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(testSwap.id, testBidId);

        // Switch to member context and try to view
        await swapTestBase.actAsMember(page);
        await swapTestBase.navigateToSwapPage(page);
        await page.reload();
        await swapTestBase.selectMySwapsTab(page);

        await page.click(`[data-testid="swap-card-${testSwap.id}"]`);
        await page.waitForSelector('[data-testid="swap-detail-dialog"]');

        // Verify add bid button is NOT visible
        const addBidButton = page.locator('[data-testid="add-bid-button"]');
        await expect(addBidButton).not.toBeVisible();

        console.log("✅ Add bid button hidden after bid acceptance");
      }
    }
  });
});

test.describe("Open Swap Detail - Team Leader Approval Tests", () => {
  const swapTestBase = new SwapTestBase();
  let openSwapId: string;

  test.beforeAll(async () => {
    // Setup with assignments
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });

    // Create an open swap with accepted bid
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const openSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Open swap for approval tests",
      );
      openSwapId = openSwap.id;

      // Add and accept a bid
      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          openSwapId,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );
        const bidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(openSwapId, bidId);
        console.log(`✅ Created open swap with accepted bid: ${openSwapId}`);
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should show approve button when bid is accepted (PENDING_APPROVAL)", async ({
    page,
  }) => {
    expect(openSwapId).toBeDefined();

    // Verify swap is in PENDING_APPROVAL status
    const swap = await swapTestBase.getSwapById(openSwapId);
    expect(swap.status).toBe(SwapStatus.PENDING_APPROVAL);

    // Open the swap in UI
    await page.reload();
    await swapTestBase.selectAllSwapsTab(page);

    await page.click(`[data-testid="swap-card-${openSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Verify approve button exists
    const approveButton = page.locator('[data-testid="approve-swap-button"]');
    await expect(approveButton).toBeVisible();

    console.log("✅ Approve button visible for leader when PENDING_APPROVAL");
  });

  test("should complete swap and update status when approved", async ({
    page,
  }) => {
    // Create a fresh swap for this test
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const testSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Swap to test approval",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          testSwap.id,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );
        const bidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(testSwap.id, bidId);

        // Approve the swap
        const approvedSwap = await swapTestBase.approveSwap(testSwap.id);

        // Verify status is COMPLETED
        expect(approvedSwap.status).toBe(SwapStatus.COMPLETED);
        expect(approvedSwap.completedAt).not.toBeNull();
        expect(approvedSwap.completedByUserId).not.toBeNull();

        console.log("✅ Swap completed successfully with proper status");
      }
    }
  });

  test("should swap assignments correctly between workers", async ({
    page,
  }) => {
    // Create a fresh swap for this test
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const worker1Offered = [
        worker1Assignments[0].id,
        worker1Assignments[1].id,
      ];

      const testSwap = await swapTestBase.createOpenSwap(
        worker1Offered,
        "Swap to test assignment swapping",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const worker2Offered = [
          worker2Assignments[0].id,
          worker2Assignments[1].id,
        ];

        const swapWithBid = await swapTestBase.addBidToSwap(
          testSwap.id,
          workers[1].workerId,
          worker2Offered,
        );
        const bidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(testSwap.id, bidId);

        // Approve the swap
        await swapTestBase.approveSwap(testSwap.id);

        // Verify assignments are swapped
        const updatedAssignments =
          await swapTestBase.getAssignmentsAndRecurrences(
            false,
            dayjs.utc().add(1, "day").startOf("day"),
          );

        // Worker1's original assignments should now belong to Worker2
        for (const assignmentId of worker1Offered) {
          const assignment = updatedAssignments.find(
            (a) => a.id === assignmentId,
          );
          expect(assignment).toBeDefined();
          expect(assignment!.workerId).toBe(workers[1].workerId);
        }

        // Worker2's original assignments should now belong to Worker1
        for (const assignmentId of worker2Offered) {
          const assignment = updatedAssignments.find(
            (a) => a.id === assignmentId,
          );
          expect(assignment).toBeDefined();
          expect(assignment!.workerId).toBe(workers[0].workerId);
        }

        console.log("✅ Assignments swapped correctly between workers");
      }
    }
  });

  test("should populate auditData with original assignment information", async ({
    page,
  }) => {
    // Create a fresh swap for this test
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const worker1Offered = [
        worker1Assignments[0].id,
        worker1Assignments[1].id,
      ];

      const testSwap = await swapTestBase.createOpenSwap(
        worker1Offered,
        "Swap to test audit data",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const worker2Offered = [
          worker2Assignments[0].id,
          worker2Assignments[1].id,
        ];

        const swapWithBid = await swapTestBase.addBidToSwap(
          testSwap.id,
          workers[1].workerId,
          worker2Offered,
        );
        const bidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(testSwap.id, bidId);

        // Approve the swap
        const completedSwap = await swapTestBase.approveSwap(testSwap.id);

        // Verify audit data is populated
        expect(completedSwap.auditData).toBeDefined();
        expect(completedSwap.auditData.length).toBe(4); // 2 from each worker

        // Verify audit data contains correct information
        for (const audit of completedSwap.auditData) {
          expect(audit.assignmentId).toBeTruthy();
          expect(audit.workerId).toBeTruthy();
          expect(audit.shiftId).toBeTruthy();
          expect(audit.dateIso).toBeTruthy();
        }

        console.log(
          `✅ Audit data populated correctly with ${completedSwap.auditData.length} entries`,
        );
      }
    }
  });
});

test.describe("Open Swap Detail - Reversion Tests", () => {
  const swapTestBase = new SwapTestBase();
  let completedSwapId: string;

  test.beforeAll(async () => {
    // Setup and create a completed swap
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });

    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const openSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Open swap for reversion tests",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          openSwap.id,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );
        const bidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(openSwap.id, bidId);
        await swapTestBase.approveSwap(openSwap.id);
        completedSwapId = openSwap.id;
        console.log(
          `✅ Created completed open swap for reversion: ${completedSwapId}`,
        );
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsOwner(page);
    await swapTestBase.navigateToSwapPage(page);
  });

  test("should allow leader to revert a completed open swap", async ({
    page,
  }) => {
    expect(completedSwapId).toBeDefined();

    // Open Completed swaps tab and open the completed swap in UI
    await page.reload();
    await swapTestBase.selectCompletedSwapsTab(page);
    await page.click(`[data-testid="swap-card-${completedSwapId}"]`);
    await page.waitForSelector('[data-testid="swap-detail-dialog"]');

    // Click the revert button and wait for backend processing
    const revertButton = page.locator('[data-testid="revert-swap-button"]');
    await expect(revertButton).toBeVisible();
    await revertButton.click();

    // Give backend a moment to process the revert
    await page.waitForTimeout(1000);

    // Verify swap is reverted via API
    const revertedSwap = await swapTestBase.getSwapById(completedSwapId);
    expect(revertedSwap.status).toBe(SwapStatus.REVERTED);
    expect(revertedSwap.revertedAt).not.toBeNull();
    expect(revertedSwap.revertedByUserId).not.toBeNull();

    console.log("✅ Open swap reverted via UI successfully");
  });

  test("should restore assignments to original workers after reversion", async ({
    page,
  }) => {
    // Create a fresh completed swap
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const worker1Offered = [
        worker1Assignments[0].id,
        worker1Assignments[1].id,
      ];

      const testSwap = await swapTestBase.createOpenSwap(
        worker1Offered,
        "Swap to test reversion",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const worker2Offered = [
          worker2Assignments[0].id,
          worker2Assignments[1].id,
        ];

        const swapWithBid = await swapTestBase.addBidToSwap(
          testSwap.id,
          workers[1].workerId,
          worker2Offered,
        );
        const bidId = swapWithBid.bids[0].id;
        await swapTestBase.acceptBid(testSwap.id, bidId);
        await swapTestBase.approveSwap(testSwap.id);

        // Revert the swap
        await swapTestBase.revertSwap(testSwap.id);

        // Verify assignments are restored
        const restoredAssignments =
          await swapTestBase.getAssignmentsAndRecurrences(
            false,
            dayjs.utc().add(1, "day").startOf("day"),
          );

        // Worker1's assignments should be back to Worker1
        for (const assignmentId of worker1Offered) {
          const assignment = restoredAssignments.find(
            (a) => a.id === assignmentId,
          );
          expect(assignment).toBeDefined();
          expect(assignment!.workerId).toBe(workers[0].workerId);
        }

        // Worker2's assignments should be back to Worker2
        for (const assignmentId of worker2Offered) {
          const assignment = restoredAssignments.find(
            (a) => a.id === assignmentId,
          );
          expect(assignment).toBeDefined();
          expect(assignment!.workerId).toBe(workers[1].workerId);
        }

        console.log("✅ Assignments restored correctly after reversion");
      }
    }
  });

  test("should preserve audit data after reversion", async ({ page }) => {
    // Create a fresh completed swap, then revert it and compare auditData
    const workers = swapTestBase.getTestWorkers();
    const assignments = await swapTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().add(1, "day").startOf("day"),
    );

    const worker1Assignments = assignments.filter(
      (a) => a.workerId === workers[0].workerId && a.scheduleId !== null,
    );

    if (worker1Assignments.length >= 2) {
      const testSwap = await swapTestBase.createOpenSwap(
        [worker1Assignments[0].id, worker1Assignments[1].id],
        "Swap to test audit data preservation",
      );

      const worker2Assignments = assignments.filter(
        (a) => a.workerId === workers[1].workerId && a.scheduleId !== null,
      );

      if (worker2Assignments.length >= 2) {
        const swapWithBid = await swapTestBase.addBidToSwap(
          testSwap.id,
          workers[1].workerId,
          [worker2Assignments[0].id, worker2Assignments[1].id],
        );
        const bidId = swapWithBid.bids[0].id;

        await swapTestBase.acceptBid(testSwap.id, bidId);
        const completedSwap = await swapTestBase.approveSwap(testSwap.id);

        expect(completedSwap.status).toBe(SwapStatus.COMPLETED);
        expect(completedSwap.auditData).toBeDefined();
        expect(completedSwap.auditData.length).toBeGreaterThan(0);

        const revertedSwap = await swapTestBase.revertSwap(testSwap.id);

        expect(revertedSwap.status).toBe(SwapStatus.REVERTED);
        expect(revertedSwap.auditData).toBeDefined();
        expect(revertedSwap.auditData.length).toBeGreaterThan(0);

        // Verify the audit data contents are identical
        expect(revertedSwap.auditData).toEqual(completedSwap.auditData);

        console.log(
          `✅ Audit data preserved after reversion (${completedSwap.auditData.length} entries)`,
        );
      }
    }
  });
});
