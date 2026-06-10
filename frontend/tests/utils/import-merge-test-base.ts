/**
 * Import Merge Test Base Utilities
 *
 * Provides isolated test data setup for import + merge E2E tests.
 * Follows the same pattern as ScheduleTestBase: each test gets its own
 * team, workers, shifts, and import record. No DB reset between tests.
 */

import { Page } from '@playwright/test';
import { DatabaseTestUtils, TEST_USER } from './database-utils';
import { testConfig } from './test-config';
import { WorkerT } from '../../src/types/worker';
import { ShiftT, ShiftType } from '../../src/types/shift';
import { RequestT, RequestType, RequestStatus } from '../../src/types/request';
import { AssignmentT } from '../../src/types/assignment';
import type {
  MergeTargetsResponse,
  MergeRequest,
  MergeResult,
} from '../../src/app/lib/import-merge-utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { buildImportExcel, writeExcelToTempFile } from '../fixtures/import-fixture';
import type { TeamSnapshot } from './merge-verification';

dayjs.extend(utc);

export interface ImportMergeTestTeam {
  teamId: string;
  name: string;
}

/**
 * Preview data that mirrors the Excel fixture from import-fixture.ts.
 * Used by createImportViaApi() to bypass the upload step in merge-focused tests.
 */
export interface ImportPreviewData {
  members: Array<{
    generatedId: string;
    name: string;
    acronym: string;
    acronymCustom: boolean;
    employmentStartDate: number;
    employmentEndDate: number | null;
    weeklyHours: number;
    weeklyHoursDesired: number;
    dutiesPerMonth: number;
    annualLeave: number;
    specialtyIds: string[];
    warnings: string[];
    defaultedFields: string[];
  }>;
  shifts: Array<{
    generatedId: string;
    name: string;
    acronym: string;
    acronymCustom: boolean;
    startTime: number;
    endTime: number;
    staffing: unknown[];
    color: string;
    shiftType: number;
    restType: number;
    leaveType: number;
    recuperationTime: number;
    recuperationDutyId: string | null;
    duty: boolean;
    mandatoryRest: boolean;
    warnings: string[];
    defaultedFields: string[];
  }>;
  requests: Array<{
    generatedId: string;
    workerName: string;
    workerId: string;
    requestType: string;
    startDate: number;
    endDate: number;
    shiftCode: string;
    status: string;
    fulfillment: string;
    warnings: string[];
    defaultedFields: string[];
  }>;
  assignments: Array<{
    generatedId: string;
    workerName: string;
    workerId: string;
    date: number;
    shiftCode: string;
    shiftId: string;
    fixed: boolean;
    source: string;
    warnings: string[];
  }>;
}

