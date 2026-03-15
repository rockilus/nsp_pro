/**
 * Scoped Solve Fixture Factory
 *
 * Creates all entities needed for scoped-solve E2E tests dynamically at call time.
 * Campaign dates are always 2 months in the future (start of that month).
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DatabaseTestUtils } from "../utils/database-utils";
import { WorkerT } from "../../src/types/worker";
import { ShiftT, ShiftType, ShiftRestType } from "../../src/types/shift";
import { ShiftDemandDTO } from "../../src/types/shiftDemand";
import { ScheduleT } from "../../src/types/schedule";

dayjs.extend(utc);

export interface ScopedSolveFixtureResult {
  workers: WorkerT[];
  shifts: {
    morning: ShiftT;
    afternoon: ShiftT;
    duty: ShiftT;
    recuperation: ShiftT;
  };
  shiftDemands: ShiftDemandDTO[];
  schedule: ScheduleT;
  campaignStart: dayjs.Dayjs;
  campaignEnd: dayjs.Dayjs;
  /** First Monday in the campaign month */
  firstMonday: dayjs.Dayjs;
  /** First Saturday in the campaign month */
  firstSaturday: dayjs.Dayjs;
}

/**
 * Compute the first occurrence of a given day-of-week (0=Sun..6=Sat) in the month
 * @param monthStart - first day of the target month (UTC)
 * @param targetDay  - 0(Sun)..6(Sat)
 */
function firstDayOfWeekInMonth(
  monthStart: dayjs.Dayjs,
  targetDay: number,
): dayjs.Dayjs {
  const startDow = monthStart.day(); // 0=Sun..6=Sat
  let offset = targetDay - startDow;
  if (offset < 0) offset += 7;
  return monthStart.add(offset, "day");
}

/**
 * Create all entities for the scoped-solve test scenario.
 *
 * Campaign: start-of-month that is 2 months from now (UTC).
 * Creates 10 workers, 4 shifts, shift demands, and 1 campaign schedule.
 */
