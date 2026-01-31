/**
 * E2E tests for CreateSwapDialog Component
 *
 * These tests verify the swap creation dialog functionality including:
 * - Worker selection (owner vs member)
 * - Assignment visibility based on schedule association
 * - Date filtering (only future assignments)
 * - Role-based access differences
 */

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { SwapTestBase } from "../../utils/swap-test-base";
import { ScheduleStatus } from "@/types/schedule";
import { LinkShiftT } from "@/types/shift";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

test.describe("CreateSwapDialog - Owner Tests", () => {
  const swapTestBase = new SwapTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and schedules
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

    // Open the create swap dialog
    await page.click('[data-testid="create-swap-button"]');

    // Wait for the dialog to open
    await page.waitForSelector('[data-testid="create-swap-dialog"]', {
      timeout: 10000,
    });
  });

  test.describe("Worker Selection", () => {
    test("should display worker selection dropdown for team leaders", async ({
      page,
    }) => {
      // Verify worker selection dropdown is visible
      const workerSelect = page.locator('label:has-text("Select Worker")');
      await expect(workerSelect).toBeVisible();

      console.log("✅ Worker selection dropdown visible for team leader");
    });

    test("should list all workers in the dropdown", async ({ page }) => {
      // Click on the worker selection dropdown
      await page.click('[data-testid="worker-select"]');

      // Wait for the MUI menu to open
      await page.waitForSelector('[role="listbox"]', { state: "visible" });

      // Get all workers from test data
      const testWorkers = swapTestBase.getTestWorkers();
      expect(testWorkers.length).toBeGreaterThan(0);

      // Verify each worker appears in the dropdown
      for (const worker of testWorkers) {
        const workerOption = page.locator(
          `[data-testid="worker-option-${worker.workerId}"]`,
        );
        await expect(workerOption).toBeVisible();
      }

      console.log(`✅ All ${testWorkers.length} workers listed in dropdown`);
    });

    test("should show assignments only after selecting a worker", async ({
      page,
    }) => {
      // Initially, no assignment selector should be visible
      const assignmentSelectorBefore = page.locator(
        '[data-testid="assignment-selector"]',
      );
      await expect(assignmentSelectorBefore).not.toBeVisible();

      // Select first worker
      await page.click('[data-testid="worker-select"]');

      // Wait for the MUI menu to open
      await page.waitForSelector('[role="listbox"]', { state: "visible" });

      const testWorkers = swapTestBase.getTestWorkers();
      await page.click(
        `[data-testid="worker-option-${testWorkers[0].workerId}"]`,
      );

      // Now assignment selector should be visible
      const assignmentSelectorAfter = page.locator(
        '[data-testid="assignment-selector"]',
      );
      await expect(assignmentSelectorAfter).toBeVisible();

      console.log("✅ Assignments appear after worker selection");
    });
  });

  test.describe("Assignment Visibility and Filtering", () => {
    test("should show assignments not associated with any schedule", async ({
      page,
    }) => {
      // Select first worker
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);

      // Wait for assignments to load
      await page.waitForTimeout(1000);

      // Get assignments not associated with schedule
      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const noScheduleAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter((a) => a.scheduleId === null); // No schedule
      expect(noScheduleAssignments.length).toBeGreaterThan(0);

      // Verify these assignments are visible
      for (const assignment of noScheduleAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).toBeVisible();
      }

      console.log(
        `✅ ${noScheduleAssignments.length} assignments without schedule visible`,
      );
    });

    test("should show assignments associated with validated schedule", async ({
      page,
    }) => {
      // Select first worker
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);

      // Wait for assignments to load
      await page.waitForTimeout(1000);

      const testSchedules = swapTestBase.getTestSchedules();
      const validatedScheduleIds = testSchedules
        .filter((s) => s.status === ScheduleStatus.VALIDATED)
        .map((s) => s.id);
      expect(validatedScheduleIds.length).toBeGreaterThan(0);

      // Get assignments associated with validated schedule
      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const validatedAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter(
          (a) =>
            a.scheduleId !== null &&
            validatedScheduleIds.includes(a.scheduleId),
        ); // Validated schedule
      expect(validatedAssignments.length).toBeGreaterThan(0);

      // Verify these assignments are visible
      for (const assignment of validatedAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).toBeVisible();
      }

      console.log(
        `✅ ${validatedAssignments.length} validated schedule assignments visible`,
      );
    });

    test("should NOT show assignments associated with campaign schedule", async ({
      page,
    }) => {
      // Select first worker
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);

      // Wait for assignments to load
      await page.waitForTimeout(1000);

      const testSchedules = swapTestBase.getTestSchedules();
      const campaignScheduleIds = testSchedules
        .filter((s) => s.status === ScheduleStatus.CAMPAIGN)
        .map((s) => s.id);
      expect(campaignScheduleIds.length).toBeGreaterThan(0);

      // Get assignments associated with campaign schedule
      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const campaignAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter(
          (a) =>
            a.scheduleId !== null && campaignScheduleIds.includes(a.scheduleId),
        ); // Campaign schedule
      expect(campaignAssignments.length).toBeGreaterThan(0);

      // Verify these assignments are NOT visible
      for (const assignment of campaignAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).not.toBeVisible();
      }

      console.log(
        `✅ ${campaignAssignments.length} campaign schedule assignments correctly hidden`,
      );
    });

    test("should only show assignments from tomorrow onward", async ({
      page,
    }) => {
      // Select first worker
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);

      // Wait for assignments to load
      await page.waitForTimeout(1000);

      // Get today's assignments (should not be visible)
      const todayAssignments = swapTestBase
        .getTestAssignments()
        .filter(
          (a) =>
            a.workerId === testWorkerId &&
            dayjs.utc(a.date).isSameOrBefore(dayjs.utc(), "day"),
        );
      expect(todayAssignments.length).toBeGreaterThan(0);

      // Verify today's assignments are NOT visible
      for (const assignment of todayAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).not.toBeVisible();
      }

      // Get future assignments (should be visible)
      const futureAssignments = swapTestBase
        .getTestAssignments()
        .filter(
          (a) =>
            a.workerId === testWorkerId &&
            dayjs.utc(a.date).isAfter(dayjs.utc(), "day"),
        );
      expect(futureAssignments.length).toBeGreaterThan(0);

      // Verify future assignments ARE visible
      for (const assignment of futureAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).toBeVisible();
      }

      console.log(
        `✅ Only future assignments visible (${futureAssignments.length} shown, ${todayAssignments.length} hidden)`,
      );
    });

    test("should filter assignments when switching workers", async ({
      page,
    }) => {
      const testWorkers = swapTestBase.getTestWorkers();
      if (testWorkers.length < 2) {
        test.skip(true, "Need at least 2 workers for this test");
      }
      const testWorkerId1 = testWorkers[0].workerId;
      const testWorkerId2 = testWorkers[1].workerId;

      // Select first worker
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId1}"]`);
      await page.waitForTimeout(1000);

      // Count assignments for first worker
      const testSchedules = swapTestBase.getTestSchedules();
      const campaignScheduleIds = testSchedules
        .filter((s) => s.status === ScheduleStatus.CAMPAIGN)
        .map((s) => s.id);
      expect(campaignScheduleIds.length).toBeGreaterThan(0);

      // Get assignments associated with campaign schedule
      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const firstWorkerAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId1)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter(
          (a) =>
            a.scheduleId === null ||
            (a.scheduleId !== null &&
              !campaignScheduleIds.includes(a.scheduleId)),
        ); // Not campaign schedule
      expect(firstWorkerAssignments.length).toBeGreaterThan(0);

      for (const assignment of firstWorkerAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).toBeVisible();
      }

      // Switch to second worker
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId2}"]`);
      await page.waitForTimeout(1000);

      // Count assignments for second worker
      const secondWorkerAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId2)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter(
          (a) =>
            a.scheduleId === null ||
            (a.scheduleId !== null &&
              !campaignScheduleIds.includes(a.scheduleId)),
        ); // Not campaign schedule
      expect(secondWorkerAssignments.length).toBeGreaterThan(0);

      for (const assignment of secondWorkerAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).toBeVisible();
      }

      // Assignments should be different (unless workers have same assignments)
      console.log(
        `✅ Worker switching works: Worker 1 has ${firstWorkerAssignments} assignments, Worker 2 has ${secondWorkerAssignments} assignments`,
      );
    });
  });

  /**
   * Helper method to find linked shift assignments for a worker
   * Returns assignments for two linked shifts on the same day, or null if not found
   */
  const findLinkedShiftAssignments = (
    testLinkShifts: LinkShiftT[],
    testAssignments: any[],
    workerId: string,
  ): { linkShift: LinkShiftT; assignments: any[] } | null => {
    const tomorrow = dayjs.utc().add(1, "day").startOf("day");

    // Try each link shift configuration
    for (const linkShift of testLinkShifts) {
      if (linkShift.shiftIds.length !== 2) continue;

      // Find assignments for this worker with shifts from this link
      const linkedShiftAssignments = testAssignments
        .filter((a) => a.workerId === workerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter((a) => linkShift.shiftIds.includes(a.shiftId));

      // Group assignments by date
      const assignmentsByDate: {
        [key: string]: typeof linkedShiftAssignments;
      } = {};
      linkedShiftAssignments.forEach((a) => {
        const dateKey = dayjs.utc(a.date).format("YYYY-MM-DD");
        if (!assignmentsByDate[dateKey]) {
          assignmentsByDate[dateKey] = [];
        }
        assignmentsByDate[dateKey].push(a);
      });

      // Find a date with both linked shifts assigned
      const dateWithBothShifts = Object.entries(assignmentsByDate).find(
        ([_, assignments]) => {
          const shiftIds = new Set(assignments.map((a) => a.shiftId));
          return linkShift.shiftIds.every((sid: string) => shiftIds.has(sid));
        },
      );

      if (dateWithBothShifts) {
        return {
          linkShift,
          assignments: dateWithBothShifts[1],
        };
      }
    }

    return null;
  };

  test.describe("Linked Shift Suggestions", () => {
    test("should show linked shift suggestion when selecting one shift from a linked pair", async ({
      page,
    }) => {
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      const testShifts = swapTestBase.getTestShifts();
      const testLinkShifts = swapTestBase.getTestLinkShifts();

      // Find linked shift assignments using helper method
      const result = findLinkedShiftAssignments(
        testLinkShifts,
        swapTestBase.getTestAssignments(),
        testWorkerId,
      );

      if (!result) {
        test.skip(
          true,
          "Need assignments with both linked shifts on same date",
        );
      }

      const { linkShift, assignments: assignmentsOnDate } = result!;

      // Select first worker
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);
      await page.waitForTimeout(1000);
      let linkedShiftSuggestion = page.locator(
        '[data-testid="linked-shift-suggestion"]',
      );
      await expect(linkedShiftSuggestion).not.toBeVisible();

      // Select the first linked shift assignment
      const firstAssignment = assignmentsOnDate[0];
      await page.click(`[data-testid="assignment-${firstAssignment.id}"]`);
      await page.waitForTimeout(500);

      // Now the linked shift suggestion should appear
      linkedShiftSuggestion = page.locator(
        '[data-testid="linked-shift-suggestion"]',
      );
      await expect(linkedShiftSuggestion).toBeVisible();

      // Verify the suggestion mentions the linked shift
      const suggestionText = await linkedShiftSuggestion.textContent();
      expect(suggestionText).toContain("Linked shift assignments available");
      expect(suggestionText).toContain("linked shift assignment");

      // Find the other linked shift name
      const otherShiftId = linkShift.shiftIds.find(
        (sid: string) => sid !== firstAssignment.shiftId,
      );
      const otherShift = testShifts.find((s) => s.id === otherShiftId);
      expect(otherShift).toBeDefined();
      expect(suggestionText).toContain(otherShift!.name);

      console.log(
        "✅ Linked shift suggestion appears when selecting one shift from linked pair",
      );
    });

    test("should add all linked shifts when clicking 'Add All' button", async ({
      page,
    }) => {
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      const testLinkShifts = swapTestBase.getTestLinkShifts();

      expect(testLinkShifts.length).toBeGreaterThan(0);
      const linkShift = testLinkShifts[0];

      // Select first worker
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);
      await page.waitForTimeout(1000);

      // Find assignments with both linked shifts on same date
      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const linkedShiftAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter((a) => linkShift.shiftIds.includes(a.shiftId));

      const assignmentsByDate: {
        [key: string]: typeof linkedShiftAssignments;
      } = {};
      linkedShiftAssignments.forEach((a) => {
        const dateKey = dayjs.utc(a.date).format("YYYY-MM-DD");
        if (!assignmentsByDate[dateKey]) {
          assignmentsByDate[dateKey] = [];
        }
        assignmentsByDate[dateKey].push(a);
      });

      const dateWithBothShifts = Object.entries(assignmentsByDate).find(
        ([_, assignments]) => {
          const shiftIds = new Set(assignments.map((a) => a.shiftId));
          return linkShift.shiftIds.every((sid: string) => shiftIds.has(sid));
        },
      );

      if (!dateWithBothShifts) {
        test.skip(
          true,
          "Need assignments with both linked shifts on same date",
        );
      }

      const [dateKey, assignmentsOnDate] = dateWithBothShifts!;

      // Select the first linked shift assignment
      const firstAssignment = assignmentsOnDate[0];
      await page.click(`[data-testid="assignment-${firstAssignment.id}"]`);
      await page.waitForTimeout(500);

      // Verify suggestion appears
      const linkedShiftSuggestion = page.locator(
        '[data-testid="linked-shift-suggestion"]',
      );
      await expect(linkedShiftSuggestion).toBeVisible();

      // Click the "Add All" button
      const addAllButton = page.locator(
        '[data-testid="add-all-linked-shifts"]',
      );
      await expect(addAllButton).toBeVisible();
      await addAllButton.click();
      await page.waitForTimeout(500);

      // Verify all linked shift assignments are now selected (checkboxes checked)
      for (const assignment of assignmentsOnDate) {
        const assignmentRow = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        const checkbox = assignmentRow.locator('input[type="checkbox"]');
        await expect(checkbox).toBeChecked();
      }

      // Suggestion should disappear after all are selected
      await expect(linkedShiftSuggestion).not.toBeVisible();

      console.log(
        "✅ 'Add All' button successfully adds all linked shift assignments",
      );
    });

    test("should not show suggestion if linked shift assignment not available", async ({
      page,
    }) => {
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      const testLinkShifts = swapTestBase.getTestLinkShifts();

      expect(testLinkShifts.length).toBeGreaterThan(0);
      const linkShift = testLinkShifts[0];

      // Select first worker
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);
      await page.waitForTimeout(1000);

      // Find a date where worker has only ONE of the linked shifts
      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const linkedShiftAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter((a) => linkShift.shiftIds.includes(a.shiftId));

      const assignmentsByDate: {
        [key: string]: typeof linkedShiftAssignments;
      } = {};
      linkedShiftAssignments.forEach((a) => {
        const dateKey = dayjs.utc(a.date).format("YYYY-MM-DD");
        if (!assignmentsByDate[dateKey]) {
          assignmentsByDate[dateKey] = [];
        }
        assignmentsByDate[dateKey].push(a);
      });

      // Find a date with only ONE of the linked shifts
      const dateWithOnlyOneShift = Object.entries(assignmentsByDate).find(
        ([_, assignments]) => {
          const shiftIds = new Set(assignments.map((a) => a.shiftId));
          return shiftIds.size === 1; // Only one unique shift ID
        },
      );

      if (!dateWithOnlyOneShift) {
        test.skip(true, "Need assignment with only one of the linked shifts");
      }

      const [dateKey, assignmentsOnDate] = dateWithOnlyOneShift!;
      const assignment = assignmentsOnDate[0];

      // Select the assignment
      await page.click(`[data-testid="assignment-${assignment.id}"]`);
      await page.waitForTimeout(500);

      // Linked shift suggestion should NOT appear
      const linkedShiftSuggestion = page.locator(
        '[data-testid="linked-shift-suggestion"]',
      );
      await expect(linkedShiftSuggestion).not.toBeVisible();

      console.log(
        "✅ No linked shift suggestion when other shift not available on that date",
      );
    });
  });

  test.describe("Multi-step Form Navigation", () => {
    test("should validate worker selection before proceeding", async ({
      page,
    }) => {
      // Try to click Next without selecting worker
      await page.click('[data-testid="next-button"]');

      // Should show error message
      const errorMessage = page.locator('text="Please select a worker"');
      await expect(errorMessage).toBeVisible();

      console.log("✅ Validation prevents proceeding without worker selection");
    });

    test("should validate assignment selection before proceeding", async ({
      page,
    }) => {
      // Select worker but no assignments
      const testWorkers = swapTestBase.getTestWorkers();
      await page.click('[data-testid="worker-select"]');
      await page.click(
        `[data-testid="worker-option-${testWorkers[0].workerId}"]`,
      );

      // Try to click Next
      await page.click('[data-testid="next-button"]');

      // Should show error message
      const errorMessage = page.locator(
        'text="Please select at least one assignment to offer"',
      );
      await expect(errorMessage).toBeVisible();

      console.log(
        "✅ Validation prevents proceeding without assignment selection",
      );
    });

    test("should proceed to swap type selection when worker and assignments are selected", async ({
      page,
    }) => {
      // Select worker
      const testWorkers = swapTestBase.getTestWorkers();
      const testWorkerId = testWorkers[0].workerId;
      await page.click('[data-testid="worker-select"]');
      await page.click(`[data-testid="worker-option-${testWorkerId}"]`);

      // Wait for assignments to load
      await page.waitForTimeout(1000);

      // Get a valid future assignment
      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const testSchedules = swapTestBase.getTestSchedules();
      const campaignScheduleIds = testSchedules
        .filter((s) => s.status === ScheduleStatus.CAMPAIGN)
        .map((s) => s.id);

      const validAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === testWorkerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter(
          (a) =>
            a.scheduleId === null ||
            (a.scheduleId !== null &&
              !campaignScheduleIds.includes(a.scheduleId)),
        );

      expect(validAssignments.length).toBeGreaterThan(0);

      // Select first valid assignment
      const firstAssignment = validAssignments[0];
      await page.click(`[data-testid="assignment-${firstAssignment.id}"]`);

      // Click Next
      await page.click('[data-testid="next-button"]');

      // Should move to step 2: swap type selection
      // Verify we're on the swap type step by checking for radio buttons
      const directSwapRadio = page.locator('[data-testid="direct-swap-radio"]');
      const openSwapRadio = page.locator('[data-testid="open-swap-radio"]');

      await expect(directSwapRadio).toBeVisible();
      await expect(openSwapRadio).toBeVisible();

      // Verify step title/content
      const swapTypeHeading = page.locator('[data-testid="swap-type-heading"]');
      await expect(swapTypeHeading).toBeVisible();

      console.log(
        "✅ Successfully proceeded to swap type selection after valid input",
      );
    });
  });
});

