/**
 * E2E tests for Assignment Replacement by Team Leader
 *
 * This test suite covers replacement candidate functionality, including
 * checking workers with various constraints (not employed, missing specialty,
 * on leave, has overlap, has request) and their categorization as can_do,
 * could_do, or cant_do.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";
import {
  AssignmentT,
  AssignmentSource,
} from "../../../../src/types/assignment";
import {
  ReplacementImplicationsT,
  ReplacementCandidateT,
  MostConstrainingReasonT,
  ConstraintHitsT,
} from "../../../../src/types/replacement";
import {
  ConstraintType,
  BlockNameOptions,
  BlockTypeOptions,
  SWOIdTypes,
} from "@/types/constraint";
import { BreachT, ObjectiveCategory } from "../../../../src/types/breach";
import { RequestType, RequestStatus } from "@/types/request";
import {
  DimensionEntryType,
  DimensionType,
} from "../../../../src/types/dimension";
import { AttributeOwnerType } from "@/types/attribute";

dayjs.extend(utc);
dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);

test.describe("Assignment Replacement - Team Leader", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting replacement test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: true,
      linkMemberToWorker: false,
      createDutyAndRecuperation: true,
      numberOfWorkers: 12,
    });

    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  /**
   * Helper to compare LTM indicators (count + lastDate)
   */
  function compareLTMIndicators(
    expected: { count: number; lastDate: dayjs.Dayjs | null },
    actual: { count: number; lastDate: dayjs.Dayjs | null },
    context: string,
  ): void {
    expect(actual.count).toBe(expected.count);

    if (expected.count === 1) {
      expect(actual.lastDate).toBeNull();
    } else {
      expect(actual.lastDate).not.toBeNull();
      expect(actual.lastDate!.isSame(expected.lastDate, "day")).toBe(true);
    }
  }

  /**
   * Helper to compare constraint hits (hard or soft)
   */
  function compareConstraintHits(
    expected: ConstraintHitsT,
    actual: ConstraintHitsT,
  ): void {
    expect(actual.meetsConstraints).toBe(expected.meetsConstraints);
    expect(actual.breaches.length).toBe(expected.breaches.length);

    for (let i = 0; i < expected.breaches.length; i++) {
      const expectedBreach = expected.breaches[i];
      const actualBreach = actual.breaches[i];

      // Skip dynamic fields (id, scheduleId, description)
      expect(actualBreach.objectiveId).toBe(expectedBreach.objectiveId);
      expect(actualBreach.objectiveCategory).toBe(
        expectedBreach.objectiveCategory,
      );
      expect(actualBreach.hardToSoft).toBe(expectedBreach.hardToSoft);

      // Compare variables array
      expect(actualBreach.variables.length).toBe(
        expectedBreach.variables.length,
      );
      for (let j = 0; j < expectedBreach.variables.length; j++) {
        const expectedVar = expectedBreach.variables[j];
        const actualVar = actualBreach.variables[j];

        expect(actualVar.workerId).toBe(expectedVar.workerId);
        expect(actualVar.shiftId).toBe(expectedVar.shiftId);
        expect(actualVar.date.isSame(expectedVar.date, "day")).toBe(true);
      }
    }
  }

  /**
   * Helper to compare replacement implications
   */
  function compareReplacementImplications(
    expected: ReplacementImplicationsT,
    actual: ReplacementImplicationsT,
    workerName: string,
  ): void {
    // Hard constraints (can't do)
    expect(actual.isEmployed).toBe(expected.isEmployed);
    expect(actual.hasSpecialty).toBe(expected.hasSpecialty);
    expect(actual.isntOnLeave).toBe(expected.isntOnLeave);

    // Filter hits
    expect(actual.filterHits.isntFilteredOut).toBe(
      expected.filterHits.isntFilteredOut,
    );
    expect(actual.filterHits.filterLabels.sort()).toEqual(
      expected.filterHits.filterLabels.sort(),
    );

    // Overlap hits
    expect(actual.overlapHits.hasntOverlap).toBe(
      expected.overlapHits.hasntOverlap,
    );
    expect(actual.overlapHits.overlapAssignmentIds.sort()).toEqual(
      expected.overlapHits.overlapAssignmentIds.sort(),
    );

    // Hard constraint hits
    compareConstraintHits(
      expected.hardConstraintHits,
      actual.hardConstraintHits,
    );

    // Request hits
    expect(actual.requestHits.hasNoRequestConflict).toBe(
      expected.requestHits.hasNoRequestConflict,
    );
    expect(actual.requestHits.conflictingRequestIds.sort()).toEqual(
      expected.requestHits.conflictingRequestIds.sort(),
    );

    // Soft constraints (could do)
    compareConstraintHits(
      expected.softConstraintHits,
      actual.softConstraintHits,
    );

    // Monthly duties
    expect(actual.newMonthlyDuties.newNumberMonthlyDuties).toBe(
      expected.newMonthlyDuties.newNumberMonthlyDuties,
    );
    expect(actual.newMonthlyDuties.newMonthlyDutiesDelta).toBe(
      expected.newMonthlyDuties.newMonthlyDutiesDelta,
    );
    expect(actual.newMonthlyDuties.meetsTarget).toBe(
      expected.newMonthlyDuties.meetsTarget,
    );

    // Weekly time
    expect(actual.newWeeklyTime.newWeeklyWorkedMinutes).toBe(
      expected.newWeeklyTime.newWeeklyWorkedMinutes,
    );
    expect(actual.newWeeklyTime.newWeeklyTimeDeltaMinutes).toBe(
      expected.newWeeklyTime.newWeeklyTimeDeltaMinutes,
    );
    expect(actual.newWeeklyTime.meetsTarget).toBe(
      expected.newWeeklyTime.meetsTarget,
    );

    // LTM indicators
    compareLTMIndicators(
      expected.nbTimesDidShiftLtm,
      actual.nbTimesDidShiftLtm,
      `${workerName} - shift LTM`,
    );
    compareLTMIndicators(
      expected.nbTimesWorkedWeekdayLtm,
      actual.nbTimesWorkedWeekdayLtm,
      `${workerName} - weekday LTM`,
    );
  }

  /**
   * Helper to compare expected vs actual replacement candidates
   */
  function compareReplacementCandidates(
    expected: Record<string, ReplacementCandidateT>,
    actual: ReplacementCandidateT[],
  ): void {
    const expectedCount = Object.keys(expected).length;
    expect(actual.length).toBe(expectedCount);

    for (const [workerId, expectedCandidate] of Object.entries(expected)) {
      const actualCandidate = actual.find((c) => c.workerId === workerId);
      expect(actualCandidate).toBeDefined();

      const candidate = actualCandidate!;

      // Compare top-level fields
      expect(candidate.workerId).toBe(expectedCandidate.workerId);
      expect(candidate.workerName).toBe(expectedCandidate.workerName);

      console.log(
        `Comparing candidate: ${candidate.workerName} (ID: ${candidate.workerId})`,
      );

      expect(candidate.rank).toBe(expectedCandidate.rank);
      expect(candidate.replacementCategory).toBe(
        expectedCandidate.replacementCategory,
      );
      expect(candidate.mostConstrainingReason).toBe(
        expectedCandidate.mostConstrainingReason,
      );

      // Compare nested implications
      compareReplacementImplications(
        expectedCandidate.replacementImplications,
        candidate.replacementImplications,
        expectedCandidate.workerName,
      );

      console.log(`✅ ${expectedCandidate.workerName} comparison passed`);
    }
  }

  test("should return expected analysis and ranking for each worker", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const allShifts = await scheduleTestBase.getAllShifts();

    const morningShift = testShifts.find((s) => s.name === "Morning Shift")!;
    const dutyShift = testShifts.find((s) => s.name === "Duty Shift")!;
    const leaveShift = allShifts.find((s) => s.name === "Vacation")!;

    expect(morningShift).toBeDefined();
    expect(dutyShift).toBeDefined();
    expect(leaveShift).toBeDefined();

    const pool = testWorkers;
    const used = new Set<number>();
    let rankCounter = 0;

    function pickUnused() {
      for (let i = 0; i < pool.length; i++) {
        if (!used.has(i)) {
          used.add(i);
          return pool[i];
        }
      }
      throw new Error("no unused workers left");
    }

    // Get the test assignment, and delete all the others
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const testAssignment = assignments.find(
      (a) => a.shiftId === morningShift.id,
    )!;
    expect(testAssignment).toBeDefined();

    const testWorker = testWorkers.find(
      (w) => w.id === testAssignment.workerId,
    )!;
    expect(testWorker).toBeDefined();

    // Mark test worker as used
    const testWorkerIndex = testWorkers.findIndex(
      (w) => w.id === testAssignment.workerId,
    );
    expect(testWorkerIndex).toBeGreaterThanOrEqual(0);
    used.add(testWorkerIndex);

    const testShift = testShifts.find((s) => s.id === testAssignment.shiftId)!;
    expect(testShift).toBeDefined();
    const testDate = testAssignment.date;
    expect(testDate).toBeDefined();

    for (const assignment of assignments) {
      if (
        assignment.id !== testAssignment.id &&
        !assignment.referenceAssignmentId
      ) {
        await scheduleTestBase.deleteAssignment(assignment.id);
      }
    }

    const expectedCandidates: Record<string, ReplacementCandidateT> = {};

    const defaultImplications: ReplacementImplicationsT = {
      // Can't do (hard constraints)
      isEmployed: true,
      hasSpecialty: true,
      isntOnLeave: true,
      filterHits: {
        isntFilteredOut: true,
        filterLabels: [],
      },
      overlapHits: {
        hasntOverlap: true,
        overlapAssignmentIds: [],
      },
      hardConstraintHits: {
        meetsConstraints: true,
        breaches: [],
      },
      requestHits: {
        hasNoRequestConflict: true,
        conflictingRequestIds: [],
      },

      // Could do (soft constraints)
      softConstraintHits: {
        meetsConstraints: true,
        breaches: [],
      },
      newMonthlyDuties: {
        newNumberMonthlyDuties: 0,
        newMonthlyDutiesDelta: 0,
        meetsTarget: true,
      },
      newWeeklyTime: {
        newWeeklyWorkedMinutes: 6 * 60,
        newWeeklyTimeDeltaMinutes: (6 - testWorker.weeklyHours) * 60,
        meetsTarget: true,
      },

      // Indicators (informational)
      nbTimesDidShiftLtm: {
        count: 1,
        lastDate: null,
      },
      nbTimesWorkedWeekdayLtm: {
        count: 1,
        lastDate: null,
      },
    };

    const defaultCandidate: ReplacementCandidateT = {
      workerId: "",
      workerName: "",
      rank: 0,
      replacementCategory: "can_do",
      replacementImplications: defaultImplications,
      mostConstrainingReason: MostConstrainingReasonT.NO_CONSTRAINTS_VIOLATED,
    };

    expectedCandidates[testWorker.id] = {
      ...defaultCandidate,
      workerId: testWorker.id,
      workerName: testWorker.name,
      rank: rankCounter,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        nbTimesDidShiftLtm: {
          count: 1,
          lastDate: testDate,
        },
        nbTimesWorkedWeekdayLtm: {
          count: 1,
          lastDate: testDate,
        },
      },
    };

    rankCounter++;

    // Setup worker to test LTM indicators
    // Create 5 assignments for the same shift on the same weekday in the last
    // 12 months
    const w1 = pickUnused();

    for (let i = 0; i < 5; i++) {
      const pastDate = dayjs(testDate)
        .subtract(i + 1, "week")
        .startOf("day")
        .add(12, "hours"); // Add 12 hours to avoid timezone issues

      await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: w1.id,
        shiftId: testShift.id,
        date: pastDate,
      });
    }

    // Create 2 more assignments for the same shift in the last 12 months, but
    // not on the same weekday
    for (let i = 0; i < 2; i++) {
      const pastDate = dayjs(testDate)
        .subtract(i + 1, "week")
        .subtract(1, "day") // Add 1 day to be a different weekday
        .startOf("day")
        .add(12, "hours"); // Add 12 hours to avoid timezone issues

      await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: w1.id,
        shiftId: testShift.id,
        date: pastDate,
      });
    }

    expectedCandidates[w1.id] = {
      ...defaultCandidate,
      workerId: w1.id,
      workerName: w1.name,
      rank: rankCounter,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        nbTimesDidShiftLtm: {
          count: 8,
          lastDate: dayjs(testDate)
            .subtract(1, "week")
            .startOf("day")
            .add(12, "hours"),
        },
        nbTimesWorkedWeekdayLtm: {
          count: 6,
          lastDate: dayjs(testDate)
            .subtract(1, "week")
            .startOf("day")
            .add(12, "hours"),
        },
      },
    };

    rankCounter++;

    // Setup worker to test weekly work time and monthly duties implications
    const w2 = pickUnused();
    // Create two duty-shift assignments for w2 that are:
    // - In the same week as testDate
    // - 2 days apart from each other
    // - Not on testDate or the day before testDate
    let dutyDate1: dayjs.Dayjs | undefined = undefined;
    let dutyDate2: dayjs.Dayjs | undefined = undefined;

    for (
      let currDate = dayjs(testDate).utc().startOf("isoWeek");
      currDate.isSameOrBefore(dayjs(testDate).utc().endOf("isoWeek"), "day");
      currDate = currDate.add(1, "day")
    ) {
      // Ensure neither date conflicts with testDate or testDate - 1
      const testDateMinus1 = dayjs(testDate).subtract(1, "day");
      if (
        currDate.isSame(testDate, "day") ||
        currDate.isSame(testDateMinus1, "day")
      ) {
        continue;
      }
      if (!dutyDate1) {
        dutyDate1 = currDate.startOf("day").add(12, "hours");
        continue;
      }
      if (!dutyDate2 && dutyDate1 && currDate.diff(dutyDate1, "day") >= 2) {
        dutyDate2 = currDate.startOf("day").add(12, "hours");
        break;
      }
    }

    expect(dutyDate1).toBeDefined();
    expect(dutyDate2).toBeDefined();

    if (!dutyDate1 || !dutyDate2) {
      throw new Error(
        "Failed to find suitable dates for duty assignments for w2",
      );
    }

    await scheduleTestBase.createAssignmentAndRecurrence({
      workerId: w2.id,
      shiftId: dutyShift.id,
      date: dutyDate1,
    });
    await scheduleTestBase.createAssignmentAndRecurrence({
      workerId: w2.id,
      shiftId: dutyShift.id,
      date: dutyDate2,
    });

    expectedCandidates[w2.id] = {
      ...defaultCandidate,
      workerId: w2.id,
      workerName: w2.name,
      rank: rankCounter,
      replacementCategory: "could_do",
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        newMonthlyDuties: {
          newNumberMonthlyDuties: 2,
          newMonthlyDutiesDelta: 2,
          meetsTarget: false,
        },
        newWeeklyTime: {
          newWeeklyWorkedMinutes: (24 * 2 + 6) * 60,
          newWeeklyTimeDeltaMinutes: (24 * 2 + 6 - w2.weeklyHours) * 60,
          meetsTarget: false,
        },
      },
    };

    rankCounter++;

    // Setup worker to test soft constaint breach
    const w3 = pickUnused();
    const softConstraint = await scheduleTestBase.createConstraint({
      constraintType: ConstraintType.FIL,
      templateId: "",
      language: "en",
      blocks: [
        {
          name: BlockNameOptions.WORKER,
          type: BlockTypeOptions.SHIFT_WORKER_OPTION,
          value: [
            {
              name: w3.name,
              id: w3.id,
              idType: SWOIdTypes.WORKER,
              isBoolDim: false,
              categoryName: "Workers",
            },
          ],
        },
        {
          name: BlockNameOptions.OPERATOR,
          type: BlockTypeOptions.STRING,
          value: "should not",
        },
        {
          name: BlockNameOptions.TEXT,
          type: BlockTypeOptions.STRING,
          value: "faire des",
        },
        {
          name: BlockNameOptions.SHIFT,
          type: BlockTypeOptions.SHIFT_WORKER_OPTION,
          value: [
            {
              name: testShift.name,
              id: testShift.id,
              idType: SWOIdTypes.SHIFT,
              isBoolDim: false,
              categoryName: "Shifts",
            },
          ],
        },
      ],
      text: "",
      hard: false,
      priority: "medium",
      active: true,
    });

    expectedCandidates[w3.id] = {
      ...defaultCandidate,
      workerId: w3.id,
      workerName: w3.name,
      rank: rankCounter,
      replacementCategory: "could_do",
      mostConstrainingReason: MostConstrainingReasonT.SOFT_CONSTRAINT_VIOLATION,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        softConstraintHits: {
          meetsConstraints: false,
          breaches: [
            {
              id: "",
              scheduleId: "",
              objectiveId: softConstraint.id,
              objectiveCategory: ObjectiveCategory.CONSTRAINT,
              variables: [
                {
                  workerId: w3.id,
                  date: testDate,
                  shiftId: testShift.id,
                },
              ],
              description: "",
              hardToSoft: null,
            },
          ],
        },
      },
    };

    rankCounter++;

    // Setup worker to test request conflict
    const w4 = pickUnused();
    const request = await scheduleTestBase.createRequest({
      workerId: w4.id,
      requestType: RequestType.WORK_DEMAND,
      startDate: testDate,
      endDate: testDate,
      status: RequestStatus.PENDING,
      negative: false,
      comment: "Test work demand request",
      shiftId: null,
      shiftOptions: [
        {
          name: true,
          id: "",
          idType: SWOIdTypes.DUTY,
          isBoolDim: true,
          categoryName: "Duties",
        },
      ],
    });
    // Approve the request so it becomes an approved work demand
    await scheduleTestBase.approveRequest(request.id);

    expectedCandidates[w4.id] = {
      ...defaultCandidate,
      workerId: w4.id,
      workerName: w4.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.REQUEST_CONFLICT,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        requestHits: {
          hasNoRequestConflict: false,
          conflictingRequestIds: [request.id],
        },
      },
    };

    rankCounter++;

    // Setup worker to test hard constaint breach
    const w5 = pickUnused();
    const hardConstraint = await scheduleTestBase.createConstraint({
      constraintType: ConstraintType.FIL,
      templateId: "",
      language: "en",
      blocks: [
        {
          name: BlockNameOptions.WORKER,
          type: BlockTypeOptions.SHIFT_WORKER_OPTION,
          value: [
            {
              name: w5.name,
              id: w5.id,
              idType: SWOIdTypes.WORKER,
              isBoolDim: false,
              categoryName: "Workers",
            },
          ],
        },
        {
          name: BlockNameOptions.OPERATOR,
          type: BlockTypeOptions.STRING,
          value: "should not",
        },
        {
          name: BlockNameOptions.TEXT,
          type: BlockTypeOptions.STRING,
          value: "faire des",
        },
        {
          name: BlockNameOptions.SHIFT,
          type: BlockTypeOptions.SHIFT_WORKER_OPTION,
          value: [
            {
              name: testShift.name,
              id: testShift.id,
              idType: SWOIdTypes.SHIFT,
              isBoolDim: false,
              categoryName: "Shifts",
            },
          ],
        },
      ],
      text: "",
      hard: true,
      priority: "medium",
      active: true,
    });

    expectedCandidates[w5.id] = {
      ...defaultCandidate,
      workerId: w5.id,
      workerName: w5.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.HARD_CONSTRAINT_VIOLATION,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        hardConstraintHits: {
          meetsConstraints: false,
          breaches: [
            {
              id: "",
              scheduleId: "",
              objectiveId: hardConstraint.id,
              objectiveCategory: ObjectiveCategory.CONSTRAINT,
              variables: [
                {
                  workerId: w5.id,
                  date: testDate,
                  shiftId: testShift.id,
                },
              ],
              description: "",
              hardToSoft: null,
            },
          ],
        },
      },
    };

    rankCounter++;

    // Setup worker to test overlap implications
    const w6 = pickUnused();

    const ARResultW6 = await scheduleTestBase.createAssignmentAndRecurrence({
      workerId: w6.id,
      shiftId: testShift.id,
      date: testDate,
    });

    const assignmentOverlap = ARResultW6.assignmentsCreated[0];

    expectedCandidates[w6.id] = {
      ...defaultCandidate,
      workerId: w6.id,
      workerName: w6.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.HAS_OVERLAP,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        overlapHits: {
          hasntOverlap: false,
          overlapAssignmentIds: [assignmentOverlap.id],
        },
      },
    };

    rankCounter++;

    // Setup worker to test overlap implications with recuperation shift
    const w6_2 = pickUnused();

    const ARResultW6_2 = await scheduleTestBase.createAssignmentAndRecurrence({
      workerId: w6_2.id,
      shiftId: dutyShift.id,
      date: testDate.add(-1, "day"),
    });

    const dutyAssignment = ARResultW6_2.assignmentsCreated.find(
      (a) => a.shiftId === dutyShift.id,
    )!;
    const recupAssignment = ARResultW6_2.assignmentsCreated.find(
      (a) => a.referenceAssignmentId === dutyAssignment.id,
    )!;

    expectedCandidates[w6_2.id] = {
      ...defaultCandidate,
      workerId: w6_2.id,
      workerName: w6_2.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.HAS_OVERLAP,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        overlapHits: {
          hasntOverlap: false,
          overlapAssignmentIds: [recupAssignment.id],
        },
        newMonthlyDuties: {
          newNumberMonthlyDuties: 1,
          newMonthlyDutiesDelta: 1,
          meetsTarget: false,
        },
        newWeeklyTime: {
          newWeeklyWorkedMinutes: (24 + 6) * 60,
          newWeeklyTimeDeltaMinutes: (24 + 6 - w6_2.weeklyHours) * 60,
          meetsTarget: true,
        },
      },
    };

    rankCounter++;

    // Setup worker to test fitler implications
    const w7 = pickUnused();
    const dimensionFilter = await scheduleTestBase.createDimension({
      name: `Filter Dimension ${testRunId}`,
      entryType: DimensionEntryType.DIM_ENTRIES,
      dimensionType: [DimensionType.WORKER, DimensionType.SHIFT],
      dimEntries: [
        {
          id: "",
          dimensionId: "",
          name: `${w7.name} - ${testShift.name}`,
          deleted: false,
        },
      ],
    });

    await scheduleTestBase.createAttribute({
      value: "",
      ownerType: AttributeOwnerType.SHIFT,
      ownerId: testShift.id,
      dimensionId: dimensionFilter.newDimension.id,
      dimEntryIds: [dimensionFilter.newDimEntries![0].id],
    });

    for (const worker of testWorkers) {
      if (worker.id !== w7.id) {
        await scheduleTestBase.createAttribute({
          value: "",
          ownerType: AttributeOwnerType.WORKER,
          ownerId: worker.id,
          dimensionId: dimensionFilter.newDimension.id,
          dimEntryIds: [dimensionFilter.newDimEntries![0].id],
        });
      }
    }

    expectedCandidates[w7.id] = {
      ...defaultCandidate,
      workerId: w7.id,
      workerName: w7.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.FILTERED_OUT,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        filterHits: {
          isntFilteredOut: false,
          filterLabels: ["worker_shift_filter"],
        },
      },
    };

    rankCounter++;

    // Setup worker to test leave implications
    const w8 = pickUnused();
    const leaveRequest = await scheduleTestBase.createRequest({
      workerId: w8.id,
      requestType: RequestType.LEAVE,
      startDate: testDate,
      endDate: testDate,
      status: RequestStatus.PENDING,
      negative: false,
      comment: "Test work demand request",
      shiftId: leaveShift.id,
      shiftOptions: [],
    });
    // Approve the request so it becomes an approved work demand
    const requestApproval = await scheduleTestBase.approveRequest(
      leaveRequest.id,
    );
    expect(requestApproval.assignments.length).toBe(1);

    expectedCandidates[w8.id] = {
      ...defaultCandidate,
      workerId: w8.id,
      workerName: w8.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.ON_LEAVE,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        isntOnLeave: false,
        overlapHits: {
          hasntOverlap: false,
          overlapAssignmentIds: [requestApproval.assignments[0].id],
        },
      },
    };

    rankCounter++;

    // Setup worker to test specialty implications
    const w9 = pickUnused();
    const specialty = await scheduleTestBase.createSpecialty({
      name: `Specialty ${testRunId}`,
    });

    for (const worker of testWorkers) {
      if (worker.id !== w9.id) {
        await scheduleTestBase.updateWorker(worker.id, {
          specialtyIds: [specialty.id],
        });
      }
    }

    await scheduleTestBase.updateShift({
      ...testShift,
      staffing: [
        {
          specialtyId: specialty.id,
          staffing: 1,
        },
      ],
    });

    expectedCandidates[w9.id] = {
      ...defaultCandidate,
      workerId: w9.id,
      workerName: w9.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.MISSING_SPECIALTY,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        hasSpecialty: false,
      },
    };

    rankCounter++;

    // Setup worker to test no employed implications
    const w10 = pickUnused();
    await scheduleTestBase.updateWorker(w10.id, {
      employmentEndDate: dayjs(testDate).subtract(1, "day"),
    });

    expectedCandidates[w10.id] = {
      ...defaultCandidate,
      workerId: w10.id,
      workerName: w10.name,
      rank: rankCounter,
      replacementCategory: "cant_do",
      mostConstrainingReason: MostConstrainingReasonT.NOT_EMPLOYED,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        isEmployed: false,
      },
    };

    rankCounter++;

    // Get replacement candidates via the api
    const actualCandidates = await scheduleTestBase.getReplacementCandidates(
      testAssignment.id,
    );

    // Compare actual vs expected candidates
    compareReplacementCandidates(expectedCandidates, actualCandidates);
    console.log("✅ All replacement candidates match expectations");
  });

  test("should complete replacement when replace button is clicked in candidate list", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testWorkers = scheduleTestBase.getTestWorkers();

    const morningShift = testShifts.find((s) => s.name === "Morning Shift")!;

    // Get the created assignment
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments.find((a) => a.shiftId === morningShift.id)!;
    expect(assignment).toBeDefined();

    const originalWorkerId = assignment.workerId;

    // Set the schedule view to include the date of the assignment
    await scheduleTestBase.setScheduleViewSettings(
      page,
      {
        targetDate: assignment.date,
        timeFrame: "week",
      },
      true, // reload page
    );

    // Click on assignment
    const assignmentCell = page.locator(
      `[data-testid="assignment-cell-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();

    // Verify dialog opens
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify check replacement button exists
    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await expect(checkReplacementButton).toBeVisible();

    console.log("✅ Check replacement button visible");

    // Click the check replacement button
    await checkReplacementButton.click();

    // Wait for the replacement candidates list to appear
    await page.waitForTimeout(1000); // Wait for API response

    // Verify all workers except the original worker appear in the list
    const expectedCandidateWorkers = testWorkers.filter(
      (w) => w.id !== originalWorkerId,
    );

    for (const worker of expectedCandidateWorkers) {
      const candidateItem = page.locator(
        `[data-testid="candidate-${worker.id}"]`,
      );
      await expect(candidateItem).toBeVisible();

      // Verify the worker has a replace button
      const replaceButton = page.locator(
        `[data-testid="replace-button-${worker.id}"]`,
      );
      await expect(replaceButton).toBeVisible();
    }

    console.log(
      "✅ All workers except original worker appear with replace buttons",
    );

    // Verify the original worker does NOT appear in the list
    const originalWorkerCandidate = page.locator(
      `[data-testid="candidate-${originalWorkerId}"]`,
    );
    await expect(originalWorkerCandidate).not.toBeVisible();

    // Select a replacement worker (pick the first candidate)
    const replacementWorker = expectedCandidateWorkers[0];
    const replaceButton = page.locator(
      `[data-testid="replace-button-${replacementWorker.id}"]`,
    );
    await replaceButton.click();

    console.log(
      `✅ Clicked replace button for worker: ${replacementWorker.name}`,
    );

    // Wait for the replacement to complete
    await page.waitForTimeout(1500); // Wait for API call and UI update

    // Verify the assignment dialog has closed
    const assignmentDialog = page.locator(
      '[data-testid="schedule-item-dialog"]',
    );
    await expect(assignmentDialog).not.toBeVisible();

    console.log("✅ Assignment dialog closed after replacement");

    // Fetch assignments again
    const updatedAR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const updatedAssignments = updatedAR.assignmentsRead;

    // Find the updated assignment
    const updatedAssignment = updatedAssignments.find(
      (a) => a.id === assignment.id,
    );

    // Verify the assignment is now assigned to the replacement worker
    expect(updatedAssignment).toBeDefined();
    expect(updatedAssignment!.workerId).toBe(replacementWorker.id);
    expect(updatedAssignment!.shiftId).toBe(assignment.shiftId);
    expect(updatedAssignment!.date.isSame(assignment.date, "day")).toBe(true);

    console.log(
      `✅ Assignment successfully replaced to worker: ${replacementWorker.name}`,
    );
  });

  test("should complete replacement when replace button is clicked in details dialog", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testWorkers = scheduleTestBase.getTestWorkers();

    const morningShift = testShifts.find((s) => s.name === "Morning Shift")!;

    // Get the created assignment
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments.find((a) => a.shiftId === morningShift.id)!;
    expect(assignment).toBeDefined();

    const originalWorkerId = assignment.workerId;

    // Set the schedule view to include the date of the assignment
    await scheduleTestBase.setScheduleViewSettings(
      page,
      {
        targetDate: assignment.date,
        timeFrame: "week",
      },
      true,
    );

    // Click on assignment
    const assignmentCell = page.locator(
      `[data-testid="assignment-cell-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();

    // Verify dialog opens
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify check replacement button exists
    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await expect(checkReplacementButton).toBeVisible();

    console.log("✅ Check replacement button visible");

    // Click the check replacement button
    await checkReplacementButton.click();

    // Wait for the replacement candidates list to appear
    await page.waitForTimeout(1000); // Wait for API response

    // Click the "see details" button to open the ReplacementDetailsDialog
    const seeDetailsButton = page.locator('[data-testid="see-details-button"]');
    await expect(seeDetailsButton).toBeVisible();
    await seeDetailsButton.click();

    console.log("✅ Clicked see details button");

    // Wait for the details dialog to open
    await page.waitForTimeout(500);

    // Verify the details dialog is visible
    const detailsDialog = page.locator(
      '[data-testid="replacement-details-dialog"]',
    );
    await expect(detailsDialog).toBeVisible();

    console.log("✅ Replacement details dialog opened");

    // Verify all workers (including current worker) appear in the details table
    for (const worker of testWorkers) {
      const candidateRow = page.locator(
        `[data-testid="candidate-row-${worker.id}"]`,
      );
      await expect(candidateRow).toBeVisible();
    }

    console.log("✅ All workers appear in details table");

    // Verify replace buttons exist for all workers except the current worker
    const expectedCandidateWorkers = testWorkers.filter(
      (w) => w.id !== originalWorkerId,
    );

    for (const worker of expectedCandidateWorkers) {
      const replaceButton = page.locator(
        `[data-testid="replace-candidate-${worker.id}"]`,
      );
      await expect(replaceButton).toBeVisible();
    }

    // Verify the current worker does NOT have a replace button
    const currentWorkerReplaceButton = page.locator(
      `[data-testid="replace-candidate-${originalWorkerId}"]`,
    );
    await expect(currentWorkerReplaceButton).not.toBeVisible();

    console.log(
      "✅ Replace buttons visible for all workers except current worker",
    );

    // Select a replacement worker (pick the first candidate)
    const replacementWorker = expectedCandidateWorkers[0];
    const replaceButton = page.locator(
      `[data-testid="replace-candidate-${replacementWorker.id}"]`,
    );
    await expect(replaceButton).toBeVisible();
    await replaceButton.click();

    console.log(
      `✅ Clicked replace button in details dialog for worker: ${replacementWorker.name}`,
    );

    // Wait for the replacement to complete
    await page.waitForTimeout(1500); // Wait for API call and UI update

    // Verify both dialogs have closed
    await expect(detailsDialog).not.toBeVisible();
    const assignmentDialog = page.locator(
      '[data-testid="schedule-item-dialog"]',
    );
    await expect(assignmentDialog).not.toBeVisible();

    console.log("✅ Both dialogs closed after replacement");

    // Fetch assignments again
    const updatedAR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const updatedAssignments = updatedAR.assignmentsRead;

    // Find the updated assignment
    const updatedAssignment = updatedAssignments.find(
      (a) => a.id === assignment.id,
    );

    // Verify the assignment is now assigned to the replacement worker
    expect(updatedAssignment).toBeDefined();
    expect(updatedAssignment!.workerId).toBe(replacementWorker.id);
    expect(updatedAssignment!.shiftId).toBe(assignment.shiftId);
    expect(updatedAssignment!.date.isSame(assignment.date, "day")).toBe(true);

    console.log(
      `✅ Assignment successfully replaced to worker: ${replacementWorker.name} via details dialog`,
    );
  });
});
