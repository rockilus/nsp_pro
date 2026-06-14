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

import { Page } from '@playwright/test';
import { DatabaseTestUtils, TEST_USER, TEST_USER_2 } from './database-utils';
import { testConfig } from './test-config';
import { ShiftType } from '../../src/types/shift';
import { WorkerT, WeeklyPreferences } from '../../src/types/worker';
import { WeeklySlotPreference } from '../../src/types/worker';
import { ShiftT, ShiftRestType, ShiftLeaveType } from '../../src/types/shift';
import { RequestT, RequestType, RequestStatus } from '../../src/types/request';
import { ScheduleT } from '../../src/types/schedule';
import { AssignmentT, AssignmentsRecurrencesResultT } from '../../src/types/assignment';
import { RecurrenceRuleT } from '../../src/types/recurrence';
import { SWOIdTypes } from '../../src/types/constraint';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
import { ShiftDemandDTO } from '@/types/shiftDemand';
import { ConstraintT, ConstraintType, BlockT } from '../../src/types/constraint';
import { DimensionEntryType, DimensionType, DimensionT } from '../../src/types/dimension';
import { DimEntryT } from '../../src/types/dim-entry';
import { AttributeOwnerType, AttributeT } from '../../src/types/attribute';
import { AddDimensionResponse } from '../../src/app/lib/api/dimensionApi';
import { SpecialtyT } from '../../src/types/specialty';
import { ReplacementCandidateT } from '@/types/replacement';

dayjs.extend(utc);
dayjs.extend(isoWeek);

export interface ScheduleSetupOptions {
  referenceDate: dayjs.Dayjs;
  createAssignments: boolean;
  linkMemberToWorker?: boolean; // Default true - whether to link TEST_USER_2 to a worker
  createShiftDemands?: boolean; // Default false - whether to create shift demands
  createRequests?: boolean; // Default false - whether to create test requests
  numberOfWorkers?: number; // Optional: number of workers to create (minimum 2). Defaults to 2.
  campaignDates?: {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  };
  // Whether to create duty and recuperation shifts. Default: false (do not create)
  createDutyAndRecuperation?: boolean;
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
  protected testWorkers: Array<WorkerT> = [];
  protected testShifts: ShiftT[] = [];
  protected testSchedule: ScheduleT | null = null;
  protected testRequests: RequestT[] = [];
  protected memberWorker: WorkerT | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup schedule tests environment
   * Creates a test team with owner, member, workers, shifts, demands, and optionally assignments
   *
   * @param workerIndex - For unique naming (from test.info().workerIndex)
   * @param options - Configuration for test scenario. Use `options.numberOfWorkers` to set how many workers to create (minimum 2).
   */
  async setupScheduleTests(workerIndex: number, options: ScheduleSetupOptions): Promise<void> {
    // 1. Wait for API to be ready
    await this.dbUtils.waitForApiReady();

    // 2. Check health
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error('Test utilities not available');
    }

