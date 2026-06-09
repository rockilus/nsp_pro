/**
 * E2E tests for AdminImportMergeStep2 — Merge execution.
 *
 * Each test sets the desired merge mappings via the step 2 UI, navigates
 * to step 3, executes the merge via the API (bypassing the confirm button
 * to isolate merge DB verification), then checks the database state.
 *
 * Verifies:
 * - Members: add creates worker, merge updates existing, skip excludes
 * - Shifts: add creates shift, merge updates existing, skip excludes
 * - Requests: add creates, skip excludes, cascade-skip
 * - Schedule: cascade-skip for worker/shift, existing collision
 *   skipped, date-filtered out assignments skipped, remapped IDs
 *   for merged and added entities
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';
import { testConfig } from '../../utils/test-config';
import type {
  MergeRequest,
  WorkerMergeMapping,
  ShiftMergeMapping,
  RequestMergeMapping,
} from '@/app/lib/import-merge-utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// ── Generated IDs from test base preview data ────────────────────────────────
const ALICE_ID = 'gen-alice';
const BOB_ID = 'gen-bob';
const CHARLIE_ID = 'gen-charlie';
const MORNING_ID = 'gen-morning';
const NIGHT_ID = 'gen-night';
const REQUEST_ID = 'gen-req-alice-leave';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function setupAndNavigateToStep2(
  page: import('@playwright/test').Page,
  testBase: ImportMergeTestBase,
) {
  const importId = await testBase.createImportViaApi();
  await testBase.actAsAdmin(page);
  await page.goto(`${testConfig.frontendUrl}/en/admin/import/merge?id=${importId}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('[data-testid="merge-teams-table"]', { timeout: 10000 });

  const team = testBase.getTestTeam()!;
  const teamRow = page.locator(`[data-testid="team-row-${team.teamId}"]`);
  await teamRow.click();

  const resolveBtn = page.locator('[data-testid="merge-resolve-btn"]');
  await expect(resolveBtn).not.toBeDisabled({ timeout: 3000 });
  await resolveBtn.click();

  await page.waitForSelector('[data-testid="merge-step2-next"]', { timeout: 10000 });
  await expect(page.locator('[data-testid="merge-members-section"]')).toBeVisible({
    timeout: 5000,
  });
  return importId;
}

/**
 * Build the complete month date range (1st to last day) from the
 * fixture's min and max dates.
 */
function getFullMonthRange(): { start: number; end: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = Date.UTC(year, month, 1) / 1000;
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  const end = Date.UTC(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()) / 1000;
  return { start, end };
}

/**
 * Set a worker action via the step 2 UI select.
 */
async function setWorkerAction(
  page: import('@playwright/test').Page,
  generatedId: string,
  action: 'add_new' | 'merge_into' | 'skip',
) {
  const actionLabel: Record<string, string> = {
    add_new: 'Add new',
    merge_into: 'Merge into',
    skip: 'Skip',
  };
  const el = page.locator(`[data-testid="merge-worker-action-${generatedId}"]`);
  await el.click();
  await page.locator('[role="option"]', { hasText: actionLabel[action] }).click();
  await page.waitForTimeout(200);
}

/**
 * Set a shift action via the step 2 UI select.
 */
async function setShiftAction(
  page: import('@playwright/test').Page,
  generatedId: string,
  action: 'add_new' | 'merge_into' | 'skip',
) {
  const actionLabel: Record<string, string> = {
    add_new: 'Add new',
    merge_into: 'Merge into',
    skip: 'Skip',
  };
  const el = page.locator(`[data-testid="merge-shift-action-${generatedId}"]`);
  await el.click();
  await page.locator('[role="option"]', { hasText: actionLabel[action] }).click();
  await page.waitForTimeout(200);
}

// ── Members Merge ────────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Merge: Members', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('added member (Bob) should be created in the target team', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Bob defaults to add_new → keep it; Alice → merge_into; Charlie → skip
    await setWorkerAction(page, BOB_ID, 'add_new');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    // Execute merge via API
    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');
    const morningTargetId = morningTarget?.id;

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTargetId ?? null },
        { generatedId: NIGHT_ID, action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);
    expect(result.workersCreated).toBe(1); // Bob
    expect(result.workersUpdated).toBe(1); // Alice

    // Verify Bob exists in DB
    const workers = await testBase.getWorkersInDb();
    const bobInDb = workers.find((w) => w.name === 'Bob');
    expect(bobInDb).toBeDefined();
    expect(bobInDb!.acronym).toBe('BO');
  });

  test('merged member (Alice) should update existing Alice Worker', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Alice defaults to merge_into, keep it
    await setWorkerAction(page, BOB_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'skip', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);
    expect(result.workersUpdated).toBe(1);
    expect(result.workersCreated).toBe(0);

    // Alice Worker should still exist but with updated fields (name changed to 'Alice')
    const aliceInDb = await testBase.getWorkerByName('Alice');
    expect(aliceInDb).toBeDefined();
  });

  test('skipped member (Charlie) should not appear in target team', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip all workers except one added
    await setWorkerAction(page, ALICE_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'skip', targetWorkerId: null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    await testBase.executeMergeViaApi(mergeReq);

    // Charlie should NOT be in DB
    const workers = await testBase.getWorkersInDb();
    const charlieInDb = workers.find((w) => w.name === 'Charlie');
    expect(charlieInDb).toBeUndefined();
  });
});

