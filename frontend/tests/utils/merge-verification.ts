/**
 * Reusable merge outcome verification for import merge E2E tests.
 *
 * Provides a single `verifyMergeOutcome()` function that asserts every
 * expected invariant after a merge operation, given before/after DB
 * snapshots.  Designed to be shared across all merge tests so that
 * ad-hoc per-test assertions can be eliminated.
 */

import { expect } from '@playwright/test';
import type { WorkerT } from '../../src/types/worker';
import type { ShiftT } from '../../src/types/shift';
import type { RequestT } from '../../src/types/request';
import type { AssignmentT } from '../../src/types/assignment';
import type {
  MergeRequest,
  MergeResult,
  WorkerMergeMapping,
  ShiftMergeMapping,
  RequestMergeMapping,
} from '../../src/app/lib/import-merge-utils';
import type { ImportPreviewData } from './import-merge-test-base';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TeamSnapshot {
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  workerIds: Set<string>;
  shiftIds: Set<string>;
  requestIds: Set<string>;
}

interface VerifyMergeOutcomeParams {
  before: TeamSnapshot;
  after: TeamSnapshot;
  mergeReq: MergeRequest;
  mergeResult: MergeResult;
  previewAssignments: ImportPreviewData['assignments'];
  previewRequests: ImportPreviewData['requests'];
  previewMembers: ImportPreviewData['members'];
  previewShifts: ImportPreviewData['shifts'];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a composite key for an assignment, matching on (workerId, date, shiftId). */
function assignmentCompositeKey(a: { workerId: string; date: number; shiftId: string }): string {
  return `${a.workerId}|${a.date}|${a.shiftId}`;
}

/** Build a Set of composite keys from an array of assignments. */
function buildAssignmentKeySet(
  assignments: { workerId: string; date: number; shiftId: string }[],
): Set<string> {
  return new Set(assignments.map(assignmentCompositeKey));
}

/**
 * Resolve a preview worker's `generatedId` to its real DB worker ID after
 * the merge, given the merge mappings and the before/after snapshots.
 */
function resolveWorkerId(
  generatedId: string,
  workerMappings: WorkerMergeMapping[],
  beforeWorkerIds: Set<string>,
  afterWorkers: WorkerT[],
  previewMembers: ImportPreviewData['members'],
): string | null {
  const mapping = workerMappings.find((m) => m.generatedId === generatedId);
  if (!mapping) return null;

  if (mapping.action === 'merge_into') {
    return mapping.targetWorkerId ?? null;
  }

  if (mapping.action === 'add_new') {
    // Find the newly-created worker by matching preview name
    const previewMember = previewMembers.find((m) => m.generatedId === generatedId);
    if (!previewMember) return null;
    const created = afterWorkers.find(
      (w) => w.name === previewMember.name && !beforeWorkerIds.has(w.id),
    );
    return created?.id ?? null;
  }

  // skip
  return null;
}

/**
 * Resolve a preview shift's `generatedId` to its real DB shift ID after
 * the merge.
 */
function resolveShiftId(
  generatedId: string,
  shiftMappings: ShiftMergeMapping[],
  beforeShiftIds: Set<string>,
  afterShifts: ShiftT[],
  previewShifts: ImportPreviewData['shifts'],
): string | null {
  const mapping = shiftMappings.find((m) => m.generatedId === generatedId);
  if (!mapping) return null;

  if (mapping.action === 'merge_into') {
    return mapping.targetShiftId ?? null;
  }

  if (mapping.action === 'add_new') {
    const previewShift = previewShifts.find((s) => s.generatedId === generatedId);
    if (!previewShift) return null;
    const created = afterShifts.find(
      (s) => s.name === previewShift.name && !beforeShiftIds.has(s.id),
    );
    return created?.id ?? null;
  }

  return null;
}

/**
 * Build a mapping from preview `workerId` (generatedId) to real DB worker ID
 * after the merge has been applied.
 */
function buildWorkerIdMap(
  workerMappings: WorkerMergeMapping[],
  beforeWorkerIds: Set<string>,
  afterWorkers: WorkerT[],
  previewMembers: ImportPreviewData['members'],
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const m of workerMappings) {
    map.set(
      m.generatedId,
      resolveWorkerId(m.generatedId, workerMappings, beforeWorkerIds, afterWorkers, previewMembers),
    );
  }
  return map;
}

function buildShiftIdMap(
  shiftMappings: ShiftMergeMapping[],
  beforeShiftIds: Set<string>,
  afterShifts: ShiftT[],
  previewShifts: ImportPreviewData['shifts'],
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const m of shiftMappings) {
    map.set(
      m.generatedId,
      resolveShiftId(m.generatedId, shiftMappings, beforeShiftIds, afterShifts, previewShifts),
    );
  }
  return map;
}

