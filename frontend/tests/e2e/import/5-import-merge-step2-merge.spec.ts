/**
 * E2E tests for AdminImportMergeStep2 — Merge execution.
 *
 * Each test captures a DB snapshot before the merge, applies merge
 * mappings via the API, captures a DB snapshot after the merge, then
 * delegates all assertion logic to the single shared
 * `verifyMergeOutcome()` helper.
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
import { verifyMergeOutcome } from '../../utils/merge-verification';
import type { MergeRequest } from '@/app/lib/import-merge-utils';

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

    const before = await testBase.captureTeamSnapshot();

    await setWorkerAction(page, BOB_ID, 'add_new');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    const mergeReq = await testBase.buildMergeRequest();
    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('merged member (Alice) should update existing Alice Worker', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

    // Alice defaults to merge_into, keep it; skip Bob and Charlie
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

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('skipped member (Charlie) should not appear in target team', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

    // Skip Alice and Charlie; add Bob
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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip', skipReason: 'cascade_worker' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
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

    const before = await testBase.captureTeamSnapshot();

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

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('merged shift (Morning) should update existing Morning Shift', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('skipped shift should not appear in target team', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
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

    const before = await testBase.captureTeamSnapshot();

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

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('skipped request should not be created', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('request for skipped worker should be cascade-skipped', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip', skipReason: 'cascade_worker' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
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

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip', skipReason: 'cascade_worker' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('assignments for skipped shift should all be excluded', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('assignments outside date filter should be excluded', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: false, startDate: day1, endDate: day1 },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('assignment for merged worker should reference existing worker ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('assignment for merged shift should reference existing shift ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'add_new' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('assignment for added worker should reference newly created worker ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip', skipReason: 'cascade_worker' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });

  test('assignment for added shift should reference newly created shift ID', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;

    const before = await testBase.captureTeamSnapshot();

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
      requestMappings: [{ generatedId: REQUEST_ID, action: 'skip', skipReason: 'cascade_worker' }],
      assignmentConfig: { includeAll: true, startDate: null, endDate: null },
    };

    const result = await testBase.executeMergeViaApi(mergeReq);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult: result,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });
});