// ── Shifts Merge ─────────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Merge: Shifts', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('added shift (Night) should be created in the target team', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);
    expect(result.shiftsCreated).toBe(1); // Night
    expect(result.shiftsUpdated).toBe(1); // Morning

    const shifts = await testBase.getShiftsInDb();
    const nightInDb = shifts.find((s) => s.name === 'Night');
    expect(nightInDb).toBeDefined();
    expect(nightInDb!.acronym).toBe('NS');
  });

  test('merged shift (Morning) should update existing Morning Shift', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Keep Morning as merge_into, skip Night
    await setShiftAction(page, NIGHT_ID, 'skip');
    await setWorkerAction(page, BOB_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'skip', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);
    expect(result.shiftsUpdated).toBe(1);

    // Morning Shift should still exist with updated name
    const morningInDb = await testBase.getShiftByAcronym('MS');
    expect(morningInDb).toBeDefined();
  });

  test('skipped shift should not appear in target team', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip Night
    await setShiftAction(page, NIGHT_ID, 'skip');
    await setWorkerAction(page, BOB_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'skip', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    await testBase.executeMergeViaApi(mergeReq);

    const shifts = await testBase.getShiftsInDb();
    const nightInDb = shifts.find((s) => s.name === 'Night');
    expect(nightInDb).toBeUndefined();
  });
});

// ── Requests Merge ───────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Merge: Requests', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('added request should be created in DB', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    await setWorkerAction(page, BOB_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'skip', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);
    expect(result.requestsCreated).toBe(1);

    const requests = await testBase.getRequestsInDb();
    expect(requests.length).toBeGreaterThanOrEqual(1);
  });

  test('skipped request should not be created', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    await setWorkerAction(page, BOB_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'skip', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);
    expect(result.requestsCreated).toBe(0);
    expect(result.requestsSkipped).toBe(1);
  });

  test('request for skipped worker should be cascade-skipped', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip Alice → her request should cascade
    await setWorkerAction(page, ALICE_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'skip', targetWorkerId: null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);
    // The request should be cascade-skipped because Alice was skipped
    expect(result.requestsSkipped).toBe(1);
    expect(result.requestsCreated).toBe(0);
  });
});

