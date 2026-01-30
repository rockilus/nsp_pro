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
import { DatabaseTestUtils, TEST_USER, TEST_USER_2 } from "./database-utils";
import { ShiftT, ShiftType } from "../../src/types/shift";
import { ScheduleT, ScheduleStatus } from "../../src/types/schedule";
import { AssignmentT } from "../../src/types/assignment";
import { testConfig } from "./test-config";

dayjs.extend(utc);

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
  protected testSchedules: ScheduleT[] = [];
  protected testAssignments: AssignmentT[] = [];
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
      endTime: dayjs.utc().hour(16).minute(0).second(0),
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
    console.log(`✅ Created ${this.testShifts.length} test shifts`);

    // 8. Create schedules (campaign and validated)
    await this.createSchedules(options.referenceDate);

    // 9. Create assignments if requested
    if (options.createAssignments) {
      await this.createTestAssignments(options.referenceDate);
    }
  }

  /**
   * Create campaign and validated schedules
   */
  private async createSchedules(referenceDate: dayjs.Dayjs): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    // Create campaign schedule for next month
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

    // Create validated schedule for current month
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

    // Validate the schedule
    const validatedScheduleResult = await this.dbUtils.validateSchedule(
      updatedValidated.id,
      this.testTeam.teamId,
    );
    this.testSchedules.push(validatedScheduleResult);

    console.log("✅ Created campaign and validated schedules");
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

    // Create assignments with validated schedule (in current month, future dates)
    const validatedSchedule = this.testSchedules.find(
      (s) => s.status === ScheduleStatus.VALIDATED,
    );
    if (validatedSchedule) {
      const validatedDate1 = tomorrow.add(2, "days");
      const validatedDate2 = tomorrow.add(5, "days");

      for (const worker of this.testWorkers) {
        const assignment1 = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[1].id,
          date: validatedDate1,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "Validated schedule assignment",
        });
        this.testAssignments.push(assignment1);

        const assignment2 = await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: worker.workerId,
          shiftId: this.testShifts[0].id,
          date: validatedDate2,
          scheduleId: validatedSchedule.id,
          fixed: false,
          comment: "Validated schedule assignment 2",
        });
        this.testAssignments.push(assignment2);
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
}
