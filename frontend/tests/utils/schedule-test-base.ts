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
import { ScheduleT } from "../../src/types/schedule";
import {
  AssignmentT,
  AssignmentsRecurrencesResultT,
} from "../../src/types/assignment";
import { RecurrenceRuleT } from "../../src/types/recurrence";
import { SWOIdTypes } from "../../src/types/constraint";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export interface ScheduleSetupOptions {
  referenceDate: dayjs.Dayjs;
  createAssignments: boolean;
  linkMemberToWorker?: boolean; // Default true - whether to link TEST_USER_2 to a worker
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
  protected testSchedule: ScheduleT | null = null;
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
    options: ScheduleSetupOptions,
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

    // 6. Link TEST_USER_2 to first worker (if requested)
    const shouldLinkMember = options.linkMemberToWorker !== false; // Default to true
    if (shouldLinkMember) {
      await this.dbUtils.attachWorkerToUser(
        worker1.workerId,
        TEST_USER_2.user_id,
        this.testTeam.teamId,
      );
      this.memberWorker = worker1;
      console.log(`✅ Linked TEST_USER_2 to ${worker1.name}`);
    } else {
      console.log(`⏭️  Skipped linking TEST_USER_2 to worker`);
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
      shiftId: null,
      shiftOptions: [
        {
          name: morningShift.name,
          id: morningShift.id,
          idType: SWOIdTypes.SHIFT,
          isBoolDim: false,
          categoryName: "Shifts",
        },
      ],
    });
    this.testRequests.push(testRequest);
    console.log(`✅ Created test request for ${worker2.name}`);

    // 10. Create campaign schedule if dates provided (before creating assignments)
    if (options.campaignDates) {
      await this.createCampaignSchedule(
        options.campaignDates.start,
        options.campaignDates.end,
      );
      console.log(
        `✅ Created campaign schedule: ${options.campaignDates.start} to ${options.campaignDates.end}`,
      );
    }

    // 11. Create assignments if requested
    if (options.createAssignments) {
      await this.createTestAssignments(options.referenceDate);
    }
  }

  /**
   * Create test assignments for reference date and random dates in following month
   */
  private async createTestAssignments(
    referenceDate: dayjs.Dayjs,
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
      date: referenceDate,
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
        date: date,
        fixed: false,
        comment: "Test assignment in next month",
      });
    }

    // Create assignments via API
    for (const assignmentData of assignments) {
      try {
        await this.dbUtils.createAssignmentAndRecurrence({
          teamId: this.testTeam.teamId,
          workerId: assignmentData.workerId,
          shiftId: assignmentData.shiftId,
          date: assignmentData.date,
          fixed: assignmentData.fixed,
          comment: assignmentData.comment,
          scheduleId: this.testSchedule?.id ?? null,
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
   * Create an assignment for testing
   */
  async createAssignment(assignmentData: {
    workerId: string;
    shiftId: string;
    date: dayjs.Dayjs;
    fixed?: boolean;
    comment?: string;
    scheduleId?: string;
  }): Promise<AssignmentT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupScheduleTests first.");
    }

    return await this.dbUtils.createAssignmentAndRecurrence({
      teamId: this.testTeam.teamId,
      workerId: assignmentData.workerId,
      shiftId: assignmentData.shiftId,
      date: assignmentData.date,
      fixed: assignmentData.fixed ?? false,
      comment: assignmentData.comment,
      scheduleId: assignmentData.scheduleId,
    });
  }

  /**
   * Create a campaign schedule for testing
   */
  async createCampaignSchedule(
    startDate: string,
    endDate: string,
  ): Promise<ScheduleT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupScheduleTests first.");
    }

    console.log(`📅 Creating campaign schedule: ${startDate} to ${endDate}`);

    // Step 1: Create the schedule
    const schedule = await this.dbUtils.createSchedule(this.testTeam.teamId);

    // Step 2: Update with specific dates
    const updatedSchedule = await this.dbUtils.updateSchedule({
      ...schedule,
      startDate: dayjs(startDate).utc(),
      endDate: dayjs(endDate).utc(),
    });

    this.testSchedule = updatedSchedule;
    return this.testSchedule;
  }

  /**
   * Validate a schedule for testing
   */
  async validateSchedule(scheduleId: string): Promise<ScheduleT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupScheduleTests first.");
    }

    console.log(`✅ Validating schedule: ${scheduleId}`);

    const validatedSchedule = await this.dbUtils.validateSchedule(
      scheduleId,
      this.testTeam.teamId,
    );

    return validatedSchedule;
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
      `✅ Navigated to schedule page for team: ${this.testTeam.name}`,
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
  getTestSchedule(): ScheduleT | null {
    return this.testSchedule;
  }

  /**
   * Get the campaign schedule (if created)
   */
  getCampaign(): ScheduleT | null {
    return this.testSchedule;
  }

  /**
   * Get assignments for the test team
   */
  async getAssignmentsAndRecurrences(
    includeCampaign: boolean = false,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    workerId?: string,
  ): Promise<AssignmentsRecurrencesResultT> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }
    const result = await this.dbUtils.getAssignmentsAndRecurrences(
      this.testTeam.teamId,
      includeCampaign,
      startDate,
      endDate,
      workerId,
    );
    return result;
  }

  /**
   * Create an assignment with optional recurrence
   */
  async createAssignmentWithRecurrence(
    data: {
      workerId: string;
      shiftId: string;
      date: dayjs.Dayjs;
      fixed?: boolean;
      comment?: string;
      scheduleId?: string;
    },
    recurrence?: RecurrenceRuleT | null,
  ): Promise<AssignmentT> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }

    const assignment = await this.dbUtils.createAssignmentAndRecurrence(
      {
        teamId: this.testTeam.teamId,
        workerId: data.workerId,
        shiftId: data.shiftId,
        date: data.date,
        fixed: data.fixed ?? false,
        comment: data.comment,
        scheduleId: data.scheduleId,
      },
      recurrence,
    );

    console.log(
      `✅ Created assignment${recurrence ? " with recurrence" : ""} for worker ${data.workerId}`,
    );

    return assignment;
  }

  /**
   * Set mobile viewport (iPhone SE dimensions)
   */
  async setMobileViewport(page: Page): Promise<void> {
    await page.setViewportSize({ width: 375, height: 667 });
    console.log("📱 Set mobile viewport (375x667)");
  }

  /**
   * Set desktop viewport
   */
  async setDesktopViewport(page: Page): Promise<void> {
    await page.setViewportSize({ width: 1280, height: 720 });
    console.log("🖥️ Set desktop viewport (1280x720)");
  }

  /**
   * Create a worker with specific constraints for testing replacement candidates
   *
   * @param baseData - Basic worker data (name, acronym, etc.)
   * @param constraints - Specific constraint violations to set up:
   *   - notEmployed: Set employment dates to exclude test date
   *   - missingSpecialty: Don't add required specialty
   *   - onLeave: Create leave assignment on test date
   *   - hasOverlap: Create overlapping assignment
   *   - hasRequest: Create conflicting request
   */
  async createWorkerWithConstraints(
    baseData: {
      name: string;
      acronym?: string;
      weeklyHours?: number;
    },
    constraints?: {
      notEmployed?: {
        employmentStartDate?: Date;
        employmentEndDate?: Date;
      };
      missingSpecialty?: boolean;
      onLeave?: {
        leaveShiftId: string;
        date: dayjs.Dayjs;
      };
      hasOverlap?: {
        shiftId: string;
        date: dayjs.Dayjs;
      };
      hasRequest?: {
        requestType: "work_demand" | "leave";
        date: dayjs.Dayjs;
        negative?: boolean;
      };
    },
  ): Promise<{ workerId: string; name: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }

    // Create base worker
    const worker = await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: baseData.name,
      acronym: baseData.acronym,
      weeklyHours: baseData.weeklyHours ?? 40,
      weeklyHoursDesired: baseData.weeklyHours ?? 40,
      employmentStartDate: constraints?.notEmployed?.employmentStartDate,
      employmentEndDate: constraints?.notEmployed?.employmentEndDate,
    });

    // Set up leave if requested
    if (constraints?.onLeave) {
      await this.dbUtils.createAssignmentAndRecurrence({
        teamId: this.testTeam.teamId,
        workerId: worker.workerId,
        shiftId: constraints.onLeave.leaveShiftId,
        date: constraints.onLeave.date,
        fixed: false,
        comment: "Test leave for constraint violation",
      });
      console.log(`✅ Created leave assignment for ${worker.name}`);
    }

    // Set up overlapping assignment if requested
    if (constraints?.hasOverlap) {
      await this.dbUtils.createAssignmentAndRecurrence({
        teamId: this.testTeam.teamId,
        workerId: worker.workerId,
        shiftId: constraints.hasOverlap.shiftId,
        date: constraints.hasOverlap.date.toDate(),
        fixed: false,
        comment: "Test overlap assignment",
      });
      console.log(`✅ Created overlapping assignment for ${worker.name}`);
    }

    // Set up conflicting request if requested
    if (constraints?.hasRequest) {
      await this.dbUtils.createRequest({
        teamId: this.testTeam.teamId,
        workerId: worker.workerId,
        requestType: constraints.hasRequest.requestType,
        startDate: constraints.hasRequest.date,
        endDate: constraints.hasRequest.date,
        negative: constraints.hasRequest.negative ?? false,
        status: "pending",
      });
      console.log(`✅ Created conflicting request for ${worker.name}`);
    }

    return worker;
  }

  /**
   * Set the schedule view settings in localStorage for the test team
   * Only updates the provided settings, leaving others unchanged.
   * If targetDate and timeFrame are provided, calculates the appropriate periodStartDate.
   *
   * @param page - Playwright page object
   * @param options - Optional settings to update
   * @param reload - Whether to reload the page after setting (default: true)
   */
  async setScheduleViewSettings(
    page: Page,
    options?: {
      targetDate?: dayjs.Dayjs;
      timeFrame?: "week" | "month";
      groupBy?: "shift" | "worker";
      showBreaches?: boolean;
      showAssignments?: boolean;
      showDailyShiftDemands?: boolean;
      showRequests?: boolean;
      periodStartDate?: dayjs.Dayjs;
      mobileSelectedView?: "worker" | "team";
      mobileSelectedWorkerId?: string | null;
      mobileWeekStart?: string | null;
    },
    reload: boolean = true,
  ): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team must be created first");
    }

    const storageKey = `scheduleViewSettings_${this.testTeam.teamId}`;

    // Get existing settings from localStorage
    const existingSettings = await page.evaluate((key) => {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    }, storageKey);

    // Build updates object with only provided values
    const updates: any = {};

    // Handle periodStartDate calculation or direct setting
    if (options?.periodStartDate) {
      updates.periodStartDate = options.periodStartDate.utc().toISOString();
    } else if (options?.targetDate && options?.timeFrame) {
      let calculatedDate: dayjs.Dayjs;
      if (options.timeFrame === "week") {
        // Start of the week (Monday = 1)
        calculatedDate = options.targetDate.startOf("week").add(1, "day");
      } else {
        // Start of the month
        calculatedDate = options.targetDate.startOf("month");
      }
      updates.periodStartDate = calculatedDate.utc().toISOString();
    }

    // Add other optional fields
    if (options?.timeFrame !== undefined) updates.timeFrame = options.timeFrame;
    if (options?.groupBy !== undefined) updates.groupBy = options.groupBy;
    if (options?.showBreaches !== undefined)
      updates.showBreaches = options.showBreaches;
    if (options?.showAssignments !== undefined)
      updates.showAssignments = options.showAssignments;
    if (options?.showDailyShiftDemands !== undefined)
      updates.showDailyShiftDemands = options.showDailyShiftDemands;
    if (options?.showRequests !== undefined)
      updates.showRequests = options.showRequests;
    if (options?.mobileSelectedView !== undefined)
      updates.mobileSelectedView = options.mobileSelectedView;
    if (options?.mobileSelectedWorkerId !== undefined)
      updates.mobileSelectedWorkerId = options.mobileSelectedWorkerId;
    if (options?.mobileWeekStart !== undefined)
      updates.mobileWeekStart = options.mobileWeekStart;

    // Merge with existing settings
    const settings = {
      ...existingSettings,
      ...updates,
    };

    // Set in localStorage
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: storageKey, value: settings },
    );

    const logParts = ["✅ Set schedule view settings:"];
    if (updates.timeFrame) logParts.push(`${updates.timeFrame} view`);
    if (updates.periodStartDate) {
      logParts.push(
        `starting ${dayjs(updates.periodStartDate).format("YYYY-MM-DD")}`,
      );
    }
    if (Object.keys(updates).length === 0) {
      logParts.push("(no changes)");
    }
    console.log(logParts.join(" "));

    // Reload page to apply localStorage changes
    if (reload) {
      await page.reload();
      await page.waitForLoadState("networkidle");
      console.log("  ↻ Reloaded page to apply settings");
    }
  }
}