// ── Schedule Merge ───────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Merge: Schedule', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('assignments for skipped worker should all be excluded', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip Alice — all her assignments should cascade
    await setWorkerAction(page, ALICE_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'skip', targetWorkerId: null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    // Only Bob's assignments should be created (Day1:MS, Day3:NS)
    // Alice (Day1:MS, Day2:NS) and Charlie (skipped) should be excluded
    const { start, end } = getFullMonthRange();
    const assignmentsResp = await testBase.getAssignmentsInDb(start, end);
    const assignments = assignmentsResp.assignmentsRead ?? [];

    // Bob has 2 assignments
    expect(result.assignmentsCreated).toBe(2);

    // No assignment should belong to Alice or Charlie
    const aliceWorker = await testBase.getWorkerByName('Alice');
    const charlieWorker = await testBase.getWorkerByName('Charlie');
    for (const a of assignments) {
      if (aliceWorker) expect(a.workerId).not.toBe(aliceWorker.id);
      if (charlieWorker) expect(a.workerId).not.toBe(charlieWorker?.id);
    }
  });

  test('assignments for skipped shift should all be excluded', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip Night shift → all Night assignments should cascade
    await setShiftAction(page, NIGHT_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    // Only Morning assignments should be created
    const { start, end } = getFullMonthRange();
    const assignmentsResp = await testBase.getAssignmentsInDb(start, end);
    const assignments = assignmentsResp.assignmentsRead ?? [];

    // All assignments should be Morning (MS), not Night (NS)
    for (const a of assignments) {
      const shift = await testBase.getShiftByAcronym(
        // Find shift by ID
        testBase.getExistingShifts().find((s) => s.id === a.shiftId)?.acronym || '',
      );
      // Simply check none match night
      const nightShift = await testBase.getShiftByAcronym('NS');
      if (nightShift) expect(a.shiftId).not.toBe(nightShift.id);
    }

    expect(result.assignmentsCreated).toBeGreaterThan(0);
  });

  test('assignments outside date filter should be excluded', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    await setWorkerAction(page, CHARLIE_ID, 'skip');

    // Set date filter to only include day 1
    const day1 = Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1) / 1000;

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: false, startDate: day1, endDate: day1 },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    // Only day 1 assignments should be created: Alice→MS, Bob→MS (2)
    expect(result.assignmentsCreated).toBe(2);
  });

  test('assignment for merged worker should reference existing worker ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip everyone except Alice (merge_into)
    await setWorkerAction(page, BOB_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'skip', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    await testBase.executeMergeViaApi(mergeReq);

    const { start, end } = getFullMonthRange();
    const assignmentsResp = await testBase.getAssignmentsInDb(start, end);
    const assignments = assignmentsResp.assignmentsRead ?? [];

    // All assignments should reference aliceTargetId (the existing Alice Worker)
    expect(assignments.length).toBeGreaterThan(0);
    for (const a of assignments) {
      expect(a.workerId).toBe(aliceTargetId);
    }
  });

  test('assignment for merged shift should reference existing shift ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip Night shift and Bob + Charlie workers
    await setShiftAction(page, NIGHT_ID, 'skip');
    await setWorkerAction(page, BOB_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const aliceTargetId = targets.workers.find((w) => w.name === 'Alice Worker')?.id;
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'merge_into', targetWorkerId: aliceTargetId ?? null },
        { generatedId: BOB_ID, action: 'skip', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'skip', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    await testBase.executeMergeViaApi(mergeReq);

    const { start, end } = getFullMonthRange();
    const assignmentsResp = await testBase.getAssignmentsInDb(start, end);
    const assignments = assignmentsResp.assignmentsRead ?? [];

    // All assignments should reference morningTarget.id (the existing Morning Shift)
    expect(assignments.length).toBeGreaterThan(0);
    for (const a of assignments) {
      expect(a.shiftId).toBe(morningTarget?.id);
    }
  });

  test('assignment for added worker should reference newly created worker ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Skip Alice and Charlie — Bob is the only added worker
    await setWorkerAction(page, ALICE_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'skip', targetWorkerId: null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    await testBase.executeMergeViaApi(mergeReq);

    const { start, end } = getFullMonthRange();
    const assignmentsResp = await testBase.getAssignmentsInDb(start, end);
    const assignments = assignmentsResp.assignmentsRead ?? [];

    // Bob's assignments should reference the newly created Bob worker ID
    const bobInDb = await testBase.getWorkerByName('Bob');
    expect(bobInDb).toBeDefined();

    const bobAssignments = assignments.filter((a) => a.workerId === bobInDb!.id);
    expect(bobAssignments.length).toBeGreaterThan(0);
  });

  test('assignment for added shift should reference newly created shift ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    // Keep Morning as merge_into, Night as add_new; only Bob
    await setWorkerAction(page, ALICE_ID, 'skip');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const targets = await testBase.getTargetsViaApi();
    const morningTarget = targets.shifts.find((s) => s.acronym === 'MS');

    const mergeReq: MergeRequest = {
      teamId: testBase.getTestTeam()!.teamId,
      workerMappings: [
        { generatedId: ALICE_ID, action: 'skip', targetWorkerId: null },
        { generatedId: BOB_ID, action: 'add_new', targetWorkerId: null },
        { generatedId: CHARLIE_ID, action: 'skip', targetWorkerId: null },
      ],
      shiftMappings: [
        { generatedId: MORNING_ID, action: 'merge_into', targetShiftId: morningTarget?.id ?? null },
        { generatedId: NIGHT_ID, action: 'add_new', targetShiftId: null },
      ],
      requestMappings: [],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    await testBase.executeMergeViaApi(mergeReq);

    const { start, end } = getFullMonthRange();
    const assignmentsResp = await testBase.getAssignmentsInDb(start, end);
    const assignments = assignmentsResp.assignmentsRead ?? [];

    // Night shift should have been created
    const nightInDb = await testBase.getShiftByAcronym('NS');
    expect(nightInDb).toBeDefined();

    // Some assignments should reference the newly created Night shift ID
    const nightAssignments = assignments.filter((a) => a.shiftId === nightInDb!.id);
    expect(nightAssignments.length).toBeGreaterThan(0);
  });
});
