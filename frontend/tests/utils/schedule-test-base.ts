/**
 * Schedule Test Base Utilities
 *
 * This module provides utilities for E2E testing of the schedule functionality.
 * It includes methods to:
 * - Setup test teams with owners and members
 * - Create workers, shifts, shift demands, and assignments
 * - Navigate to schedule pages with test data
 * - Switch between user contexts (owner/member)
 */

import { Page } from "@playwright/test";
import { DatabaseTestUtils, TEST_USER, TEST_USER_2 } from "./database-utils";
import { testConfig } from "./test-config";
import { ShiftType } from "../../src/types/shift";
import { WorkerT } from "../../src/types/worker";
import { ShiftT } from "../../src/types/shift";
import { RequestT } from "../../src/types/request";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export interface ScheduleSetupOptions {
  referenceDate: dayjs.Dayjs;
  createAssignments: boolean;
  campaignDates?: {
    start: string;
    end: string;
  };
}

export class ScheduleTestBase {
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
  protected testSchedule: { scheduleId: string } | null = null;
  protected testRequests: RequestT[] = [];
  protected memberWorker: { workerId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup schedule tests environment
   * Creates a test team with owner, member, workers, shifts, demands, and optionally assignments
   *
   * @param workerIndex - For unique naming (from test.info().workerIndex)
   * @param options - Configuration for test scenario
   */
  async setupScheduleTests(
    workerIndex: number,
    options: ScheduleSetupOptions
  ): Promise<void> {
    // 1. Wait for API to be ready
    await this.dbUtils.waitForApiReady();

    // 2. Check health
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error("Test utilities not available");
    }

    // 3. Create test team (TEST_USER becomes owner automatically)
    const uniqueTeamName = `Schedule Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(`✅ Created test team: ${this.testTeam.name}`);

    // 4. Add TEST_USER_2 as member (do not create user - exists from global setup)
    await this.dbUtils.addSecondUserToTeam(this.testTeam.teamId, "member");
    console.log(`✅ Added TEST_USER_2 as member to team`);

    // 5. Create test workers (at least 2)
    const worker1 = await this.createWorker({
      name: "Test Worker 1",
      acronym: "TW1",
      weeklyHours: 40,
    });
    this.testWorkers.push(worker1);

    const worker2 = await this.createWorker({
      name: "Test Worker 2",
      acronym: "TW2",
      weeklyHours: 40,
    });
    this.testWorkers.push(worker2);
    console.log(`✅ Created ${this.testWorkers.length} test workers`);

    // 6. Link TEST_USER_2 to first worker
    await this.dbUtils.attachWorkerToUser(
      worker1.workerId,
      TEST_USER_2.user_id,
      this.testTeam.teamId
    );
    this.memberWorker = worker1;
    console.log(`✅ Linked TEST_USER_2 to ${worker1.name}`);

    // 7. Create work shifts (at least 2)
    const morningShift = await this.createShift({
      name: "Morning Shift",
      startTime: dayjs.utc().hour(8).minute(0).second(0),
      endTime: dayjs.utc().hour(16).minute(0).second(0),
      shiftType: ShiftType.DUTY,
      acronym: "MS",
      color: "#4CAF50",
    });
    this.testShifts.push(morningShift);

    const afternoonShift = await this.createShift({
      name: "Afternoon Shift",
      startTime: dayjs.utc().hour(14).minute(0).second(0),
      endTime: dayjs.utc().hour(22).minute(0).second(0),
      shiftType: ShiftType.DUTY,
      acronym: "AS",
      color: "#2196F3",
    });
    this.testShifts.push(afternoonShift);
    console.log(`✅ Created ${this.testShifts.length} test shifts`);

    // 8. Create shift demands for reference date
    await this.dbUtils.createShiftDemand({
      teamId: this.testTeam.teamId,
      shiftId: morningShift.id,
      date: options.referenceDate.toDate(),
      count: 2,
      notes: "Test demand for morning shift",
      source: "manual",
    });

    await this.dbUtils.createShiftDemand({
      teamId: this.testTeam.teamId,
      shiftId: afternoonShift.id,
      date: options.referenceDate.toDate(),
      count: 1,
      notes: "Test demand for afternoon shift",
      source: "manual",
    });
    console.log(`✅ Created shift demands for reference date`);

    // 9. Create a request for a worker on reference date
    const testRequest = await this.dbUtils.createRequest({
      teamId: this.testTeam.teamId,
      workerId: worker2.workerId,
      requestType: "work_demand",
      startDate: options.referenceDate,
      endDate: options.referenceDate,
      status: "pending",
      negative: false,
      comment: "Test work demand request",
      shiftId: morningShift.id,
    });
    this.testRequests.push(testRequest);
    console.log(`✅ Created test request for ${worker2.name}`);

    // 10. Create assignments if requested
    if (options.createAssignments) {
      await this.createTestAssignments(options.referenceDate);
    }

    // 11. Create campaign schedule if dates provided
    if (options.campaignDates) {
      await this.createCampaignSchedule(
        options.campaignDates.start,
        options.campaignDates.end
      );
      console.log(
        `✅ Created campaign schedule: ${options.campaignDates.start} to ${options.campaignDates.end}`
      );
    }
  }

  /**
   * Create test assignments for reference date and random dates in following month
   */
  private async createTestAssignments(
    referenceDate: dayjs.Dayjs
  ): Promise<void> {
    if (
      !this.testTeam ||
      this.testWorkers.length === 0 ||
      this.testShifts.length === 0
    ) {
      throw new Error("Test team, workers, and shifts must be created first");
    }

    const assignments = [];

    // Create assignment for reference date
    assignments.push({
      workerId: this.testWorkers[0].workerId,
      shiftId: this.testShifts[0].id,
      date: referenceDate.format("YYYY-MM-DD"),
      fixed: false,
      comment: "Test assignment on reference date",
    });

    // Create assignments for random dates in following month
    const nextMonth = referenceDate.add(1, "month");
    const randomDates = [
      nextMonth.date(5),
      nextMonth.date(12),
      nextMonth.date(20),
      nextMonth.date(25),
    ];

    for (const date of randomDates) {
      const randomWorker =
        this.testWorkers[Math.floor(Math.random() * this.testWorkers.length)];
      const randomShift =
        this.testShifts[Math.floor(Math.random() * this.testShifts.length)];

      assignments.push({
        workerId: randomWorker.workerId,
        shiftId: randomShift.id,
        date: date.format("YYYY-MM-DD"),
        fixed: false,
        comment: "Test assignment in next month",
      });
    }

    // Create assignments via API
    for (const assignmentData of assignments) {
      try {
        await this.dbUtils.createAssignment({
          teamId: this.testTeam.teamId,
          workerId: assignmentData.workerId,
          shiftId: assignmentData.shiftId,
          date: assignmentData.date,
          fixed: assignmentData.fixed,
          comment: assignmentData.comment,
        });
      } catch (error) {
        console.error(`Failed to create assignment:`, error);
      }
    }

    console.log(`✅ Created ${assignments.length} test assignments`);
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
      throw new Error("Test team not created. Call setupScheduleTests first.");
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
      throw new Error("Test team not created. Call setupScheduleTests first.");
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
   * Create a shift demand for testing
   */
  async createShiftDemand(options: {
    shiftId: string;
    date: dayjs.Dayjs;
    count: number;
    notes?: string;
  }): Promise<any> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupScheduleTests first.");
    }

    return await this.dbUtils.createShiftDemand({
      teamId: this.testTeam.teamId,
      shiftId: options.shiftId,
      date: options.date.toDate(),
      count: options.count,
      notes: options.notes,
      source: "manual",
    });
  }

  /**
   * Create a campaign schedule for testing
   */
  async createCampaignSchedule(
    startDate: string,
    endDate: string
  ): Promise<{ scheduleId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupScheduleTests first.");
    }

    console.log(`📅 Creating campaign schedule: ${startDate} to ${endDate}`);

    const result = await this.dbUtils.createSchedule({
      teamId: this.testTeam.teamId,
      startDate: startDate,
      endDate: endDate,
      status: "CAMPAIGN",
    });

    this.testSchedule = { scheduleId: result.scheduleId };
    return this.testSchedule;
  }

  /**
   * Navigate to schedule page for the test team
   */
  async navigateToSchedulePage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupScheduleTests first.");
    }

    // Authentication should be set before calling this (via actAsOwner or actAsMember)

    // Navigate to schedule page to establish origin
    await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);
    await page.waitForLoadState("domcontentloaded");

    // Set selected team in localStorage
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam.teamId);

    // Reload to apply localStorage changes
    await page.reload();
    await page.waitForLoadState("networkidle");

    console.log(
      `✅ Navigated to schedule page for team: ${this.testTeam.name}`
    );
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
   * Get the test schedule (if created)
   */
  getTestSchedule(): { scheduleId: string } | null {
    return this.testSchedule;
  }
}