test.describe("CreateSwapDialog - Member Tests", () => {
  const swapTestBase = new SwapTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and schedules
    const today = dayjs.utc();
    await swapTestBase.setupSwapTests(test.info().workerIndex + 2000, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
    });
  });

  test.beforeEach(async ({ page }) => {
    await swapTestBase.actAsMember(page);
    await swapTestBase.navigateToSwapPage(page);

    // Open the create swap dialog
    await page.click('[data-testid="create-swap-button"]');

    // Wait for the dialog to open
    await page.waitForSelector('[data-testid="create-swap-dialog"]', {
      timeout: 10000,
    });
  });

  test.describe("Worker Selection", () => {
    test("should NOT display worker selection dropdown for members", async ({
      page,
    }) => {
      // Verify worker selection dropdown is NOT visible
      const workerSelect = page.locator('label:has-text("Select Worker")');
      await expect(workerSelect).not.toBeVisible();

      console.log("✅ Worker selection hidden for team members");
    });

    test("should show info message with pre-selected worker for members", async ({
      page,
    }) => {
      // Verify info alert is visible
      const infoAlert = page.locator(
        '[role="alert"]:has-text("Creating swap for")',
      );
      await expect(infoAlert).toBeVisible();

      // Get member worker
      const memberWorker = swapTestBase.getMemberWorker();
      expect(memberWorker).not.toBeNull();

      // Verify the alert mentions the member's worker name
      const alertText = await infoAlert.textContent();
      expect(alertText).toContain(memberWorker!.name);

      console.log(`✅ Pre-selected worker info shown: ${memberWorker!.name}`);
    });

    test("should automatically show assignments for member's worker", async ({
      page,
    }) => {
      // Assignment selector should be visible immediately
      const assignmentSelector = page.locator(
        '[data-testid="assignment-selector"]',
      );
      await expect(assignmentSelector).toBeVisible();

      console.log("✅ Assignments automatically shown for member's worker");
    });
  });

  test.describe("Assignment Visibility for Member", () => {
    test("should only show member's own worker assignments", async ({
      page,
    }) => {
      // Wait for assignments to load
      await page.waitForTimeout(1000);

      const memberWorker = swapTestBase.getMemberWorker();
      expect(memberWorker).not.toBeNull();

      // Get assignments for member's worker
      const memberAssignments = swapTestBase.getMemberWorkerAssignments();
      expect(memberAssignments.length).toBeGreaterThan(0);

      // Verify only member's assignments are visible
      for (const assignment of memberAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).toBeVisible();
      }

      console.log(
        `✅ Member sees only their own ${memberAssignments.length} assignments`,
      );
    });

    test("should apply same filtering rules (no campaign, future only)", async ({
      page,
    }) => {
      // Wait for assignments to load
      await page.waitForTimeout(1000);

      // Should not show campaign assignments
      const campaignAssignments = swapTestBase.getCampaignScheduleAssignments();
      for (const assignment of campaignAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).not.toBeVisible();
      }

      // Should not show today's assignments
      const todayAssignments = swapTestBase.getTodayAssignments();
      for (const assignment of todayAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).not.toBeVisible();
      }

      // Should show future assignments
      const futureAssignments = swapTestBase.getFutureAssignments();
      const memberFutureAssignments = futureAssignments.filter(
        (a) => a.workerId === swapTestBase.getMemberWorker()?.workerId,
      );

      for (const assignment of memberFutureAssignments) {
        const assignmentElement = page.locator(
          `[data-testid="assignment-${assignment.id}"]`,
        );
        await expect(assignmentElement).toBeVisible();
      }

      console.log(
        "✅ Same filtering rules apply for member (no campaign, future only)",
      );
    });
  });

  test.describe("Form Validation for Member", () => {
    test("should validate assignment selection before proceeding", async ({
      page,
    }) => {
      // Try to click Next without selecting assignments
      await page.click('[data-testid="next-button"]');

      // Should show error message
      const errorMessage = page.locator(
        'text="Please select at least one assignment to offer"',
      );
      await expect(errorMessage).toBeVisible();

      console.log("✅ Member must also select assignments to proceed");
    });

    test("should proceed to swap type selection when assignments are selected", async ({
      page,
    }) => {
      // Wait for assignments to load
      await page.waitForTimeout(1000);

      // Get a valid future assignment for the member
      const memberWorker = swapTestBase.getMemberWorker();
      expect(memberWorker).not.toBeNull();

      const tomorrow = dayjs.utc().add(1, "day").startOf("day");
      const testSchedules = swapTestBase.getTestSchedules();
      const campaignScheduleIds = testSchedules
        .filter((s) => s.status === ScheduleStatus.CAMPAIGN)
        .map((s) => s.id);

      const validAssignments = swapTestBase
        .getTestAssignments()
        .filter((a) => a.workerId === memberWorker!.workerId)
        .filter((a) => dayjs.utc(a.date).isSameOrAfter(tomorrow, "day"))
        .filter(
          (a) =>
            a.scheduleId === null ||
            (a.scheduleId !== null &&
              !campaignScheduleIds.includes(a.scheduleId)),
        );

      expect(validAssignments.length).toBeGreaterThan(0);

      // Select first valid assignment
      const firstAssignment = validAssignments[0];
      await page.click(`[data-testid="assignment-${firstAssignment.id}"]`);

      // Click Next
      await page.click('[data-testid="next-button"]');

      // Should move to step 2: swap type selection
      const directSwapRadio = page.locator('[data-testid="direct-swap-radio"]');
      const openSwapRadio = page.locator('[data-testid="open-swap-radio"]');

      await expect(directSwapRadio).toBeVisible();
      await expect(openSwapRadio).toBeVisible();

      // Verify step title/content
      const swapTypeHeading = page.locator('[data-testid="swap-type-heading"]');
      await expect(swapTypeHeading).toBeVisible();

      console.log(
        "✅ Member successfully proceeded to swap type selection after selecting assignments",
      );
    });
  });
});