export async function createScopedSolveFixture(
  dbUtils: DatabaseTestUtils,
  teamId: string,
): Promise<ScopedSolveFixtureResult> {
  const campaignStart = dayjs.utc().add(2, "month").startOf("month");
  const campaignEnd = campaignStart.endOf("month").startOf("day");

  console.log(
    `📅 Scoped solve fixture: campaign ${campaignStart.format("YYYY-MM-DD")} → ${campaignEnd.format("YYYY-MM-DD")}`,
  );

  // ------------------------------------------------------------------
  // 1. Workers (10 workers)
  // ------------------------------------------------------------------
  const employmentStartDate = campaignStart.subtract(4, "month").toDate();

  const workerDefs = [
    { name: "Alice Moreau", acronym: "ALM", weeklyHours: 35 },
    { name: "Bruno Lenz", acronym: "BRL", weeklyHours: 38 },
    { name: "Clara Petit", acronym: "CLP", weeklyHours: 40 },
    { name: "David Mayer", acronym: "DVM", weeklyHours: 36 },
    { name: "Eva Roux", acronym: "EVR", weeklyHours: 37 },
    { name: "Felix Sanz", acronym: "FLS", weeklyHours: 39 },
    { name: "Grace Wolff", acronym: "GRW", weeklyHours: 35 },
    { name: "Hugo Blanc", acronym: "HGB", weeklyHours: 40 },
    { name: "Iris Kohl", acronym: "IRK", weeklyHours: 38 },
    { name: "Jonas Favre", acronym: "JNF", weeklyHours: 36 },
  ];

  const workers = await Promise.all(
    workerDefs.map((w) =>
      dbUtils.createWorker({
        teamId,
        name: w.name,
        acronym: w.acronym,
        weeklyHours: w.weeklyHours,
        weeklyHoursDesired: w.weeklyHours,
        employmentStartDate,
        employmentEndDate: null,
      }),
    ),
  );

  console.log(`✅ Created ${workers.length} workers`);

  // ------------------------------------------------------------------
  // 2. Shifts
  // ------------------------------------------------------------------
  const shiftMorning = await dbUtils.createShift({
    teamId,
    name: "Morning",
    acronym: "MOR",
    shiftType: ShiftType.NORMAL,
    startTime: campaignStart.hour(7).minute(0).second(0),
    endTime: campaignStart.hour(15).minute(0).second(0),
  });

  const shiftAfternoon = await dbUtils.createShift({
    teamId,
    name: "Afternoon",
    acronym: "AFT",
    shiftType: ShiftType.NORMAL,
    startTime: campaignStart.hour(15).minute(0).second(0),
    endTime: campaignStart.hour(23).minute(0).second(0),
  });

  const shiftDuty = await dbUtils.createShift({
    teamId,
    name: "Duty",
    acronym: "DUT",
    shiftType: ShiftType.DUTY,
    startTime: campaignStart.hour(8).minute(0).second(0),
    endTime: campaignStart.add(1, "day").hour(8).minute(0).second(0),
    recuperationTime: 24,
  });

  const shiftRecuperation = await dbUtils.createShift({
    teamId,
    name: "Recuperation",
    acronym: "REC",
    shiftType: ShiftType.REST,
    restType: ShiftRestType.RECUPERATION,
    startTime: campaignStart.hour(8).minute(0).second(0),
    endTime: campaignStart.add(1, "day").hour(8).minute(0).second(0),
    recuperationDutyId: shiftDuty.id,
  });

  console.log(`✅ Created 4 shifts`);

  // ------------------------------------------------------------------
  // 3. Shift demands
  // ------------------------------------------------------------------
  // Collect all dates in the campaign month
  const allDates: dayjs.Dayjs[] = [];
  const weekdayDates: dayjs.Dayjs[] = [];

  let cursor = campaignStart;
  while (cursor.isBefore(campaignEnd) || cursor.isSame(campaignEnd, "day")) {
    allDates.push(cursor);
    const dow = cursor.day(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      weekdayDates.push(cursor);
    }
    cursor = cursor.add(1, "day");
  }

  // Build demand creation tasks in batches
  const demandTasks: Promise<ShiftDemandDTO>[] = [];

  // Morning count=1 on every weekday
  for (const date of weekdayDates) {
    demandTasks.push(
      dbUtils.createShiftDemand({
        teamId,
        shiftId: shiftMorning.id,
        date,
        count: 1,
        source: "manual",
      }),
    );
  }

  // Afternoon count=1 on every weekday
  for (const date of weekdayDates) {
    demandTasks.push(
      dbUtils.createShiftDemand({
        teamId,
        shiftId: shiftAfternoon.id,
        date,
        count: 1,
        source: "manual",
      }),
    );
  }

  // Duty count=1 on every calendar day
  for (const date of allDates) {
    demandTasks.push(
      dbUtils.createShiftDemand({
        teamId,
        shiftId: shiftDuty.id,
        date,
        count: 1,
        source: "manual",
      }),
    );
  }

  // Run in batches of 10 to avoid overwhelming the API
  const BATCH_SIZE = 10;
  const shiftDemands: ShiftDemandDTO[] = [];
  for (let i = 0; i < demandTasks.length; i += BATCH_SIZE) {
    const batch = demandTasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch);
    shiftDemands.push(...results);
  }

  console.log(`✅ Created ${shiftDemands.length} shift demands`);

  // ------------------------------------------------------------------
  // 4. Campaign schedule
  // ------------------------------------------------------------------
  const rawSchedule = await dbUtils.createSchedule(teamId);
  const schedule = await dbUtils.updateSchedule({
    ...rawSchedule,
    startDate: campaignStart,
    endDate: campaignEnd,
  });

  console.log(`✅ Created campaign schedule: ${schedule.id}`);

  // ------------------------------------------------------------------
  // 5. Helper dates
  // ------------------------------------------------------------------
  const firstMonday = firstDayOfWeekInMonth(campaignStart, 1); // 1 = Monday
  const firstSaturday = firstDayOfWeekInMonth(campaignStart, 6); // 6 = Saturday

  return {
    workers,
    shifts: {
      morning: shiftMorning,
      afternoon: shiftAfternoon,
      duty: shiftDuty,
      recuperation: shiftRecuperation,
    },
    shiftDemands,
    schedule,
    campaignStart,
    campaignEnd,
    firstMonday,
    firstSaturday,
  };
}
