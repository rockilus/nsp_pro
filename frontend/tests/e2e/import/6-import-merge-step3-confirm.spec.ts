/**
 * E2E tests for AdminImportMergeConfirm — Merge execution via UI.
 *
 * Each test captures a DB snapshot before the merge, sets mappings via
 * step 2 UI selects, navigates to step 3 (confirm), verifies the confirm
 * screen UI content, clicks "Execute Merge" via the UI, verifies the
 * post-merge result UI, captures a DB snapshot after the merge, then
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
 * - Confirm screen UI: summary card counts, warning banner, skip text
 * - Result screen UI: result card counts, success heading, done button
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';
import { testConfig } from '../../utils/test-config';
import { verifyMergeOutcome } from '../../utils/merge-verification';
import type { MergeRequest, MergeResult } from '@/app/lib/import-merge-utils';
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

  // Search for the test team by name so it appears on the current page
  const team = testBase.getTestTeam()!;
  const nameFilter = page.locator('[data-testid="filter-search_name"]');
  await nameFilter.fill(team.name);
  await page.waitForTimeout(500); // let debounced search settle
  await expect(page.locator(`[data-testid="team-row-${team.teamId}"]`)).toBeVisible({
    timeout: 5000,
  });

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
 * Navigate from step 2 to step 3 (confirm) by clicking "Next: Confirm".
 * Waits for the execute button on step 3 to confirm the page is loaded.
 */
