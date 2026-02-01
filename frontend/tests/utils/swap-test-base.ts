/**
 * Swap Test Base Utilities
 *
 * This module provides utilities for E2E testing of the swap functionality.
 * It includes methods to:
 * - Setup test teams with owners and members
 * - Create workers, shifts, and assignments (no schedule, validated, campaign)
 * - Navigate to swap pages with test data
 * - Switch between user contexts (owner/member)
 * - Query assignments by schedule type and date
 */

import { Page } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { DatabaseTestUtils, TEST_USER, TEST_USER_2 } from "./database-utils";
import {
  ShiftT,
  ShiftType,
  ShiftRestType,
  LinkShiftT,
} from "../../src/types/shift";
import { ScheduleT, ScheduleStatus } from "../../src/types/schedule";
import { AssignmentT } from "../../src/types/assignment";
import { SwapRequestT } from "../../src/types/swap";
import { testConfig } from "./test-config";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

export interface SwapSetupOptions {
  referenceDate: dayjs.Dayjs;
  createAssignments: boolean;
  linkMemberToWorker?: boolean; // Default true - whether to link TEST_USER_2 to a worker
}

export class SwapTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;
  protected ownerUser: { userId: string; email: string } = {
    userId: TEST_USER.user_id,
    email: TEST_USER.email,
  };
  protected memberUser: { userId: string; email: string } = {
    userId: TEST_USER_2.user_id,
    email: TEST_USER_2.email,
  };

  // Storage for created test entities
  protected testWorkers: Array<{ workerId: string; name: string }> = [];
  protected testShifts: ShiftT[] = [];
  protected testLinkShifts: LinkShiftT[] = [];
  protected testSchedules: ScheduleT[] = [];
  protected testAssignments: AssignmentT[] = [];
  protected testSwaps: SwapRequestT[] = [];
  protected memberWorker: { workerId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup swap tests environment
   * Creates a test team with owner, member, workers, shifts, schedules, and assignments
   *
   * @param workerIndex - For unique naming (from test.info().workerIndex)
   * @param options - Configuration for test scenario
   */
  async setupSwapTests(
    workerIndex: number,
    options: SwapSetupOptions,
  ): Promise<void> {
    // 1. Wait for API to be ready
    await this.dbUtils.waitForApiReady();

    // 2. Check health
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error("Test utilities not available");
    }

    // 3. Create test team (TEST_USER becomes owner automatically)
    const uniqueTeamName = `Swap Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(`✅ Created test team: ${this.testTeam.name}`);

    // 4. Add TEST_USER_2 as member
    await this.dbUtils.addSecondUserToTeam(this.testTeam.teamId, "member");
    console.log(`✅ Added TEST_USER_2 as member to team`);

    // 5. Create test workers (at least 2)
    const worker1 = await this.createWorker({
      name: "Swap Test Worker 1",
      acronym: "STW1",
      weeklyHours: 40,
    });
    this.testWorkers.push(worker1);

    const worker2 = await this.createWorker({
      name: "Swap Test Worker 2",
      acronym: "STW2",
      weeklyHours: 40,
    });
    this.testWorkers.push(worker2);

    const worker3 = await this.createWorker({
      name: "Swap Test Worker 3",
      acronym: "STW3",
      weeklyHours: 40,
    });
    this.testWorkers.push(worker3);
    console.log(`✅ Created ${this.testWorkers.length} test workers`);

    // 6. Link TEST_USER_2 to second worker (if requested)
    const shouldLinkMember = options.linkMemberToWorker !== false; // Default to true
    if (shouldLinkMember) {
      await this.dbUtils.attachWorkerToUser(
        worker2.workerId,
        TEST_USER_2.user_id,
        this.testTeam.teamId,
      );
      this.memberWorker = worker2;
      console.log(`✅ Linked TEST_USER_2 to worker: ${worker2.name}`);
    } else {
      console.log("⏭️  Skipped linking TEST_USER_2 to worker");
    }

    // 7. Create work shifts (at least 2)
    const morningShift = await this.createShift({
      name: "Morning Shift",
      startTime: dayjs.utc().hour(8).minute(0).second(0),
      endTime: dayjs.utc().hour(12).minute(0).second(0),
      shiftType: ShiftType.NORMAL,
      acronym: "MS",
      color: "#4CAF50",
    });
    this.testShifts.push(morningShift);

    const afternoonShift = await this.createShift({
      name: "Afternoon Shift",
      startTime: dayjs.utc().hour(14).minute(0).second(0),
      endTime: dayjs.utc().hour(22).minute(0).second(0),
      shiftType: ShiftType.NORMAL,
      acronym: "AS",
      color: "#2196F3",
    });
    this.testShifts.push(afternoonShift);

    // Create duty shift (24-hour shift)
    const dutyShift = await this.createShift({
      name: "Duty Shift",
      startTime: dayjs.utc().hour(8).minute(0).second(0),
      endTime: dayjs.utc().add(1, "day").hour(8).minute(0).second(0),
      shiftType: ShiftType.DUTY,
      acronym: "DS",
      color: "#FF5722",
      recuperationTime: 24,
    });
    this.testShifts.push(dutyShift);

    // Create recuperation shift (linked to duty shift)
    const recuperationShift = await this.createShift({
      name: "Recuperation Shift",
      startTime: dutyShift.endTime,
      endTime: dutyShift.endTime.add(1, "day"),
      shiftType: ShiftType.REST,
      restType: ShiftRestType.RECUPERATION,
      recuperationDutyId: dutyShift.id,
      acronym: "RS",
      color: "#9E9E9E",
    });
    this.testShifts.push(recuperationShift);
    console.log(
      `✅ Created ${this.testShifts.length} test shifts (including duty and recuperation)`,
    );

    // 7.5. Create link shift linking morning and afternoon shifts
    const linkShift = await this.createLinkShift({
      shiftIds: [morningShift.id, afternoonShift.id],
    });
    this.testLinkShifts.push(linkShift);
    console.log(
      `✅ Created link shift linking ${this.testShifts.length} shifts`,
    );

    // 8. Create schedules (campaign and validated)
    await this.createSchedules(options.referenceDate);

    // 9. Create assignments if requested
    if (options.createAssignments) {
      await this.createTestAssignments(options.referenceDate);
    }

    // 10. Create test swaps
    if (options.createAssignments && this.testAssignments.length > 0) {
      await this.createTestSwaps();
    }
  }

  /**
   * Create campaign and validated schedules
   */
  private async createSchedules(referenceDate: dayjs.Dayjs): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    // Create validated schedule first (for current month)
    // This will initially be CAMPAIGN, then we validate it
    const validatedStart = referenceDate.startOf("month").format("YYYY-MM-DD");
    const validatedEnd = referenceDate.endOf("month").format("YYYY-MM-DD");

    console.log(
      `📅 Creating validated schedule: ${validatedStart} to ${validatedEnd}`,
    );

    const validatedSchedule = await this.dbUtils.createSchedule(
      this.testTeam.teamId,
    );
    const updatedValidated = await this.dbUtils.updateSchedule({
      ...validatedSchedule,
      startDate: dayjs(validatedStart).utc(),
      endDate: dayjs(validatedEnd).utc(),
    });

    // Validate the schedule (changes status from CAMPAIGN to VALIDATED)
    const validatedScheduleResult = await this.dbUtils.validateSchedule(
      updatedValidated.id,
      this.testTeam.teamId,
    );
    this.testSchedules.push(validatedScheduleResult);

    // Now create campaign schedule for next month
    // Since the first schedule is now VALIDATED, this will create a new CAMPAIGN
    const nextMonth = referenceDate.add(1, "month");
    const campaignStart = nextMonth.startOf("month").format("YYYY-MM-DD");
    const campaignEnd = nextMonth.endOf("month").format("YYYY-MM-DD");

    console.log(
      `📅 Creating campaign schedule: ${campaignStart} to ${campaignEnd}`,
    );

    const campaignSchedule = await this.dbUtils.createSchedule(
      this.testTeam.teamId,
    );
    const updatedCampaign = await this.dbUtils.updateSchedule({
      ...campaignSchedule,
      startDate: dayjs(campaignStart).utc(),
      endDate: dayjs(campaignEnd).utc(),
    });
    this.testSchedules.push(updatedCampaign);

    console.log("✅ Created campaign and validated schedules");
    console.log(this.testSchedules);
  }

  /**
   * Create test assignments with different schedule associations
   */
  private async createTestAssignments(
    referenceDate: dayjs.Dayjs,
  ): Promise<void> {
    if (
      !this.testTeam ||
      this.testWorkers.length === 0 ||
      this.testShifts.length === 0
    ) {
      throw new Error("Test team, workers, or shifts not created");
    }

    const today = dayjs.utc().startOf("day");

    // Create assignments for today (should not be visible in swap dialog)
    for (const worker of this.testWorkers) {
      const assignment = await this.dbUtils.createAssignment({
        teamId: this.testTeam.teamId,
        workerId: worker.workerId,
        shiftId: this.testShifts[0].id,
        date: today,
        scheduleId: null, // No schedule association
        fixed: false,
        comment: "Today's assignment - should not appear in swap dialog",
      });
      this.testAssignments.push(assignment);
    }

    // Create assignments without schedule association (tomorrow and future)
    const tomorrow = today.add(1, "day").utc();
    for (const worker of this.testWorkers) {
      const assignment = await this.dbUtils.createAssignment({
        teamId: this.testTeam.teamId,
        workerId: worker.workerId,
        shiftId: this.testShifts[0].id,
        date: tomorrow,
        scheduleId: null,
        fixed: false,
        comment: "No schedule assignment",
      });
      this.testAssignments.push(assignment);
    }

    // Find morning and afternoon shifts for linked shift testing
    const morningShift = this.testShifts.find(
      (s) => s.name === "Morning Shift",
    );
    const afternoonShift = this.testShifts.find(
      (s) => s.name === "Afternoon Shift",
    );

    // Create assignments with validated schedule (in current month, future dates)
    const validatedSchedule = this.testSchedules.find(
      (s) => s.status === ScheduleStatus.VALIDATED,
    );
    if (validatedSchedule) {
      const validatedDate1 = tomorrow.add(2, "days");
      const validatedDate2 = tomorrow.add(5, "days");

      for (const worker of this.testWorkers) {
        // Create 2 assignments on validatedDate1 (morning + afternoon)
        const assignment1Morning = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[0].id, // Morning shift
          date: validatedDate1,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "Validated schedule assignment 1 - Morning",
        });
        this.testAssignments.push(assignment1Morning);

        const assignment1Afternoon = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[1].id, // Afternoon shift
          date: validatedDate1,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "Validated schedule assignment 1 - Afternoon",
        });
        this.testAssignments.push(assignment1Afternoon);

        // Create 2 assignments on validatedDate2 (morning + afternoon)
        const assignment2Morning = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[0].id, // Morning shift
          date: validatedDate2,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "Validated schedule assignment 2 - Morning",
        });
        this.testAssignments.push(assignment2Morning);

        const assignment2Afternoon = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[1].id, // Afternoon shift
          date: validatedDate2,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "Validated schedule assignment 2 - Afternoon",
        });
        this.testAssignments.push(assignment2Afternoon);
      }

      // Create assignments for BOTH linked shifts on the same day for linked shift testing
      if (morningShift && afternoonShift) {
        const linkedShiftDate = tomorrow.add(3, "days");
        for (const worker of this.testWorkers) {
          // Morning shift assignment
          const morningAssignment = await this.dbUtils.createAssignment({
            teamId: this.testTeam.teamId,
            workerId: worker.workerId,
            shiftId: morningShift.id,
            date: linkedShiftDate,
            scheduleId: validatedSchedule.id,
            fixed: false,
            comment: "Linked shift - Morning",
          });
          this.testAssignments.push(morningAssignment);

          // Afternoon shift assignment
          const afternoonAssignment = await this.dbUtils.createAssignment({
            teamId: this.testTeam.teamId,
            workerId: worker.workerId,
            shiftId: afternoonShift.id,
            date: linkedShiftDate,
            scheduleId: validatedSchedule.id,
            fixed: false,
            comment: "Linked shift - Afternoon",
          });
          this.testAssignments.push(afternoonAssignment);
        }
      }
    }

    // Create assignments with campaign schedule (next month)
    const campaignSchedule = this.testSchedules.find(
      (s) => s.status === ScheduleStatus.CAMPAIGN,
    );
    if (campaignSchedule) {
      const nextMonth = referenceDate.add(1, "month");
      const campaignDate1 = nextMonth.date(5);
      const campaignDate2 = nextMonth.date(15);

      for (const worker of this.testWorkers) {
        const assignment1 = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[0].id,
          date: campaignDate1,
          scheduleId: campaignSchedule.id,
          fixed: false,
          comment: "Campaign schedule assignment",
        });
        this.testAssignments.push(assignment1);

        const assignment2 = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[1].id,
          date: campaignDate2,
          scheduleId: campaignSchedule.id,
          fixed: false,
          comment: "Campaign schedule assignment 2",
        });
        this.testAssignments.push(assignment2);
      }
    }

    console.log(`✅ Created ${this.testAssignments.length} test assignments`);
  }

  /**
   * Create test direct swaps between workers
   */
  private async createTestSwaps(): Promise<void> {
    if (
      !this.testTeam ||
      this.testWorkers.length < 2 ||
      this.testAssignments.length === 0
    ) {
      console.log("⏭️  Skipping swap creation - insufficient data");
      return;
    }

    const tomorrow = dayjs.utc().add(1, "day").startOf("day");

    // Get assignments for Worker 1
    const worker1 = this.testWorkers[0];
    const worker1Assignments = this.testAssignments.filter(
      (a) =>
        a.workerId === worker1.workerId &&
        a.date.isSameOrAfter(tomorrow, "day") &&
        a.scheduleId !== null, // Only from schedules
    );

    // Get assignments for Worker 2
    const worker2 = this.testWorkers[1];
    const worker2Assignments = this.testAssignments.filter(
      (a) =>
        a.workerId === worker2.workerId &&
        a.date.isSameOrAfter(tomorrow, "day") &&
        a.scheduleId !== null, // Only from schedules
    );

    if (worker1Assignments.length < 2 || worker2Assignments.length < 2) {
      console.log("⏭️  Skipping swap creation - not enough assignments");
      return;
    }

    // SWAP 1: Worker1 offers 2 assignments on DATE1 -> Worker2 offers 2 assignments on DATE2 (different dates)
    // Sort assignments by date to ensure we pick from different dates
    const worker1SortedByDate = [...worker1Assignments].sort(
      (a, b) => a.date.valueOf() - b.date.valueOf(),
    );
    const worker2SortedByDate = [...worker2Assignments].sort(
      (a, b) => a.date.valueOf() - b.date.valueOf(),
    );

    // Group assignments by date for each worker
    const worker1ByDate = new Map<string, typeof worker1Assignments>();
    for (const assignment of worker1SortedByDate) {
      const dateKey = assignment.date.format("YYYY-MM-DD");
      if (!worker1ByDate.has(dateKey)) {
        worker1ByDate.set(dateKey, []);
      }
      worker1ByDate.get(dateKey)!.push(assignment);
    }

    const worker2ByDate = new Map<string, typeof worker2Assignments>();
    for (const assignment of worker2SortedByDate) {
      const dateKey = assignment.date.format("YYYY-MM-DD");
      if (!worker2ByDate.has(dateKey)) {
        worker2ByDate.set(dateKey, []);
      }
      worker2ByDate.get(dateKey)!.push(assignment);
    }

    // Find a date where Worker1 has at least 2 assignments
    let worker1OfferIds: string[] | null = null;
    let worker1Date: string | null = null;
    for (const [dateKey, assignments] of worker1ByDate.entries()) {
      if (assignments.length >= 2) {
        worker1OfferIds = assignments.slice(0, 2).map((a) => a.id);
        worker1Date = dateKey;
        break;
      }
    }

    // Find a DIFFERENT date where Worker2 has at least 2 assignments
    let worker2OfferIds: string[] | null = null;
    let worker2Date: string | null = null;
    for (const [dateKey, assignments] of worker2ByDate.entries()) {
      if (assignments.length >= 2 && dateKey !== worker1Date) {
        worker2OfferIds = assignments.slice(0, 2).map((a) => a.id);
        worker2Date = dateKey;
        break;
      }
    }

    if (!worker1OfferIds || !worker2OfferIds) {
      console.log(
        "⏭️  Skipping swap creation - not enough assignments on different dates",
      );
      console.log(
        `   Worker1 dates: ${Array.from(worker1ByDate.keys())
          .map((k) => `${k}(${worker1ByDate.get(k)?.length})`)
          .join(", ")}`,
      );
      console.log(
        `   Worker2 dates: ${Array.from(worker2ByDate.keys())
          .map((k) => `${k}(${worker2ByDate.get(k)?.length})`)
          .join(", ")}`,
      );
      return;
    }

    const directSwap1 = await this.dbUtils.createSwap({
      teamId: this.testTeam.teamId,
      offeredAssignmentIds: worker1OfferIds,
      requestedAssignmentIds: worker2OfferIds,
      swapType: "direct",
      targetWorkerId: worker2.workerId,
      comment: "Test direct swap - 2 normal shifts on different dates",
    });

    this.testSwaps.push(directSwap1);

    // SWAP 2: Create assignments with duty shift for duty swap test
    // Worker1 offers 2 normal shifts (morning + afternoon) on one date
    // Worker2 offers 1 duty shift on another date
    const dutyShift = this.testShifts.find(
      (s) => s.shiftType === ShiftType.DUTY,
    );
    const morningShift = this.testShifts.find(
      (s) => s.name === "Morning Shift",
    );
    const afternoonShift = this.testShifts.find(
      (s) => s.name === "Afternoon Shift",
    );

    if (dutyShift && morningShift && afternoonShift) {
      const validatedSchedule = this.testSchedules.find(
        (s) => s.status === ScheduleStatus.VALIDATED,
      );

      if (validatedSchedule) {
        // Create 2 normal shifts for Worker1 on a specific date (e.g., tomorrow + 10 days)
        const worker1DutySwapDate = tomorrow.add(10, "days");

        const worker1MorningAssignment = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker1.workerId,
          shiftId: morningShift.id,
          date: worker1DutySwapDate,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "For duty swap test - morning",
        });
        this.testAssignments.push(worker1MorningAssignment);

        const worker1AfternoonAssignment = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker1.workerId,
          shiftId: afternoonShift.id,
          date: worker1DutySwapDate,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "For duty swap test - afternoon",
        });
        this.testAssignments.push(worker1AfternoonAssignment);

        // Create 1 duty shift for Worker2 on a different date (e.g., tomorrow + 12 days)
        const worker2DutySwapDate = tomorrow.add(12, "days");

        const worker2DutyAssignment = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker2.workerId,
          shiftId: dutyShift.id,
          date: worker2DutySwapDate,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "For duty swap test - duty shift",
        });
        this.testAssignments.push(worker2DutyAssignment);

        // Create the duty swap
        const dutySwap = await this.dbUtils.createSwap({
          teamId: this.testTeam.teamId,
          offeredAssignmentIds: [
            worker1MorningAssignment.id,
            worker1AfternoonAssignment.id,
          ],
          requestedAssignmentIds: [worker2DutyAssignment.id],
          swapType: "direct",
          targetWorkerId: worker2.workerId,
          comment: "Test duty swap - 2 normal shifts for 1 duty shift",
        });

        this.testSwaps.push(dutySwap);
      }
    }

    // SWAP 3: Create an open swap from Worker 3
    // Worker 3 offers 2 assignments and opens it for bids
    if (this.testWorkers.length >= 3) {
      const worker3 = this.testWorkers[2];
      const worker3Assignments = this.testAssignments.filter(
        (a) =>
          a.workerId === worker3.workerId &&
          a.date.isSameOrAfter(tomorrow, "day") &&
          a.scheduleId !== null, // Only from schedules
      );

      if (worker3Assignments.length >= 2) {
        const openSwap = await this.dbUtils.createSwap({
          teamId: this.testTeam.teamId,
          offeredAssignmentIds: [
            worker3Assignments[0].id,
            worker3Assignments[1].id,
          ],
          requestedAssignmentIds: null,
          swapType: "open",
          targetWorkerId: null,
          comment: "Test open swap - accepting bids from all workers",
        });

        this.testSwaps.push(openSwap);
        console.log(`✅ Created open swap from Worker 3: ${openSwap.id}`);
      }
    }

    console.log(
      `✅ Created ${this.testSwaps.length} test swaps (including duty and open swap scenarios)`,
    );
  }

  /**
   * Create a worker for the test team
   */
  async createWorker(workerData: {
    name: string;
    acronym?: string;
    weeklyHours?: number;
    weeklyHoursDesired?: number;
    employmentStartDate?: Date;
    employmentEndDate?: Date | null;
  }): Promise<{ workerId: string; name: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    return await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: workerData.name,
      acronym: workerData.acronym,
      weeklyHours: workerData.weeklyHours ?? 40,
      weeklyHoursDesired: workerData.weeklyHoursDesired ?? 40,
      employmentStartDate: workerData.employmentStartDate,
      employmentEndDate: workerData.employmentEndDate,
    });
  }

  /**
   * Create a shift for the test team
   */
  async createShift(shiftData: {
    name: string;
    startTime: dayjs.Dayjs;
    endTime: dayjs.Dayjs;
    shiftType: ShiftType;
    acronym?: string;
    color?: string;
    recuperationTime?: number;
    restType?: ShiftRestType;
    recuperationDutyId?: string | null;
  }): Promise<ShiftT> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    return await this.dbUtils.createShift({
      teamId: this.testTeam.teamId,
      name: shiftData.name,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      shiftType: shiftData.shiftType,
      acronym: shiftData.acronym,
      color: shiftData.color,
      ...(shiftData.recuperationTime !== undefined && {
        recuperationTime: shiftData.recuperationTime,
      }),
      ...(shiftData.restType !== undefined && { restType: shiftData.restType }),
      ...(shiftData.recuperationDutyId !== undefined && {
        recuperationDutyId: shiftData.recuperationDutyId,
      }),
    });
  }

  /**
   * Create a link shift for the test team
   */
  async createLinkShift(linkShiftData: {
    shiftIds: string[];
  }): Promise<LinkShiftT> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    return await this.dbUtils.createLinkShift({
      teamId: this.testTeam.teamId,
      shiftIds: linkShiftData.shiftIds,
    });
  }

  /**
   * Navigate to swap page for the test team
   */
  async navigateToSwapPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    await page.goto(`${testConfig.frontendUrl}/en/plan/swaps/`);
    await page.waitForLoadState("networkidle");

    console.log("✅ Navigated to swap page");
  }

  /**
   * Set authentication to act as the owner (TEST_USER)
   */
  async actAsOwner(page: Page): Promise<void> {
    await this.dbUtils.authenticatePageAsTestUser(page);
  }

  /**
   * Set authentication to act as the member (TEST_USER_2)
   */
  async actAsMember(page: Page): Promise<void> {
    await this.dbUtils.authenticatePageAsTestUser2(page);
  }

  /**
   * Get the test team details
   */
  getTestTeam(): { teamId: string; name: string } | null {
    return this.testTeam;
  }

  /**
   * Get the created test workers
   */
  getTestWorkers(): Array<{ workerId: string; name: string }> {
    return this.testWorkers;
  }

  /**
   * Get the created test shifts
   */
  getTestShifts(): ShiftT[] {
    return this.testShifts;
  }

  /**
   * Get the created test link shifts
   */
  getTestLinkShifts(): LinkShiftT[] {
    return this.testLinkShifts;
  }

  /**
   * Get the member worker (worker linked to TEST_USER_2)
   */
  getMemberWorker(): { workerId: string; name: string } | null {
    return this.memberWorker;
  }

  /**
   * Get all test assignments
   */
  getTestAssignments(): AssignmentT[] {
    return this.testAssignments;
  }

  /**
   * Get all test schedules
   */
  getTestSchedules(): ScheduleT[] {
    return this.testSchedules;
  }

  /**
   * Get all test swaps
   */
  getTestSwaps(): SwapRequestT[] {
    return this.testSwaps;
  }

  /**
   * Get a swap by ID
   */
  async getSwapById(swapId: string): Promise<SwapRequestT> {
    return await this.dbUtils.getSwapById(swapId);
  }

  /**
   * Accept a direct swap (target worker accepts)
   */
  async acceptDirectSwap(swapId: string): Promise<SwapRequestT> {
    return await this.dbUtils.acceptDirectSwap(swapId);
  }

  /**
   * Approve a swap (team leader approves)
   */
  async approveSwap(swapId: string): Promise<SwapRequestT> {
    return await this.dbUtils.approveSwap(swapId);
  }

  /**
   * Revert a completed swap (team leader reverts)
   */
  async revertSwap(swapId: string): Promise<SwapRequestT> {
    return await this.dbUtils.revertSwap(swapId);
  }

  /**
   * Create an open swap
   */
  async createOpenSwap(
    offeredAssignmentIds: string[],
    comment: string,
  ): Promise<SwapRequestT> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }
    return await this.dbUtils.createSwap({
      teamId: this.testTeam.teamId,
      offeredAssignmentIds,
      requestedAssignmentIds: null,
      swapType: "open",
      targetWorkerId: null,
      comment,
    });
  }

  /**
   * Add a bid to an open swap
   */
  async addBidToSwap(
    swapId: string,
    bidderWorkerId: string,
    offeredAssignmentIds: string[],
  ): Promise<SwapRequestT> {
    return await this.dbUtils.addBidToOpenSwap(
      swapId,
      bidderWorkerId,
      offeredAssignmentIds,
    );
  }

  /**
   * Accept a bid on an open swap
   */
  async acceptBid(swapId: string, bidId: string): Promise<SwapRequestT> {
    return await this.dbUtils.acceptBidOnOpenSwap(swapId, bidId);
  }

  /**
   * Get assignments for the test team
   */
  async getAssignments(
    includeCampaign: boolean = false,
    startDate?: dayjs.Dayjs,
    endDate?: dayjs.Dayjs,
    workerId?: string,
  ): Promise<AssignmentT[]> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }
    const result = await this.dbUtils.getAssignments(
      this.testTeam.teamId,
      includeCampaign,
      startDate,
      endDate,
      workerId,
    );
    return result.assignments;
  }

  /**
   * Approve a swap as member (should fail with permission error)
   */
  async approveSwapAsMember(swapId: string): Promise<SwapRequestT> {
    // Create a client authenticated as TEST_USER_2 (member)
    const memberClient = this.dbUtils.createAuthenticatedClientForUser(
      TEST_USER_2.user_id,
    );

    // Make the approve request as member
    const response = await memberClient.post<any>(
      `/swaps/${swapId}/approve`,
      {},
    );

    return {
      id: response.id,
      teamId: response.teamId,
      createdByUserId: response.createdByUserId,
      swapType: response.swapType,
      status: response.status,
      offeredAssignmentIds: response.offeredAssignmentIds,
      requestedAssignmentIds: response.requestedAssignmentIds,
      targetWorkerId: response.targetWorkerId,
      comment: response.comment,
      bids: (response.bids || []).map((bid: any) => ({
        id: bid.id,
        workerId: bid.workerId,
        offeredAssignmentIds: bid.offeredAssignmentIds,
        createdAt: dayjs.unix(bid.createdAt),
        accepted: bid.accepted,
      })),
      createdAt: dayjs.unix(response.createdAt),
      completedAt: response.completedAt
        ? dayjs.unix(response.completedAt)
        : null,
      completedByUserId: response.completedByUserId,
      revertedAt: response.revertedAt ? dayjs.unix(response.revertedAt) : null,
      revertedByUserId: response.revertedByUserId,
      auditData: response.auditData || [],
    };
  }

  /**
   * Make an authenticated request to the API
   */
  async makeAuthenticatedRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any,
  ): Promise<T> {
    return await this.dbUtils.makeAuthenticatedRequest<T>(
      method,
      endpoint,
      data,
    );
  }
}