    // 3. Create test team (TEST_USER becomes owner automatically)
    const uniqueTeamName = `Schedule Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(`✅ Created test team: ${this.testTeam.name}`);

    // 4. Add TEST_USER_2 as member (do not create user - exists from global setup)
    await this.dbUtils.addSecondUserToTeam(this.testTeam.teamId, 'member');
    console.log(`✅ Added TEST_USER_2 as member to team`);

    // 5. Create test workers (minimum 2; create additional workers if requested)
    const numWorkers = Math.max(2, options.numberOfWorkers ?? 2);
    for (let i = 0; i < numWorkers; i++) {
      const worker = await this.createWorker({
        name: `Test Worker ${i + 1}`,
        acronym: `TW${i + 1}`,
        weeklyHours: 40,
      });
      this.testWorkers.push(worker);
    }
    console.log(`✅ Created ${this.testWorkers.length} test workers`);

    // 6. Link TEST_USER_2 to first worker (if requested)
    const shouldLinkMember = options.linkMemberToWorker !== false; // Default to true
    if (shouldLinkMember) {
      const firstWorker = this.testWorkers[0];
      await this.dbUtils.attachWorkerToUser(
        firstWorker.id,
        TEST_USER_2.user_id,
        this.testTeam.teamId,
      );
      this.memberWorker = firstWorker;
      console.log(`✅ Linked TEST_USER_2 to ${firstWorker.name}`);
    } else {
      console.log(`⏭️  Skipped linking TEST_USER_2 to worker`);
    }

    // 7. Create work shifts (at least 2)
    const morningShift = await this.createShift({
      name: 'Morning Shift',
      startTime: dayjs.utc().hour(8).minute(0).second(0),
      endTime: dayjs.utc().hour(14).minute(0).second(0),
      shiftType: ShiftType.NORMAL,
      acronym: 'MS',
      color: '#4CAF50',
    });
    this.testShifts.push(morningShift);

    const afternoonShift = await this.createShift({
      name: 'Afternoon Shift',
      startTime: dayjs.utc().hour(14).minute(0).second(0),
      endTime: dayjs.utc().hour(22).minute(0).second(0),
      shiftType: ShiftType.NORMAL,
      acronym: 'AS',
      color: '#2196F3',
    });
    this.testShifts.push(afternoonShift);
    console.log(`✅ Created ${this.testShifts.length} test shifts`);
    // Optionally create duty and recuperation shifts (default: skipped)
    const createDuty = options.createDutyAndRecuperation === true;
    if (createDuty) {
      const dutyShift = await this.createShift({
        name: 'Duty Shift',
        startTime: dayjs.utc().hour(8).minute(0).second(0),
        endTime: dayjs.utc().add(1, 'day').hour(8).minute(0).second(0),
        shiftType: ShiftType.DUTY,
        acronym: 'DS',
        color: '#FF5722',
        recuperationTime: 24,
      });
      this.testShifts.push(dutyShift);

      // Create recuperation shift (linked to duty shift)
      const recuperationShift = await this.createShift({
        name: 'Recuperation Shift',
        startTime: dutyShift.endTime,
        endTime: dutyShift.endTime.add(dutyShift.recuperationTime, 'hour'),
        shiftType: ShiftType.REST,
        restType: ShiftRestType.RECUPERATION,
        recuperationDutyId: dutyShift.id,
        acronym: 'RS',
        color: '#9E9E9E',
      });
      this.testShifts.push(recuperationShift);
      console.log(
        `✅ Created ${this.testShifts.length} test shifts (including duty and recuperation)`,
      );
    } else {
      console.log(`⏭️  Skipped creating duty and recuperation shifts`);
    }

    // 8. Create shift demands for reference date (if requested)
    if (options.createShiftDemands) {
      await this.dbUtils.createShiftDemand({
        teamId: this.testTeam.teamId,
        shiftId: morningShift.id,
        date: options.referenceDate,
        count: 2,
        notes: 'Test demand for morning shift',
        source: 'manual',
      });

      await this.dbUtils.createShiftDemand({
        teamId: this.testTeam.teamId,
        shiftId: afternoonShift.id,
        date: options.referenceDate,
        count: 1,
        notes: 'Test demand for afternoon shift',
        source: 'manual',
      });
      console.log(`✅ Created shift demands for reference date`);
    } else {
      console.log(`⏭️  Skipped creating shift demands`);
    }

    // 9. Create a request for a worker on reference date (if requested)
    if (options.createRequests) {
      const secondWorker = this.testWorkers[1];
      const testRequest = await this.createRequest({
        workerId: secondWorker.id,
        requestType: RequestType.WORK_DEMAND,
        startDate: options.referenceDate,
        endDate: options.referenceDate,
        status: RequestStatus.PENDING,
        negative: false,
        comment: 'Test work demand request',
        shiftId: null,
        shiftOptions: [
          {
            name: morningShift.name,
            id: morningShift.id,
            idType: SWOIdTypes.SHIFT,
            isBoolDim: false,
            categoryName: 'Shifts',
          },
        ],
      });
      this.testRequests.push(testRequest);
      console.log(`✅ Created test request for ${secondWorker.name}`);
    } else {
      console.log(`⏭️  Skipped creating test requests`);
    }

    // 10. Create campaign schedule if dates provided (before creating assignments)
    if (options.campaignDates) {
      await this.createCampaignSchedule(options.campaignDates.start, options.campaignDates.end);
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
  private async createTestAssignments(referenceDate: dayjs.Dayjs): Promise<void> {
    if (!this.testTeam || this.testWorkers.length === 0 || this.testShifts.length === 0) {
      throw new Error('Test team, workers, and shifts must be created first');
    }

    const assignments = [];

    // Create assignment for reference date
    assignments.push({
      workerId: this.testWorkers[0].id,
      shiftId: this.testShifts[0].id,
      date: referenceDate,
      fixed: false,
      comment: 'Test assignment on reference date',
    });

    // Create assignments for random dates in following month
    const nextMonth = referenceDate.add(1, 'month');
    const randomDates = [
      nextMonth.date(5),
      nextMonth.date(12),
      nextMonth.date(20),
      nextMonth.date(25),
    ];

    for (const date of randomDates) {
      const randomWorker = this.testWorkers[Math.floor(Math.random() * this.testWorkers.length)];
      const randomShift = this.testShifts[Math.floor(Math.random() * this.testShifts.length)];

      assignments.push({
        workerId: randomWorker.id,
        shiftId: randomShift.id,
        date: date,
        fixed: false,
        comment: 'Test assignment in next month',
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
  }): Promise<WorkerT> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupScheduleTests first.');
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
    leaveType?: ShiftLeaveType;
  }): Promise<ShiftT> {
    if (!this.testTeam) {
      throw new Error('Test team not created');
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
      ...(shiftData.leaveType !== undefined && {
        leaveType: shiftData.leaveType,
      }),
    });
  }

  /**
   * Update an existing shift for the test team
   */
  async updateShift(updatedShift: ShiftT): Promise<any> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    // Ensure the shift belongs to the current test team for safety
    if (updatedShift.teamId !== this.testTeam.teamId) {
      throw new Error('Shift teamId does not match the current test team');
    }

    const result = await this.dbUtils.updateShift(updatedShift);
    console.log(`✅ Updated shift ${updatedShift.id} for team ${this.testTeam.name}`);
    return result;
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
      throw new Error('Test team not created. Call setupScheduleTests first.');
    }

    return await this.dbUtils.createShiftDemand({
      teamId: this.testTeam.teamId,
      shiftId: options.shiftId,
      date: options.date,
      count: options.count,
      notes: options.notes,
      source: 'manual',
    });
  }

  /**
   * Create a request for testing
   */
  async createRequest(requestData: {
    workerId: string;
    requestType: RequestType;
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
    status?: RequestStatus;
    negative?: boolean;
    comment?: string;
    shiftId?: string | null;
    shiftOptions?: any[];
  }): Promise<RequestT> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupScheduleTests first.');
    }

    return await this.dbUtils.createRequest({
      teamId: this.testTeam.teamId,
      workerId: requestData.workerId,
      requestType: requestData.requestType,
      startDate: requestData.startDate,
      endDate: requestData.endDate,
      status: requestData.status ?? RequestStatus.PENDING,
      negative: requestData.negative ?? false,
      comment: requestData.comment,
      shiftId: requestData.shiftId ?? null,
      shiftOptions: requestData.shiftOptions,
    });
  }

  /**
   * Approve a request using DatabaseTestUtils
   */
  async approveRequest(
    requestId: string,
  ): Promise<{ request: RequestT; assignments: AssignmentT[] }> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupScheduleTests first.');
    }

    return await this.dbUtils.approveRequest(requestId, this.testTeam.teamId);
  }

  /**
   * Create a campaign schedule for testing
   */
  async createCampaignSchedule(startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): Promise<ScheduleT> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupScheduleTests first.');
    }

    console.log(`📅 Creating campaign schedule: ${startDate} to ${endDate}`);

    // Step 1: Create the schedule
    const schedule = await this.dbUtils.createSchedule(this.testTeam.teamId);

    // Step 2: Update with specific dates
    const updatedSchedule = await this.dbUtils.updateSchedule({
      ...schedule,
      startDate: startDate,
      endDate: endDate,
    });

    this.testSchedule = updatedSchedule;
    return this.testSchedule;
  }

  /**
   * Validate a schedule for testing
   */
  async validateSchedule(scheduleId: string): Promise<ScheduleT> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupScheduleTests first.');
    }

    console.log(`✅ Validating schedule: ${scheduleId}`);

    const validatedSchedule = await this.dbUtils.validateSchedule(scheduleId, this.testTeam.teamId);

    return validatedSchedule;
  }

  /**
   * Navigate to schedule page for the test team
   */
  async navigateToSchedulePage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error('Test team not created. Call setupScheduleTests first.');
    }

    // Authentication should be set before calling this (via actAsOwner or actAsMember)

    // Navigate to schedule page to establish origin
    await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);
    await page.waitForLoadState('domcontentloaded');

    // Set selected team in localStorage
    await page.evaluate((teamId) => {
      localStorage.setItem('selectedTeamId', teamId);
    }, this.testTeam.teamId);

    // Reload to apply localStorage changes
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log(`✅ Navigated to schedule page for team: ${this.testTeam.name}`);
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
  getTestWorkers(): Array<WorkerT> {
    return this.testWorkers;
  }

  /**
   * Get the created test shifts
   */
  getTestShifts(): ShiftT[] {
    return this.testShifts;
  }

  /**
   * Fetch all shifts for the test team using DatabaseTestUtils
   */
  async getAllShifts(): Promise<ShiftT[]> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    return await this.dbUtils.getAllShifts(this.testTeam.teamId);
  }

  /**
   * Get the member worker (worker linked to TEST_USER_2)
   */
  getMemberWorker(): WorkerT | null {
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
   * Get all schedules for the test team using DatabaseTestUtils
   */
  async getSchedules(): Promise<ScheduleT[]> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    return await this.dbUtils.getSchedules(this.testTeam.teamId);
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
      throw new Error('Test team not initialized');
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
  async createAssignmentAndRecurrence(
    data: {
      workerId: string;
      shiftId: string;
      date: dayjs.Dayjs;
      fixed?: boolean;
      comment?: string;
      scheduleId?: string;
    },
    recurrence?: RecurrenceRuleT | null,
  ): Promise<AssignmentsRecurrencesResultT> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    const result = await this.dbUtils.createAssignmentAndRecurrence(
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
      `✅ Created assignment${recurrence ? ' with recurrence' : ''} for worker ${data.workerId}`,
    );

    return result;
  }

  /**
   * Delete an assignment by ID
   */
  async deleteAssignment(assignmentId: string): Promise<AssignmentsRecurrencesResultT> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }
    return await this.dbUtils.deleteAssignment(assignmentId, this.testTeam.teamId);
  }

  /**
   * Set mobile viewport (iPhone SE dimensions)
   */
  async setMobileViewport(page: Page): Promise<void> {
    await page.setViewportSize({ width: 375, height: 667 });
    console.log('📱 Set mobile viewport (375x667)');
  }

  /**
   * Set desktop viewport
   */
  async setDesktopViewport(page: Page): Promise<void> {
    await page.setViewportSize({ width: 1280, height: 720 });
    console.log('🖥️ Set desktop viewport (1280x720)');
  }

  /**
   * Get shift demands by period for the test team
   */
  async getShiftDemandsByPeriod(
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
  ): Promise<ShiftDemandDTO[]> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }
    return await this.dbUtils.getShiftDemandsByPeriod(this.testTeam.teamId, startDate, endDate);
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
      timeFrame?: 'week' | 'month';
      groupBy?: 'shift' | 'worker';
      showBreaches?: boolean;
      showAssignments?: boolean;
      showDailyShiftDemands?: boolean;
      showRequests?: boolean;
      showWorkerPreferences?: boolean;
      periodStartDate?: dayjs.Dayjs;
      mobileSelectedView?: 'worker' | 'team';
      mobileSelectedWorkerId?: string | null;
      mobileWeekStart?: string | null;
    },
    reload: boolean = true,
  ): Promise<void> {
    if (!this.testTeam) {
      throw new Error('Test team must be created first');
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
      if (options.timeFrame === 'week') {
        // Start of the week (Monday). day(): Sunday=0, Monday=1, ...
        const dow = options.targetDate.day();
        const daysToSubtract = (dow + 6) % 7; // 0 for Monday, 6 for Sunday
        calculatedDate = options.targetDate.startOf('day').subtract(daysToSubtract, 'day');
      } else {
        // Start of the month
        calculatedDate = options.targetDate.startOf('month');
      }
      updates.periodStartDate = calculatedDate.utc().toISOString();
    }

    // Add other optional fields
    if (options?.timeFrame !== undefined) updates.timeFrame = options.timeFrame;
    if (options?.groupBy !== undefined) updates.groupBy = options.groupBy;
    if (options?.showBreaches !== undefined) updates.showBreaches = options.showBreaches;
    if (options?.showAssignments !== undefined) updates.showAssignments = options.showAssignments;
    if (options?.showDailyShiftDemands !== undefined)
      updates.showDailyShiftDemands = options.showDailyShiftDemands;
    if (options?.showRequests !== undefined) updates.showRequests = options.showRequests;
    if (options?.showWorkerPreferences !== undefined)
      updates.showWorkerPreferences = options.showWorkerPreferences;
    if (options?.mobileSelectedView !== undefined)
      updates.mobileSelectedView = options.mobileSelectedView;
    if (options?.mobileSelectedWorkerId !== undefined)
      updates.mobileSelectedWorkerId = options.mobileSelectedWorkerId;
    if (options?.mobileWeekStart !== undefined) updates.mobileWeekStart = options.mobileWeekStart;

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

    const logParts = ['✅ Set schedule view settings:'];
    if (updates.timeFrame) logParts.push(`${updates.timeFrame} view`);
    if (updates.periodStartDate) {
      logParts.push(`starting ${dayjs(updates.periodStartDate).format('YYYY-MM-DD')}`);
    }
    if (Object.keys(updates).length === 0) {
      logParts.push('(no changes)');
    }
    console.log(logParts.join(' '));

    // Reload page to apply localStorage changes
    if (reload) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ↻ Reloaded page to apply settings');
    }
  }

  /**
   * Create constraint
   */
  async createConstraint(constraintData: {
    constraintType: ConstraintType;
    templateId: string;
    language: string;
    blocks: BlockT[];
    text: string;
    hard: boolean;
    priority: string;
    active: boolean;
  }): Promise<ConstraintT> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }
    return await this.dbUtils.createConstraint({
      ...constraintData,
      teamId: this.testTeam.teamId,
    });
  }

  /**
   * Create a dimension for the test team using DatabaseTestUtils
   */
  async createDimension(dimensionData: {
    name: string;
    entryType: DimensionEntryType;
    dimensionType: DimensionType[];
    dimEntries?: DimEntryT[];
  }): Promise<AddDimensionResponse> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    return await this.dbUtils.createDimension({
      teamId: this.testTeam.teamId,
      name: dimensionData.name,
      entryType: dimensionData.entryType,
      dimensionType: dimensionData.dimensionType,
      dimEntries: dimensionData.dimEntries ?? [],
    });
  }

  /**
   * Create an attribute for the test team using DatabaseTestUtils
   */
  async createAttribute(attributeData: {
    value: string | number | boolean;
    ownerType: AttributeOwnerType;
    ownerId: string;
    dimensionId: string;
    dimEntryIds?: string[];
  }): Promise<AttributeT> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    return await this.dbUtils.createAttribute({
      teamId: this.testTeam.teamId,
      value: attributeData.value,
      ownerType: attributeData.ownerType,
      ownerId: attributeData.ownerId,
      dimensionId: attributeData.dimensionId,
      dimEntryIds: attributeData.dimEntryIds,
    });
  }

  /**
   * Create a specialty for the test team using DatabaseTestUtils
   */
  async createSpecialty(specialtyData: { name: string }): Promise<SpecialtyT> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    return await this.dbUtils.createSpecialty({
      teamId: this.testTeam.teamId,
      name: specialtyData.name,
    });
  }

  /**
   * Update a worker for the test team using DatabaseTestUtils
   */
  async updateWorker(
    workerId: string,
    updates: {
      name?: string;
      acronym?: string;
      employmentStartDate?: dayjs.Dayjs;
      employmentEndDate?: dayjs.Dayjs | null;
      weeklyHours?: number;
      weeklyHoursDesired?: number;
      dutiesPerMonth?: number;
      annualLeave?: number;
      specialtyIds?: string[];
      weeklyPreferences?: WeeklyPreferences;
    },
  ): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    return await this.dbUtils.updateWorker(workerId, this.testTeam.teamId, updates);
  }

  /**
   * Set weekly preferences on a worker via the API.
   * Accepts an array of WeeklySlotPreference slots and enables preferences.
   */
  async setWorkerWeeklyPreferences(workerId: string, slots: WeeklySlotPreference[]): Promise<void> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    await this.dbUtils.updateWorker(workerId, this.testTeam.teamId, {
      weeklyPreferences: {
        enabled: true,
        slots,
      },
    });

    console.log(`✅ Set ${slots.length} weekly preference slots on worker ${workerId}`);
  }

  /**
   * Clear weekly preferences on a worker.
   */
  async clearWorkerWeeklyPreferences(workerId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }

    await this.dbUtils.updateWorker(workerId, this.testTeam.teamId, {
      weeklyPreferences: {
        enabled: false,
        slots: [],
      },
    });

    console.log(`✅ Cleared weekly preferences on worker ${workerId}`);
  }

  /**
   * Get replacement candidates for an assignment using DatabaseTestUtils
   */
  async getReplacementCandidates(assignmentId: string): Promise<ReplacementCandidateT[]> {
    if (!this.testTeam) {
      throw new Error('Test team not initialized');
    }
    return await this.dbUtils.getReplacementCandidates(assignmentId, this.testTeam.teamId);
  }

  /**
   * Build the complete set of expected preference data-testid strings for a
   * worker given their WeeklySlotPreference slots and the visible period.
   *
   * Uses the same ISO weekday (0=Mon..6=Sun) and ISO week parity conventions
   * as the production preference expansion logic.
   */
  static buildExpectedPreferenceTestIds(
    workerId: string,
    slots: WeeklySlotPreference[],
    periodStart: dayjs.Dayjs,
    periodEnd: dayjs.Dayjs,
  ): string[] {
    const testIds: string[] = [];
    let current = periodStart.clone();
    while (current.isBefore(periodEnd) || current.isSame(periodEnd, 'day')) {
      const isoDow = (current.day() + 6) % 7;
      const isoWeekNum = current.isoWeek();
      const parity = isoWeekNum % 2 === 0 ? 'even' : 'odd';
      const dateStr = current.format('YYYY-MM-DD');

      for (const slot of slots) {
        if (
          slot.dayOfWeek === isoDow &&
          (slot.weekParity === 'all' || slot.weekParity === parity)
        ) {
          testIds.push(
            `preference-cell-${workerId}-${dateStr}-${slot.slot}-${slot.restriction}-${slot.weekParity}`,
          );
        }
      }
      current = current.add(1, 'day');
    }
    return testIds;
  }

  /**
   * Build a single preference cell data-testid string for a specific date.
   * Useful for constructing non-matching testids in negative assertions.
   */
  static buildPreferenceTestId(
    workerId: string,
    date: string,
    slot: string,
    restriction: string,
    weekParity: string,
  ): string {
    return `preference-cell-${workerId}-${date}-${slot}-${restriction}-${weekParity}`;
  }
}
