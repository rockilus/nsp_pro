/**
 * Utilities for the import merge workflow.
 *
 * Types mirror the backend DTOs in
 * backend/shared/src/shared/schemas/dto/import_merge.py
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type MergeAction = 'add_new' | 'merge_into' | 'skip';

export interface WorkerMergeMapping {
  generatedId: string;
  action: MergeAction;
  targetWorkerId?: string | null;
}

export interface ShiftMergeMapping {
  generatedId: string;
  action: MergeAction;
  targetShiftId?: string | null;
}

export interface RequestMergeMapping {
  generatedId: string;
  action: MergeAction;
  targetRequestId?: string | null;
}

export interface AssignmentMergeConfig {
  includeAll: boolean;
  startDate?: number | null;
  endDate?: number | null;
}

export interface MergeRequest {
  teamId: string;
  workerMappings: WorkerMergeMapping[];
  shiftMappings: ShiftMergeMapping[];
  requestMappings: RequestMergeMapping[];
  assignmentConfig: AssignmentMergeConfig;
}

export interface MergeResult {
  workersCreated: number;
  workersUpdated: number;
  workersSkipped: number;
  shiftsCreated: number;
  shiftsUpdated: number;
  shiftsSkipped: number;
  requestsCreated: number;
  requestsSkipped: number;
  assignmentsCreated: number;
}

export interface MergeTargetWorker {
  id: string;
  name: string;
  acronym: string;
}

export interface MergeTargetShift {
  id: string;
  name: string;
  acronym: string;
  shiftType: number;
}

export interface MergeTargetsResponse {
  workers: MergeTargetWorker[];
  shifts: MergeTargetShift[];
  suggestedWorkerMappings: WorkerMergeMapping[];
  suggestedShiftMappings: ShiftMergeMapping[];
}

// ── Cascade helpers ──────────────────────────────────────────────────────────

/**
 * Given worker mappings, determine which imported request/assignment
 * generatedIds are excluded because their parent worker was skipped.
 */
export function buildValidWorkerGids(workerMappings: WorkerMergeMapping[]): Set<string> {
  const valid = new Set<string>();
  for (const wm of workerMappings) {
    if (wm.action !== 'skip') {
      valid.add(wm.generatedId);
    }
  }
  return valid;
}

export function buildValidShiftGids(shiftMappings: ShiftMergeMapping[]): Set<string> {
  const valid = new Set<string>();
  for (const sm of shiftMappings) {
    if (sm.action !== 'skip') {
      valid.add(sm.generatedId);
    }
  }
  return valid;
}

/**
 * Count how many assignments would be created given the current
 * configuration (cascade + date filter).
 */
export function countEffectiveAssignments(
  assignments: { workerId?: string; shiftId?: string; date?: number }[],
  validWorkerGids: Set<string>,
  validShiftGids: Set<string>,
  config: AssignmentMergeConfig,
): number {
  let count = 0;
  for (const a of assignments) {
    if (!a.workerId || !validWorkerGids.has(a.workerId)) continue;
    if (!a.shiftId || !validShiftGids.has(a.shiftId)) continue;
    if (a.date == null) continue;

    if (!config.includeAll) {
      if (config.startDate != null && a.date < config.startDate) continue;
      if (config.endDate != null && a.date > config.endDate) continue;
    }
    count++;
  }
  return count;
}

// ── Summary ──────────────────────────────────────────────────────────────────

export interface MergeSummary {
  workersToCreate: number;
  workersToUpdate: number;
  workersToSkip: number;
  shiftsToCreate: number;
  shiftsToUpdate: number;
  shiftsToSkip: number;
  requestsToCreate: number;
  requestsToSkip: number;
  assignmentsToCreate: number;
}

export function computeMergeSummary(
  workerMappings: WorkerMergeMapping[],
  shiftMappings: ShiftMergeMapping[],
  requestMappings: RequestMergeMapping[],
  assignments: { workerId?: string; shiftId?: string; date?: number }[],
  assignmentConfig: AssignmentMergeConfig,
): MergeSummary {
  const validWorkers = buildValidWorkerGids(workerMappings);
  const validShifts = buildValidShiftGids(shiftMappings);

  // Workers
  let workersToCreate = 0;
  let workersToUpdate = 0;
  let workersToSkip = 0;
  for (const wm of workerMappings) {
    if (wm.action === 'add_new') workersToCreate++;
    else if (wm.action === 'merge_into') workersToUpdate++;
    else workersToSkip++;
  }

  // Shifts
  let shiftsToCreate = 0;
  let shiftsToUpdate = 0;
  let shiftsToSkip = 0;
  for (const sm of shiftMappings) {
    if (sm.action === 'add_new') shiftsToCreate++;
    else if (sm.action === 'merge_into') shiftsToUpdate++;
    else shiftsToSkip++;
  }

  // Requests — cascade: requests whose worker was skipped are auto-skipped
  let requestsToCreate = 0;
  let requestsToSkip = 0;
  for (const rm of requestMappings) {
    if (rm.action === 'skip') {
      requestsToSkip++;
    } else {
      requestsToCreate++;
    }
  }

  const assignmentsToCreate = countEffectiveAssignments(
    assignments,
    validWorkers,
    validShifts,
    assignmentConfig,
  );

  return {
    workersToCreate,
    workersToUpdate,
    workersToSkip,
    shiftsToCreate,
    shiftsToUpdate,
    shiftsToSkip,
    requestsToCreate,
    requestsToSkip,
    assignmentsToCreate,
  };
}