export class ImportMergeTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: ImportMergeTestTeam | null = null;
  protected existingWorkers: WorkerT[] = [];
  protected existingShifts: ShiftT[] = [];
  protected importRecordId: string | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup isolated test environment:
   * - Creates a uniquely-named team
   * - Creates 2 existing workers (Alice Worker AL, Dave Worker DV)
   * - Creates 1 existing shift (Morning Shift MS)
   *
   * Alice Worker matches the imported "Alice" by name for merge-into testing.
   * Morning Shift matches the imported "Morning" by acronym (MS).
   */
  async setup(workerIndex: number): Promise<void> {
    await this.dbUtils.waitForApiReady();

    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error('Test utilities not available');
    }

    // Create unique team
    const uniqueName = `Import Merge Test ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueName });
    console.log(`[ImportMergeTestBase] Team: ${this.testTeam.name}`);

    // Create Alice Worker — will match imported "Alice" by name
    const alice = await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: 'Alice Worker',
      acronym: 'AL',
      weeklyHours: 35,
      weeklyHoursDesired: 35,
      dutiesPerMonth: 2,
      annualLeave: 15,
    });
    this.existingWorkers.push(alice);

    // Create Dave Worker — no import match (different name)
    const dave = await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: 'Dave Worker',
      acronym: 'DV',
      weeklyHours: 40,
    });
    this.existingWorkers.push(dave);

    // Create Morning Shift — will match imported "Morning" by acronym MS
    const morningShift = await this.dbUtils.createShift({
      teamId: this.testTeam.teamId,
      name: 'Morning Shift',
      startTime: dayjs.utc().hour(6).minute(0).second(0),
      endTime: dayjs.utc().hour(14).minute(0).second(0),
      shiftType: ShiftType.NORMAL,
      acronym: 'MS',
      color: '#4CAF50',
    });
    this.existingShifts.push(morningShift);

    console.log(
      `[ImportMergeTestBase] Created ${this.existingWorkers.length} workers, ${this.existingShifts.length} shifts`,
    );
  }

  // ── Auth ───────────────────────────────────────────────────────────────

  async actAsAdmin(page: Page): Promise<void> {
    await this.dbUtils.authenticatePageAsTestUser(page);
  }

  // ── Import creation ────────────────────────────────────────────────────

  /**
   * Create an import record via the API (bypassing the Excel upload UI).
   * Uses preview data that mirrors the Excel fixture.
   */
  async createImportViaApi(): Promise<string> {
    const previewData = this._buildPreviewData();

    const result = await this.dbUtils.makeAuthenticatedRequest<{ id: string }>(
      'POST',
      '/admin/imports',
      {
        name: `E2E Import ${Date.now()}`,
        filename: 'e2e-test.xlsx',
        teamId: null,
        previewData,
      },
    );

    this.importRecordId = result.id;
    console.log(`[ImportMergeTestBase] Created import: ${result.id}`);
    return result.id;
  }

  /**
   * Upload the Excel fixture via the UI and create an import record.
   * Use in the preview-specific test to verify the upload flow.
   */
  async createImportViaUpload(page: Page): Promise<string> {
    if (!this.testTeam) throw new Error('Call setup() first');

    const buf = buildImportExcel(10);
    const filePath = writeExcelToTempFile(buf);

    await page.goto(`${testConfig.frontendUrl}/en/admin/import`);
    await page.waitForLoadState('domcontentloaded');

    // Open create dialog
    const createBtn = page.locator('button:has-text("Create Import")');
    await createBtn.click();

    // Upload file
    const fileInput = page.locator('[data-testid="import-file-input"]');
    await fileInput.setInputFiles(filePath);

    // Click "Upload & Preview"
    const uploadBtn = page.locator('[data-testid="import-upload-btn"]');
    await uploadBtn.click();

    // Wait for preview to load
    await page.waitForSelector('[data-testid="import-preview-summary"]');

    // Click "Create & Open"
    const createImportBtn = page.locator('[data-testid="import-create-btn"]');
    await createImportBtn.click();

    // Wait for navigation to editor
    await page.waitForURL(/\/admin\/import\/editor\?id=/);
    const url = new URL(page.url());
    const importId = url.searchParams.get('id');
    if (!importId) throw new Error('No import ID in URL after creation');

    this.importRecordId = importId;
    console.log(`[ImportMergeTestBase] Created import via UI: ${importId}`);
    return importId;
  }

  // ── DB verification helpers ─────────────────────────────────────────────

  async getWorkersInDb(): Promise<WorkerT[]> {
    if (!this.testTeam) throw new Error('Call setup() first');
    return this.dbUtils.makeAuthenticatedRequest<WorkerT[]>(
      'GET',
      `/workers/teams/${this.testTeam.teamId}`,
    );
  }

  async getShiftsInDb(): Promise<ShiftT[]> {
    if (!this.testTeam) throw new Error('Call setup() first');
    return this.dbUtils.makeAuthenticatedRequest<ShiftT[]>(
      'GET',
      `/shifts/teams/${this.testTeam.teamId}`,
    );
  }

  async getWorkerByName(name: string): Promise<WorkerT | undefined> {
    const workers = await this.getWorkersInDb();
    return workers.find((w) => w.name === name);
  }

  async getShiftByAcronym(acronym: string): Promise<ShiftT | undefined> {
    const shifts = await this.getShiftsInDb();
    return shifts.find((s) => s.acronym === acronym);
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  getTestTeam(): ImportMergeTestTeam | null {
    return this.testTeam;
  }

  getExistingWorkers(): WorkerT[] {
    return this.existingWorkers;
  }

  getExistingShifts(): ShiftT[] {
    return this.existingShifts;
  }

  getImportRecordId(): string | null {
    return this.importRecordId;
  }

  // ── Merge API helpers ──────────────────────────────────────────────────

  /**
   * Fetch merge targets (existing team workers/shifts + auto-match suggestions)
   * via GET /admin/teams/{team_id}/merge-targets?import_id=...
   */
  async getTargetsViaApi(): Promise<MergeTargetsResponse> {
    if (!this.testTeam || !this.importRecordId)
      throw new Error('Call setup() and createImportViaApi() first');
    return this.dbUtils.makeAuthenticatedRequest<MergeTargetsResponse>(
      'GET',
      `/admin/teams/${this.testTeam.teamId}/merge-targets?import_id=${this.importRecordId}`,
    );
  }

  /**
   * Execute a merge via POST /admin/imports/{import_id}/merge
   */
  async executeMergeViaApi(mergeReq: MergeRequest): Promise<MergeResult> {
    if (!this.importRecordId) throw new Error('Call createImportViaApi() first');
    return this.dbUtils.makeAuthenticatedRequest<MergeResult>(
      'POST',
      `/admin/imports/${this.importRecordId}/merge`,
      mergeReq,
    );
  }

  /**
   * Fetch assignments in the target team for a given date range.
   */
  async getAssignmentsInDb(
    startDate: number,
    endDate: number,
  ): Promise<{
    assignmentsRead: AssignmentT[];
  }> {
    if (!this.testTeam) throw new Error('Call setup() first');
    return this.dbUtils.makeAuthenticatedRequest<{
      assignmentsRead: AssignmentT[];
    }>(
      'GET',
      `/assignments/teams/${this.testTeam.teamId}?start_date=${startDate}&end_date=${endDate}`,
    );
  }

  /**
   * Fetch requests in the target team.
   */
  async getRequestsInDb(): Promise<RequestT[]> {
    if (!this.testTeam) throw new Error('Call setup() first');
    return this.dbUtils.makeAuthenticatedRequest<RequestT[]>(
      'GET',
      `/requests/teams/${this.testTeam.teamId}`,
    );
  }

  // ── Snapshot helpers ────────────────────────────────────────────────────

  /**
   * Get the full month date range (Unix timestamps) covering the first to
   * last day of the current month in UTC.
   */
  getFullMonthRange(): { start: number; end: number } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = Date.UTC(year, month, 1) / 1000;
    const lastDay = new Date(year, month + 1, 0);
    const end = Date.UTC(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()) / 1000;
    return { start, end };
  }

  /**
   * Capture a full snapshot of the target team's DB state (workers, shifts,
   * requests, assignments).  Used for before/after merge verification.
   */
  async captureTeamSnapshot(): Promise<TeamSnapshot> {
    const fullMonth = this.getFullMonthRange();
    const [workers, shifts, requests, assignmentsResp] = await Promise.all([
      this.getWorkersInDb(),
      this.getShiftsInDb(),
      this.getRequestsInDb(),
      this.getAssignmentsInDb(fullMonth.start, fullMonth.end),
    ]);

    return {
      workers,
      shifts,
      requests,
      assignments: assignmentsResp.assignmentsRead ?? [],
      workerIds: new Set(workers.map((w) => w.id)),
      shiftIds: new Set(shifts.map((s) => s.id)),
      requestIds: new Set(requests.map((r) => r.id)),
    };
  }

  /**
   * Expose the preview data used to create the import record.  The
   * verification helper needs this to resolve expected assignment keys.
   */
  getPreviewData(): ImportPreviewData {
    return this._buildPreviewData();
  }

  // ── Merge request builder ───────────────────────────────────────────────

  /**
   * Build the standard merge request mapping for the Bob test scenario:
   * - Alice → merge_into (Alice Worker)
   * - Bob → add_new
   * - Charlie → skip
   * - Morning → merge_into (Morning Shift)
   * - Night → add_new
   * - Alice's leave request → add_new
   */
  async buildMergeRequest(): Promise<MergeRequest> {
    if (!this.testTeam) throw new Error('Call setup() first');
    const targets = await this.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTargetId = targets.shifts.find((s) => s.acronym === 'MS')?.id;

    return {
      teamId: this.testTeam.teamId,
      workerMappings: [
        {
          generatedId: 'gen-alice',
          action: 'merge_into',
          targetWorkerId: aliceTargetId ?? null,
        },
        { generatedId: 'gen-bob', action: 'add_new', targetWorkerId: null },
        { generatedId: 'gen-charlie', action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        {
          generatedId: 'gen-morning',
          action: 'merge_into',
          targetShiftId: morningTargetId ?? null,
        },
        { generatedId: 'gen-night', action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: 'gen-req-alice-leave', action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };
  }

  // ── Preview data builder ────────────────────────────────────────────────

  /**
   * Build preview data that matches the Excel fixture from import-fixture.ts.
   *
   * 3 workers: Alice (AL), Bob (BO), Charlie (CH)
   * 2 shifts: Morning (MS, 08:00-16:00), Night (NS, 20:00-08:00)
   * 4 assignments + 1 leave request
   */
  private _buildPreviewData(): ImportPreviewData {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Spread assignments across 3 months so the schedule grid has navigable months
    // prevMonth: assignments in the previous month
    // currMonth: assignments in the current month
    // nextMonth: assignments in the next month
    const currDay1 = Date.UTC(year, month, 1) / 1000;
    const currDay2 = Date.UTC(year, month, 2) / 1000;
    const currDay5 = Date.UTC(year, month, 5) / 1000;
    const currDay7 = Date.UTC(year, month, 7) / 1000;
    const prevDay = Date.UTC(year, month - 1, 15) / 1000;
    const nextDay = Date.UTC(year, month + 1, 10) / 1000;

    const startDate = currDay1;

    const aliceId = 'gen-alice';
    const bobId = 'gen-bob';
    const charlieId = 'gen-charlie';
    const morningId = 'gen-morning';
    const nightId = 'gen-night';

    return {
      members: [
        {
          generatedId: aliceId,
          name: 'Alice',
          acronym: 'AL',
          acronymCustom: true,
          employmentStartDate: startDate,
          employmentEndDate: null,
          weeklyHours: 40,
          weeklyHoursDesired: 40,
          dutiesPerMonth: 4,
          annualLeave: 20,
          specialtyIds: [],
          warnings: [],
          defaultedFields: [],
        },
        {
          generatedId: bobId,
          name: 'Bob',
          acronym: 'BO',
          acronymCustom: true,
          employmentStartDate: startDate,
          employmentEndDate: null,
          weeklyHours: 35,
          weeklyHoursDesired: 35,
          dutiesPerMonth: 3,
          annualLeave: 25,
          specialtyIds: [],
          warnings: [],
          defaultedFields: [],
        },
        {
          generatedId: charlieId,
          name: 'Charlie',
          acronym: 'CH',
          acronymCustom: true,
          employmentStartDate: startDate,
          employmentEndDate: null,
          weeklyHours: 40,
          weeklyHoursDesired: 40,
          dutiesPerMonth: 4,
          annualLeave: 20,
          specialtyIds: [],
          warnings: [],
          defaultedFields: [],
        },
      ],
      shifts: [
        {
          generatedId: morningId,
          name: 'Morning',
          acronym: 'MS',
          acronymCustom: true,
          startTime: 8 * 60, // 08:00
          endTime: 16 * 60, // 16:00
          staffing: [],
          color: '#4CAF50',
          shiftType: 0,
          restType: 0,
          leaveType: 0,
          recuperationTime: 0,
          recuperationDutyId: null,
          duty: false,
          mandatoryRest: false,
          warnings: [],
          defaultedFields: [],
        },
        {
          generatedId: nightId,
          name: 'Night',
          acronym: 'NS',
          acronymCustom: true,
          startTime: 20 * 60, // 20:00
          endTime: 8 * 60, // 08:00 next day
          staffing: [],
          color: '#2196F3',
          shiftType: 0,
          restType: 0,
          leaveType: 0,
          recuperationTime: 0,
          recuperationDutyId: null,
          duty: false,
          mandatoryRest: false,
          warnings: [],
          defaultedFields: [],
        },
      ],
      requests: [
        {
          generatedId: 'gen-req-alice-leave',
          workerName: 'Alice',
          workerId: aliceId,
          requestType: 'leave',
          startDate: currDay7,
          endDate: currDay7,
          shiftCode: 'leave',
          status: 'approved',
          fulfillment: 'fulfilled',
          warnings: [],
          defaultedFields: [],
        },
      ],
      assignments: [
        // Previous month: 1 assignment so prev-month navigation is available
        {
          generatedId: 'gen-asgn-prev',
          workerName: 'Alice',
          workerId: aliceId,
          date: prevDay,
          shiftCode: 'MS',
          shiftId: morningId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        // Current month: core assignments
        {
          generatedId: 'gen-asgn-1',
          workerName: 'Alice',
          workerId: aliceId,
          date: currDay1,
          shiftCode: 'MS',
          shiftId: morningId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        {
          generatedId: 'gen-asgn-2',
          workerName: 'Bob',
          workerId: bobId,
          date: currDay1,
          shiftCode: 'MS',
          shiftId: morningId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        {
          generatedId: 'gen-asgn-3',
          workerName: 'Alice',
          workerId: aliceId,
          date: currDay2,
          shiftCode: 'NS',
          shiftId: nightId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        {
          generatedId: 'gen-asgn-4',
          workerName: 'Charlie',
          workerId: charlieId,
          date: currDay2,
          shiftCode: 'MS',
          shiftId: morningId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        {
          generatedId: 'gen-asgn-5',
          workerName: 'Bob',
          workerId: bobId,
          date: currDay5,
          shiftCode: 'NS',
          shiftId: nightId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        {
          generatedId: 'gen-asgn-6',
          workerName: 'Charlie',
          workerId: charlieId,
          date: currDay5,
          shiftCode: 'NS',
          shiftId: nightId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        // Next month: 1 assignment so next-month navigation is available
        {
          generatedId: 'gen-asgn-night-prev',
          workerName: 'Bob',
          workerId: bobId,
          date: prevDay,
          shiftCode: 'NS',
          shiftId: nightId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
        {
          generatedId: 'gen-asgn-next',
          workerName: 'Bob',
          workerId: bobId,
          date: nextDay,
          shiftCode: 'MS',
          shiftId: morningId,
          fixed: false,
          source: 'manual',
          warnings: [],
        },
      ],
    };
  }
}