/** Build the set of skipped worker generatedIds. */
function buildSkippedWorkerGids(workerMappings: WorkerMergeMapping[]): Set<string> {
  return new Set(workerMappings.filter((m) => m.action === 'skip').map((m) => m.generatedId));
}

/** Build the set of skipped shift generatedIds. */
function buildSkippedShiftGids(shiftMappings: ShiftMergeMapping[]): Set<string> {
  return new Set(shiftMappings.filter((m) => m.action === 'skip').map((m) => m.generatedId));
}

/**
 * Determine if a request should be cascade-skipped (its parent worker was
 * skipped).
 */
function buildCascadeSkippedRequestGids(
  previewRequests: ImportPreviewData['requests'],
  skippedWorkerGids: Set<string>,
): Set<string> {
  return new Set(
    previewRequests.filter((r) => skippedWorkerGids.has(r.workerId)).map((r) => r.generatedId),
  );
}

// ── Main verification function ───────────────────────────────────────────────

export async function verifyMergeOutcome(params: VerifyMergeOutcomeParams): Promise<void> {
  const {
    before,
    after,
    mergeReq,
    mergeResult,
    previewAssignments,
    previewRequests,
    previewMembers,
    previewShifts,
  } = params;

  const afterWorkerIds = new Set(after.workers.map((w) => w.id));
  const afterShiftIds = new Set(after.shifts.map((s) => s.id));
  const afterRequestIds = new Set(after.requests.map((r) => r.id));

  const skippedWorkerGids = buildSkippedWorkerGids(mergeReq.workerMappings);
  const skippedShiftGids = buildSkippedShiftGids(mergeReq.shiftMappings);
  const cascadeSkippedRequestGids = buildCascadeSkippedRequestGids(
    previewRequests,
    skippedWorkerGids,
  );

  const workerIdMap = buildWorkerIdMap(
    mergeReq.workerMappings,
    before.workerIds,
    after.workers,
    previewMembers,
  );
  const shiftIdMap = buildShiftIdMap(
    mergeReq.shiftMappings,
    before.shiftIds,
    after.shifts,
    previewShifts,
  );

  // ── 1. Pre-existing data preserved ─────────────────────────────────────
  // All workers that existed before must still exist after.
  for (const w of before.workers) {
    expect(
      afterWorkerIds.has(w.id),
      `Pre-existing worker "${w.name}" (${w.id}) should still exist`,
    ).toBe(true);
  }
  // All shifts that existed before must still exist after.
  for (const s of before.shifts) {
    expect(
      afterShiftIds.has(s.id),
      `Pre-existing shift "${s.name}" (${s.id}) should still exist`,
    ).toBe(true);
  }
  // All requests that existed before must still exist after.
  for (const r of before.requests) {
    expect(afterRequestIds.has(r.id), `Pre-existing request ${r.id} should still exist`).toBe(true);
  }

  // ── 2. Added workers / shifts created ──────────────────────────────────
  // Count: after.count - before.count === mergeResult.workersCreated
  const workerDelta = after.workers.length - before.workers.length;
  expect(workerDelta).toBe(mergeResult.workersCreated);

  const shiftDelta = after.shifts.length - before.shifts.length;
  expect(shiftDelta).toBe(mergeResult.shiftsCreated);

  // Each ADD_NEW worker must have been created with the correct name
  for (const wm of mergeReq.workerMappings) {
    if (wm.action !== 'add_new') continue;
    const previewMember = previewMembers.find((m) => m.generatedId === wm.generatedId);
    expect(previewMember).toBeDefined();
    const created = after.workers.find(
      (w) => w.name === previewMember!.name && !before.workerIds.has(w.id),
    );
    expect(created, `Added worker "${previewMember!.name}" should exist in DB`).toBeDefined();
    // Verify the ID mapping resolved
    expect(workerIdMap.get(wm.generatedId)).toBe(created?.id);
  }

  // Each ADD_NEW shift must have been created
  for (const sm of mergeReq.shiftMappings) {
    if (sm.action !== 'add_new') continue;
    const previewShift = previewShifts.find((s) => s.generatedId === sm.generatedId);
    expect(previewShift).toBeDefined();
    const created = after.shifts.find(
      (s) => s.name === previewShift!.name && !before.shiftIds.has(s.id),
    );
    expect(created, `Added shift "${previewShift!.name}" should exist in DB`).toBeDefined();
    expect(shiftIdMap.get(sm.generatedId)).toBe(created?.id);
  }

  // ── 3. Merge workers / shifts were NOT newly created ───────────────────
  for (const wm of mergeReq.workerMappings) {
    if (wm.action !== 'merge_into') continue;
    const mappedId = workerIdMap.get(wm.generatedId);
    expect(mappedId, `Merged worker ${wm.generatedId} should resolve to a real ID`).toBeTruthy();
    if (mappedId) {
      expect(
        before.workerIds.has(mappedId),
        `Merged worker ${wm.generatedId} should map to pre-existing ID ${mappedId}`,
      ).toBe(true);
      expect(
        afterWorkerIds.has(mappedId),
        `Merged worker target ${mappedId} should still exist after merge`,
      ).toBe(true);
    }
  }

  for (const sm of mergeReq.shiftMappings) {
    if (sm.action !== 'merge_into') continue;
    const mappedId = shiftIdMap.get(sm.generatedId);
    expect(mappedId, `Merged shift ${sm.generatedId} should resolve to a real ID`).toBeTruthy();
    if (mappedId) {
      expect(
        before.shiftIds.has(mappedId),
        `Merged shift ${sm.generatedId} should map to pre-existing ID ${mappedId}`,
      ).toBe(true);
      expect(
        afterShiftIds.has(mappedId),
        `Merged shift target ${mappedId} should still exist after merge`,
      ).toBe(true);
    }
  }

  // ── 4. Skipped entities NOT added ──────────────────────────────────────
  // Skipped workers: their preview name should NOT appear as a new entry
  for (const gid of skippedWorkerGids) {
    const previewMember = previewMembers.find((m) => m.generatedId === gid);
    if (!previewMember) continue;
    const existsInAfter = after.workers.some(
      (w) => w.name === previewMember.name && !before.workerIds.has(w.id),
    );
    expect(
      existsInAfter,
      `Skipped worker "${previewMember.name}" should NOT have been created`,
    ).toBe(false);
  }

  // Skipped shifts
  for (const gid of skippedShiftGids) {
    const previewShift = previewShifts.find((s) => s.generatedId === gid);
    if (!previewShift) continue;
    const existsInAfter = after.shifts.some(
      (s) => s.name === previewShift.name && !before.shiftIds.has(s.id),
    );
    expect(existsInAfter, `Skipped shift "${previewShift.name}" should NOT have been created`).toBe(
      false,
    );
  }

  // ── 5. Requests: added created, skipped/cascade-skipped not created ────
  const explicitlySkippedRequestGids = new Set(
    mergeReq.requestMappings.filter((rm) => rm.action === 'skip').map((rm) => rm.generatedId),
  );

  for (const rm of mergeReq.requestMappings) {
    if (rm.action === 'skip') continue; // handled below
    // add_new — should have been created UNLESS cascade-skipped
    if (cascadeSkippedRequestGids.has(rm.generatedId)) {
      // Should NOT exist
      const previewReq = previewRequests.find((r) => r.generatedId === rm.generatedId);
      const exists = after.requests.some((r) => {
        // Match by worker name (the new worker ID) and date range
        const workerId = workerIdMap.get(previewReq?.workerId ?? '');
        return (
          workerId &&
          r.workerId === workerId &&
          (r.startDate as unknown as number) === previewReq?.startDate
        );
      });
      expect(exists, `Cascade-skipped request ${rm.generatedId} should NOT have been created`).toBe(
        false,
      );
    } else {
      // Should exist — find it by associating with the real worker ID
      const previewReq = previewRequests.find((r) => r.generatedId === rm.generatedId);
      expect(
        previewReq,
        `Preview request ${rm.generatedId} should exist in preview data`,
      ).toBeDefined();
      const workerId = workerIdMap.get(previewReq!.workerId);
      const reqExists = after.requests.some(
        (r) =>
          r.workerId === workerId &&
          (r.startDate as unknown as number) === previewReq!.startDate &&
          (r.endDate as unknown as number) === previewReq!.endDate,
      );
      expect(reqExists, `Added request ${rm.generatedId} should exist in DB`).toBe(true);
    }
  }

  // Explicitly skipped requests should NOT exist
  for (const gid of explicitlySkippedRequestGids) {
    const previewReq = previewRequests.find((r) => r.generatedId === gid);
    if (!previewReq) continue;
    const workerId = workerIdMap.get(previewReq.workerId);
    const exists = after.requests.some(
      (r) => r.workerId === workerId && (r.startDate as unknown as number) === previewReq.startDate,
    );
    expect(exists, `Skipped request ${gid} should NOT exist`).toBe(false);
  }

  // ── 6. Result count assertions ─────────────────────────────────────────
  expect(mergeResult.workersCreated).toBe(
    mergeReq.workerMappings.filter((m) => m.action === 'add_new').length,
  );
  expect(mergeResult.workersUpdated).toBe(
    mergeReq.workerMappings.filter((m) => m.action === 'merge_into').length,
  );
  expect(mergeResult.workersSkipped).toBe(
    mergeReq.workerMappings.filter((m) => m.action === 'skip').length,
  );
  expect(mergeResult.shiftsCreated).toBe(
    mergeReq.shiftMappings.filter((m) => m.action === 'add_new').length,
  );
  expect(mergeResult.shiftsUpdated).toBe(
    mergeReq.shiftMappings.filter((m) => m.action === 'merge_into').length,
  );
  expect(mergeResult.shiftsSkipped).toBe(
    mergeReq.shiftMappings.filter((m) => m.action === 'skip').length,
  );

  // Requests skipped count includes both explicitly skipped AND cascade-skipped
  const expectedRequestsSkipped =
    mergeReq.requestMappings.filter((m) => m.action === 'skip').length +
    cascadeSkippedRequestGids.size;
  expect(mergeResult.requestsSkipped).toBe(expectedRequestsSkipped);

  const expectedRequestsCreated =
    mergeReq.requestMappings.filter((m) => m.action !== 'skip').length -
    cascadeSkippedRequestGids.size;
  expect(mergeResult.requestsCreated).toBe(expectedRequestsCreated);

  // ── 7. Assignments: verify created assignments reference correct IDs ───
  const beforeAssignmentKeys = buildAssignmentKeySet(
    before.assignments.map((a) => ({
      workerId: a.workerId,
      date: typeof a.date === 'number' ? a.date : a.date.unix(),
      shiftId: a.shiftId,
    })),
  );

  const afterAssignmentKeys = buildAssignmentKeySet(
    after.assignments.map((a) => ({
      workerId: a.workerId,
      date: typeof a.date === 'number' ? a.date : a.date.unix(),
      shiftId: a.shiftId,
    })),
  );

  // All before assignments must still be present
  for (const key of beforeAssignmentKeys) {
    expect(afterAssignmentKeys.has(key), `Pre-existing assignment ${key} should still exist`).toBe(
      true,
    );
  }

  // Build expected new assignment keys from preview data
  const expectedNewAssignmentKeys = new Set<string>();

  for (const pa of previewAssignments) {
    // Cascade: skip if worker or shift was skipped
    if (skippedWorkerGids.has(pa.workerId) || skippedShiftGids.has(pa.shiftId)) {
      continue;
    }

    // Date filter
    const cfg = mergeReq.assignmentConfig;
    if (!cfg.includeAll) {
      if (cfg.startDate != null && pa.date < cfg.startDate) continue;
      if (cfg.endDate != null && pa.date > cfg.endDate) continue;
    }

    const realWorkerId = workerIdMap.get(pa.workerId);
    const realShiftId = shiftIdMap.get(pa.shiftId);
    if (!realWorkerId || !realShiftId) continue;

    expectedNewAssignmentKeys.add(
      assignmentCompositeKey({
        workerId: realWorkerId,
        date: pa.date,
        shiftId: realShiftId,
      }),
    );
  }

  // The actual new assignments (in after but not before) should match expected
  const actualNewKeys = new Set(
    [...afterAssignmentKeys].filter((k) => !beforeAssignmentKeys.has(k)),
  );

  expect(actualNewKeys.size).toBe(mergeResult.assignmentsCreated);
  expect(actualNewKeys.size).toBe(expectedNewAssignmentKeys.size);

  for (const expectedKey of expectedNewAssignmentKeys) {
    expect(
      actualNewKeys.has(expectedKey),
      `Expected new assignment ${expectedKey} should exist`,
    ).toBe(true);
  }

  // ── 8. No assignments reference skipped workers or shifts ──────────────
  const skippedWorkerRealIds = new Set<string>();
  for (const gid of skippedWorkerGids) {
    // Skipped workers should not be in the DB at all (they didn't exist
    // before and weren't created). But we check that no assignment
    // references a worker that was skipped by matching preview names
    // to `before.workers` — actually skipped workers have no real DB ID
    // since they were skipped. The key check is: no assignment in
    // `after` should reference a worker that existed before but was
    // somehow associated with a skipped import worker. Since skipped
    // = never created, there's no real ID to worry about.
  }

  // Similarly for skipped shifts — no real ID exists.

  // The important check: assignments for skipped entities should not
  // appear. This is already covered above by filtering out skipped
  // worker/shift preview assignments when building expectedNewAssignmentKeys.
}
