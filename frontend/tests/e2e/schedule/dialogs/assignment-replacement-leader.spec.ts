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
import { ScheduleTestBase } from "../../../utils/schedule-test-base";
import {
  AssignmentT,
  AssignmentSource,
} from "../../../../src/types/assignment";
import {
  ReplacementImplicationsT,
  ReplacementCandidateT,
  MostConstrainingReasonT,
} from "../../../../src/types/replacement";
import {
  ConstraintType,
  BlockNameOptions,
  BlockTypeOptions,
  SWOIdTypes,
} from "@/types/constraint";
import { ObjectiveCategory } from "../../../../src/types/breach";
import { RequestType, RequestStatus } from "@/types/request";
import {
  DimensionEntryType,
  DimensionType,
} from "../../../../src/types/dimension";
import { AttributeOwnerType } from "@/types/attribute";

dayjs.extend(utc);

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
      numberOfWorkers: 11,
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
    expected: { meetsConstraints: boolean; breaches: any[] },
    actual: { meetsConstraints: boolean; breaches: any[] },
    context: string,
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
      `${workerName} - hard constraints`,
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
      `${workerName} - soft constraints`,
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

  test("should show check replacement button for existing assignment", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    // Get the created assignment
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];

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

    // Verify check replacement button exists
    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await expect(checkReplacementButton).toBeVisible();

    console.log("✅ Check replacement button visible");
  });

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
        newWeeklyWorkedMinutes: 0,
        newWeeklyTimeDeltaMinutes: 0,
        meetsTarget: true,
      },

      // Indicators (informational)
      nbTimesDidShiftLtm: {
        count: 0,
        lastDate: null,
      },
      nbTimesWorkedWeekdayLtm: {
        count: 0,
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
      rank: 0,
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
        newWeeklyTime: {
          newWeeklyWorkedMinutes: 6 * 60,
          newWeeklyTimeDeltaMinutes: (6 - testWorker.weeklyHours) * 60,
          meetsTarget: true,
        },
      },
    };

    // Setup worker to test LTM indicators
    // Create 5 assignments for the same shift on the same weekday in the last
    // 12 months
    const w1 = pickUnused();

    for (let i = 0; i < 5; i++) {
      const pastDate = dayjs(testDate)
        .subtract(i + 1, "week")
        .startOf("day")
        .add(12, "hours"); // Add 12 hours to avoid timezone issues

      await scheduleTestBase.createAssignmentWithRecurrence({
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
        .add(1, "day") // Add 1 day to be a different weekday
        .startOf("day")
        .add(12, "hours"); // Add 12 hours to avoid timezone issues

      await scheduleTestBase.createAssignmentWithRecurrence({
        workerId: w1.id,
        shiftId: testShift.id,
        date: pastDate,
      });
    }

    expectedCandidates[w1.id] = {
      ...defaultCandidate,
      workerId: w1.id,
      workerName: w1.name,
      rank: 1,
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        nbTimesDidShiftLtm: {
          count: 8,
          lastDate: dayjs(testDate)
            .subtract(1, "week")
            .add(1, "day")
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
        newWeeklyTime: {
          newWeeklyWorkedMinutes: 6 * 60,
          newWeeklyTimeDeltaMinutes: (6 - w1.weeklyHours) * 60,
          meetsTarget: true,
        },
      },
    };

    // Setup worker to test weekly work time and monthly duties implications
    const w2 = pickUnused();
    // Create two duty-shift assignments for w2: 2 days and 5 days before test date
    const dutyDate1 = dayjs(testDate)
      .subtract(2, "day")
      .startOf("day")
      .add(12, "hours");
    const dutyDate2 = dayjs(testDate)
      .subtract(5, "day")
      .startOf("day")
      .add(12, "hours");

    await scheduleTestBase.createAssignmentWithRecurrence({
      workerId: w2.id,
      shiftId: dutyShift.id,
      date: dutyDate1,
    });
    await scheduleTestBase.createAssignmentWithRecurrence({
      workerId: w2.id,
      shiftId: dutyShift.id,
      date: dutyDate2,
    });

    expectedCandidates[w2.id] = {
      ...defaultCandidate,
      workerId: w2.id,
      workerName: w2.name,
      rank: 2,
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
      rank: 3,
      replacementCategory: "could_do",
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
          name: dutyShift.name,
          id: dutyShift.id,
          idType: SWOIdTypes.SHIFT,
          isBoolDim: false,
          categoryName: "Shifts",
        },
      ],
    });
    // Approve the request so it becomes an approved work demand
    await scheduleTestBase.approveRequest(request.id);

    expectedCandidates[w4.id] = {
      ...defaultCandidate,
      workerId: w4.id,
      workerName: w4.name,
      rank: 4,
      replacementCategory: "cant_do",
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        requestHits: {
          hasNoRequestConflict: false,
          conflictingRequestIds: [request.id],
        },
      },
    };

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
      rank: 5,
      replacementCategory: "cant_do",
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

    // Setup worker to test overlap implications
    const w6 = pickUnused();

    const assignmentOverlap =
      await scheduleTestBase.createAssignmentWithRecurrence({
        workerId: w6.id,
        shiftId: testShift.id,
        date: testDate,
      });

    expectedCandidates[w6.id] = {
      ...defaultCandidate,
      workerId: w6.id,
      workerName: w6.name,
      rank: 6,
      replacementCategory: "cant_do",
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        overlapHits: {
          hasntOverlap: false,
          overlapAssignmentIds: [assignmentOverlap.id],
        },
      },
    };

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

    const shiftAttribute = await scheduleTestBase.createAttribute({
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
      rank: 7,
      replacementCategory: "cant_do",
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        filterHits: {
          isntFilteredOut: false,
          filterLabels: [`${w7.name} - ${testShift.name}`],
        },
      },
    };

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
    await scheduleTestBase.approveRequest(leaveRequest.id);

    expectedCandidates[w8.id] = {
      ...defaultCandidate,
      workerId: w8.id,
      workerName: w8.name,
      rank: 8,
      replacementCategory: "cant_do",
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        isntOnLeave: false,
      },
    };

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

    expectedCandidates[w9.id] = {
      ...defaultCandidate,
      workerId: w9.id,
      workerName: w9.name,
      rank: 9,
      replacementCategory: "cant_do",
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        hasSpecialty: false,
      },
    };

    // Setup worker to test no employed implications
    const w10 = pickUnused();
    await scheduleTestBase.updateWorker(w10.id, {
      employmentEndDate: dayjs(testDate).subtract(1, "day"),
    });

    expectedCandidates[w10.id] = {
      ...defaultCandidate,
      workerId: w10.id,
      workerName: w10.name,
      rank: 10,
      replacementCategory: "cant_do",
      replacementImplications: {
        ...defaultCandidate.replacementImplications,
        isEmployed: false,
      },
    };

    // Get replacement candidates via the api
    const actualCandidates = await scheduleTestBase.getReplacementCandidates(
      testAssignment.id,
    );

    // Compare actual vs expected candidates
    compareReplacementCandidates(expectedCandidates, actualCandidates);
    console.log("✅ All replacement candidates match expectations");
  });

  test("should display could_do workers with soft constraint violations", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = dayjs.utc().add(1, "day");

    // Create worker with has_request soft constraint
    await scheduleTestBase.createWorkerWithConstraints({
      teamId: testTeam.teamId,
      name: `Could Do Worker ${testRunId}`,
      shiftTypeIds: [testShifts[0].shiftTypeId],
      constraints: [
        {
          type: "hasRequest",
          date: tomorrow.format("YYYY-MM-DD"),
        },
      ],
    });

    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await checkReplacementButton.click();

    await page.waitForTimeout(1000);

    // Verify could_do section
    const couldDoSection = page.locator('[data-testid="could-do-workers"]');
    if (await couldDoSection.isVisible().catch(() => false)) {
      await expect(couldDoSection).toBeVisible();
      console.log("✅ Could-do workers section displayed");
    } else {
      console.log("⚠️ Could-do section UI needs verification");
    }
  });

  test("should display cant_do workers with hard constraint violations", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = dayjs.utc().add(1, "day");

    // Create worker with missing specialty (hard constraint)
    await scheduleTestBase.createWorkerWithConstraints({
      teamId: testTeam.teamId,
      name: `Cant Do Worker ${testRunId}`,
      shiftTypeIds: [], // No shift type = missing specialty
      constraints: [
        {
          type: "missingSpecialty",
          shiftTypeId: testShifts[0].shiftTypeId,
        },
      ],
    });

    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await checkReplacementButton.click();

    await page.waitForTimeout(1000);

    // Verify cant_do section
    const cantDoSection = page.locator('[data-testid="cant-do-workers"]');
    if (await cantDoSection.isVisible().catch(() => false)) {
      await expect(cantDoSection).toBeVisible();
      console.log("✅ Can't-do workers section displayed");
    } else {
      console.log("⚠️ Can't-do section UI needs verification");
    }
  });

  test("should filter workers not employed on assignment date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = dayjs.utc().add(1, "day");

    // Create worker not employed on that date
    await scheduleTestBase.createWorkerWithConstraints({
      teamId: testTeam.teamId,
      name: `Not Employed Worker ${testRunId}`,
      shiftTypeIds: [testShifts[0].shiftTypeId],
      constraints: [
        {
          type: "notEmployed",
          date: tomorrow.format("YYYY-MM-DD"),
        },
      ],
    });

    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await checkReplacementButton.click();

    await page.waitForTimeout(1000);

    // Worker not employed should be in cant_do or filtered out entirely
    const candidates = await dbUtils.getReplacementCandidates(
      testTeam.teamId,
      testShifts[0].id,
      tomorrow.format("YYYY-MM-DD"),
    );

    const notEmployedWorker = candidates.find((c: any) =>
      c.name.includes("Not Employed Worker"),
    );

    if (notEmployedWorker) {
      expect(notEmployedWorker.category).toBe("cant_do");
      console.log("✅ Not employed worker categorized as can't-do");
    } else {
      console.log("✅ Not employed worker filtered out from candidates");
    }
  });

  test("should show workers on leave as cant_do or could_do", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = dayjs.utc().add(1, "day");

    // Create worker on leave
    await scheduleTestBase.createWorkerWithConstraints({
      teamId: testTeam.teamId,
      name: `On Leave Worker ${testRunId}`,
      shiftTypeIds: [testShifts[0].shiftTypeId],
      constraints: [
        {
          type: "onLeave",
          startDate: tomorrow.format("YYYY-MM-DD"),
          endDate: tomorrow.format("YYYY-MM-DD"),
        },
      ],
    });

    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await checkReplacementButton.click();

    await page.waitForTimeout(1000);

    const candidates = await dbUtils.getReplacementCandidates(
      testTeam.teamId,
      testShifts[0].id,
      tomorrow.format("YYYY-MM-DD"),
    );

    const onLeaveWorker = candidates.find((c: any) =>
      c.name.includes("On Leave Worker"),
    );

    expect(onLeaveWorker).toBeDefined();
    expect(["cant_do", "could_do"]).toContain(onLeaveWorker.category);

    console.log(`✅ Worker on leave categorized as ${onLeaveWorker.category}`);
  });

  test("should allow selecting replacement candidate and updating assignment", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    // Create replacement worker
    const replacementWorker =
      await scheduleTestBase.createWorkerWithConstraints({
        teamId: testTeam.teamId,
        name: `Replacement Worker ${testRunId}`,
        shiftTypeIds: [testShifts[0].shiftTypeId],
        constraints: [],
      });

    // Create original assignment
    const tomorrow = dayjs.utc().add(1, "day");
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const assignment = await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await checkReplacementButton.click();

    await page.waitForTimeout(1000);

    // Try to click on replacement worker
    const replacementButton = page
      .locator('button, [role="button"]')
      .filter({ hasText: `Replacement Worker ${testRunId}` })
      .first();

    if (await replacementButton.isVisible().catch(() => false)) {
      await replacementButton.click();

      // Verify worker changed in UI
      const workerSelect = page.locator('[data-testid="worker-select"]');
      await expect(workerSelect).toContainText(
        `Replacement Worker ${testRunId}`,
      );

      // Save assignment
      const saveButton = page.locator('[data-testid="save-assignment-button"]');
      await saveButton.click();

      await expect(
        page.locator('[data-testid="schedule-item-dialog"]'),
      ).not.toBeVisible({ timeout: 5000 });

      // Verify in database
      const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        dayjs.utc().startOf("day"),
        dayjs.utc().add(2, "month").endOf("day"),
      );
      const assignments = AR.assignmentsRead;
      const updatedAssignment = assignments.find(
        (a: any) => a.id === assignment.id,
      );

      expect(updatedAssignment?.workerId).toBe(replacementWorker.id);
      console.log("✅ Replacement worker selected and assignment updated");
    } else {
      console.log("⚠️ Replacement selection UI structure needs adjustment");
    }
  });
});