async function navigateToStep3(page: import('@playwright/test').Page) {
  const nextBtn = page.locator('[data-testid="merge-step2-next"]');
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();

  // Wait for step 3 confirm screen to load
  await page.waitForSelector('[data-testid="merge-execute-btn"]', { timeout: 10000 });
  await expect(page.locator('[data-testid="merge-confirm-warning"]')).toBeVisible({
    timeout: 5000,
  });
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

/** Assert a confirm summary card contains the expected count value. */
async function expectSummaryCard(
  page: import('@playwright/test').Page,
  testId: string,
  expectedCount: number,
) {
  const card = page.locator(`[data-testid="${testId}"]`);
  await expect(card).toBeVisible();
  await expect(card.locator('.text-lg.font-bold')).toHaveText(String(expectedCount));
}

/** Assert a post-merge result card contains the expected count value. */
async function expectResultCard(
  page: import('@playwright/test').Page,
  testId: string,
  expectedCount: number,
) {
  const card = page.locator(`[data-testid="${testId}"]`);
  await expect(card).toBeVisible();
  await expect(card.locator('.text-xl.font-bold')).toHaveText(String(expectedCount));
}

/**
 * Click "Execute Merge" and capture the actual HTTP request + response
 * from the browser via waitForResponse. Returns the real MergeRequest
 * the UI sent and the real MergeResult the API returned.
 */
async function captureMergeViaUI(
  page: import('@playwright/test').Page,
  testBase: ImportMergeTestBase,
): Promise<{ mergeReq: MergeRequest; mergeResult: MergeResult }> {
  const importId = testBase.getImportRecordId()!;

  // Start waiting for the merge POST response *before* clicking execute
  const respPromise = page.waitForResponse(
    (r) => r.url().includes(`/admin/imports/${importId}/merge`) && r.request().method() === 'POST',
    { timeout: 30000 },
  );

  await page.locator('[data-testid="merge-execute-btn"]').click();

  const resp = await respPromise;
  const mergeReq: MergeRequest = resp.request().postDataJSON();
  const mergeResult: MergeResult = await resp.json();

  return { mergeReq, mergeResult };
}

// ── Members Merge ────────────────────────────────────────────────────────────

test.describe('AdminImportMergeConfirm — Merge: Members', () => {
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

    // Set mappings: Bob add_new, Charlie skip (Alice stays merge_into default)
    await setWorkerAction(page, BOB_ID, 'add_new');
    await setWorkerAction(page, CHARLIE_ID, 'skip');

    await navigateToStep3(page);

    // ── Confirm screen UI assertions ──
    await expectSummaryCard(page, 'merge-confirm-summary-workers-create', 1);
    await expectSummaryCard(page, 'merge-confirm-summary-workers-update', 1);
    await expect(page.locator('[data-testid="merge-confirm-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="merge-confirm-skipped-summary"]')).toBeVisible();

    // Execute merge via UI and capture the real request + response
    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    // ── Post-merge result UI assertions ──
    await expect(page.locator('text=Merge Complete')).toBeVisible();
    await expectResultCard(page, 'merge-result-workers-created', 1);
    await expectResultCard(page, 'merge-result-workers-updated', 1);
    await expectResultCard(page, 'merge-result-shifts-created', 1);
    await expectResultCard(page, 'merge-result-shifts-updated', 1);
    await expect(page.locator('[data-testid="merge-done-btn"]')).toBeVisible();

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    // Confirm UI: 0 created, 1 updated workers
    await expectSummaryCard(page, 'merge-confirm-summary-workers-create', 0);
    await expectSummaryCard(page, 'merge-confirm-summary-workers-update', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expect(page.locator('text=Merge Complete')).toBeVisible();
    await expectResultCard(page, 'merge-result-workers-created', 0);
    await expectResultCard(page, 'merge-result-workers-updated', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    // Confirm UI: 1 created worker (Bob), 0 updated
    await expectSummaryCard(page, 'merge-confirm-summary-workers-create', 1);
    await expectSummaryCard(page, 'merge-confirm-summary-workers-update', 0);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-workers-created', 1);
    await expectResultCard(page, 'merge-result-workers-updated', 0);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });
});

// ── Shifts Merge ─────────────────────────────────────────────────────────────

test.describe('AdminImportMergeConfirm — Merge: Shifts', () => {
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

    await navigateToStep3(page);

    // Confirm: 1 shift created, 1 updated
    await expectSummaryCard(page, 'merge-confirm-summary-shifts-create', 1);
    await expectSummaryCard(page, 'merge-confirm-summary-shifts-update', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-shifts-created', 1);
    await expectResultCard(page, 'merge-result-shifts-updated', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    // Confirm: 0 shifts created, 1 updated
    await expectSummaryCard(page, 'merge-confirm-summary-shifts-create', 0);
    await expectSummaryCard(page, 'merge-confirm-summary-shifts-update', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-shifts-created', 0);
    await expectResultCard(page, 'merge-result-shifts-updated', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    // Confirm: 0 shifts created
    await expectSummaryCard(page, 'merge-confirm-summary-shifts-create', 0);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-shifts-created', 0);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });
});

// ── Requests Merge ───────────────────────────────────────────────────────────

test.describe('AdminImportMergeConfirm — Merge: Requests', () => {
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

    await navigateToStep3(page);

    // Confirm: 1 request to create
    await expectSummaryCard(page, 'merge-confirm-summary-requests-create', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-requests-created', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    // Skip the request on step 2 before navigating to step 3
    const requestAction = page.locator(`[data-testid="merge-request-action-${REQUEST_ID}"]`);
    await requestAction.click();
    await page.locator('[role="option"]', { hasText: 'Skip' }).click();
    await page.waitForTimeout(200);

    await navigateToStep3(page);

    // Confirm: 0 requests to create
    await expectSummaryCard(page, 'merge-confirm-summary-requests-create', 0);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-requests-created', 0);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    // Confirm: 0 requests to create (cascade-skipped)
    await expectSummaryCard(page, 'merge-confirm-summary-requests-create', 0);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-requests-created', 0);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });
});

// ── Schedule Merge ───────────────────────────────────────────────────────────

test.describe('AdminImportMergeConfirm — Merge: Schedule', () => {
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

    await navigateToStep3(page);

    await expectSummaryCard(page, 'merge-confirm-summary-assignments-create', 4);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-assignments-created', 4);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-assignments-created', 4);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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
    const day1Str = dayjs.unix(day1).utc().format('YYYY-MM-DD');

    // Switch to "Filter by period" on step 2
    await page.locator('[data-testid="merge-assignments-filter-period"]').click();
    await page.locator('[data-testid="merge-period-start"]').fill(day1Str);
    await page.locator('[data-testid="merge-period-end"]').fill(day1Str);

    await navigateToStep3(page);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    await expectSummaryCard(page, 'merge-confirm-summary-workers-create', 0);
    await expectSummaryCard(page, 'merge-confirm-summary-workers-update', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-workers-created', 0);
    await expectResultCard(page, 'merge-result-workers-updated', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    await expectSummaryCard(page, 'merge-confirm-summary-shifts-update', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-shifts-updated', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    await expectSummaryCard(page, 'merge-confirm-summary-workers-create', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-workers-created', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
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

    await navigateToStep3(page);

    await expectSummaryCard(page, 'merge-confirm-summary-shifts-create', 1);

    const { mergeReq, mergeResult } = await captureMergeViaUI(page, testBase);

    await expectResultCard(page, 'merge-result-shifts-created', 1);

    const after = await testBase.captureTeamSnapshot();
    const previewData = testBase.getPreviewData();

    await verifyMergeOutcome({
      before,
      after,
      mergeReq,
      mergeResult,
      previewAssignments: previewData.assignments,
      previewRequests: previewData.requests,
      previewMembers: previewData.members,
      previewShifts: previewData.shifts,
    });
  });
});
