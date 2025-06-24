import dayjs from "dayjs";
// Types
import { ScheduleStatus, periodDateT } from "../../../../types/schedule";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { AssignmentT } from "@/types/assignment";
import { ShiftT, ShiftType } from "../../../../types/shift";

/**
 * Utility to convert ShiftDemandDTO to DailyShiftDemand-like structure for count calculations
 */
interface DailyShiftDemand {
  shiftId: string;
  date: dayjs.Dayjs;
  count: number;
}

function convertShiftDemandsToDailyFormat(
  shiftDemands: ShiftDemandDTO[]
): DailyShiftDemand[] {
  return shiftDemands.map((demand) => ({
    shiftId: demand.shiftId,
    date: dayjs.unix(demand.date),
    count: demand.count,
  }));
}

export const countShifts = (
  shifts: ShiftT[],
  assignments: AssignmentT[],
  shiftDemands: ShiftDemandDTO[],
  periodDates: periodDateT[]
) => {
  const dsds = convertShiftDemandsToDailyFormat(shiftDemands);
  const out: {
    [date: string]: {
      [id: string]: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
      total: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
    };
  } = {};

  const shiftsWorkNotDeleted = shifts.filter(
    (s) =>
      [ShiftType.NORMAL, ShiftType.DUTY].includes(s.shiftType) && !s.deleted
  );

  periodDates.forEach((periodDate) => {
    const dateStr = periodDate.date.format("YYYY-MM-DD");

    if (!out[dateStr]) {
      out[dateStr] = { total: { actual: 0, target: 0, staffingTotal: 0 } };
    }

    let totalActual = 0;
    let totalTarget = 0;
    let totalStaffing = 0;

    shiftsWorkNotDeleted.forEach((shift) => {
      const shiftAssignments = assignments.filter(
        (assignment) =>
          assignment.shiftId === shift.id &&
          assignment.date.isSame(periodDate.date, "day")
      );

      const shiftStaffingTotal = shift.staffing.reduce(
        (sum, staffing) => sum + staffing.staffing,
        0
      );

      if (!out[dateStr][shift.id]) {
        out[dateStr][shift.id] = {
          actual: 0,
          target: 0,
          staffingTotal: shiftStaffingTotal,
        };
      }

      const shiftActualCount = Math.floor(
        shiftAssignments.length / shiftStaffingTotal
      );
      out[dateStr][shift.id].actual += shiftActualCount;
      totalActual += shiftActualCount;

      dsds
        .filter(
          (dsd) =>
            dsd.shiftId === shift.id && dsd.date.isSame(periodDate.date, "day")
        )
        .forEach((dsd) => {
          out[dateStr][shift.id].target += dsd.count;
          totalTarget += dsd.count;
        });

      totalStaffing += shiftStaffingTotal;
    });

    out[dateStr].total.actual = totalActual;
    out[dateStr].total.target = totalTarget;
    out[dateStr].total.staffingTotal = totalStaffing;
  });

  return out;
};

export const countShiftsTotalPeriod = (
  shifts: ShiftT[],
  assignments: AssignmentT[],
  shiftDemands: ShiftDemandDTO[],
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
) => {
  const dsds = convertShiftDemandsToDailyFormat(shiftDemands);
  const shiftsWorkNotDeleted = shifts.filter(
    (s) =>
      [ShiftType.NORMAL, ShiftType.DUTY].includes(s.shiftType) && !s.deleted
  );
  const countTarget = shiftsWorkNotDeleted.reduce((totalSum, shift) => {
    const shiftSum = dsds
      .filter(
        (dsd) =>
          dsd.shiftId === shift.id &&
          dsd.date.isSameOrAfter(startDate, "day") &&
          dsd.date.isSameOrBefore(endDate, "day")
      )
      .reduce((sum, dsd) => sum + dsd.count, 0);
    return totalSum + shiftSum;
  }, 0);

  const countActual = shiftsWorkNotDeleted.reduce((totalSum, shift) => {
    // Calculate the total number of assignments for the shift within the date range
    const totalAssignments = assignments.filter(
      (assignment) =>
        assignment.shiftId === shift.id &&
        assignment.date.isSameOrAfter(startDate, "day") &&
        assignment.date.isSameOrBefore(endDate, "day")
    ).length;

    // Calculate the total staffing requirement for the shift
    const totalStaffing = shift.staffing.reduce(
      (sum, staffing) => sum + staffing.staffing,
      0
    );

    // Calculate the actual count by dividing total assignments by total staffing and rounding down
    const shiftActualCount = Math.floor(totalAssignments / totalStaffing);

    return totalSum + shiftActualCount;
  }, 0);

  return { countActual, countTarget };
};

export const countStaffings = (
  shifts: ShiftT[],
  assignments: AssignmentT[],
  shiftDemands: ShiftDemandDTO[],
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[]
) => {
  console.log("countStaffings called");
  const dsds = convertShiftDemandsToDailyFormat(shiftDemands);

  const out: {
    [date: string]: {
      [id: string]: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
      total: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
    };
  } = {};

  const shiftsWorkNotDeleted = shifts.filter(
    (s) =>
      [ShiftType.NORMAL, ShiftType.DUTY].includes(s.shiftType) && !s.deleted
  );
  const shiftMap: { [key: string]: ShiftT } = shiftsWorkNotDeleted.reduce(
    (map, shift) => {
      map[shift.id] = shift;
      return map;
    },
    {} as { [key: string]: ShiftT }
  );

  periodDates.forEach((periodDate) => {
    const dateStr = periodDate.date.format("YYYY-MM-DD");

    if (!out[dateStr]) {
      out[dateStr] = { total: { actual: 0, target: 0, staffingTotal: 0 } };
    }

    let totalActual = 0;
    let totalTarget = 0;
    let totalStaffing = 0;

    shiftsWorkNotDeleted.forEach((shift) => {
      const shiftAssignments = assignments.filter(
        (assignment) =>
          assignment.shiftId === shift.id &&
          assignment.date.isSame(periodDate.date, "day")
      );

      const shiftStaffingTotal = shift.staffing.reduce(
        (sum, staffing) => sum + staffing.staffing,
        0
      );

      if (!out[dateStr][shift.id]) {
        out[dateStr][shift.id] = {
          actual: 0,
          target: 0,
          staffingTotal: shiftStaffingTotal,
        };
      }

      const shiftActualCount = shiftAssignments.length;
      out[dateStr][shift.id].actual += shiftActualCount;
      totalActual += shiftActualCount;

      dsds
        .filter(
          (dsd) =>
            dsd.shiftId === shift.id && dsd.date.isSame(periodDate.date, "day")
        )
        .forEach((dsd) => {
          const shift = shiftMap[dsd.shiftId];
          if (shift && shift.staffing.length > 0) {
            // Sum all staffing counts for this shift
            const shiftTarget =
              shift.staffing.reduce(
                (shiftTotal, staffingEntry) =>
                  shiftTotal + staffingEntry.staffing,
                0
              ) * dsd.count;
            out[dateStr][shift.id].target += shiftTarget;
            totalTarget += shiftTarget;
          }
        });

      totalStaffing += shiftStaffingTotal;
    });

    out[dateStr].total.actual = totalActual;
    out[dateStr].total.target = totalTarget;
    out[dateStr].total.staffingTotal = totalStaffing;
  });

  return out;
};

//   const shiftsWorkNotDeleted = shifts.filter(
//     (s) =>
//       [ShiftType.NORMAL, ShiftType.DUTY].includes(s.shiftType) && !s.deleted
//   );
//   const shiftMap: { [key: string]: ShiftT } = shiftsWorkNotDeleted.reduce(
//     (map, shift) => {
//       map[shift.id] = shift;
//       return map;
//     },
//     {} as { [key: string]: ShiftT }
//   );

//   const countActual = assignments.filter(
//     (a) =>
//       shiftsWorkNotDeleted.some((s) => s.id === a.shiftId) &&
//       a.date.isSameOrAfter(startDate, "day") &&
//       a.date.isSameOrBefore(endDate, "day")
//   ).length;
//   const countTarget = dsds
//     .filter(
//       (dsd) =>
//         shiftsWorkNotDeleted.some((s) => s.id === dsd.shiftId) &&
//         dsd.date.isSameOrAfter(startDate, "day") &&
//         dsd.date.isSameOrBefore(endDate, "day")
//     )
//     .reduce((total, dsd) => {
//       const shift = shiftMap[dsd.shiftId];
//       if (shift && shift.staffing.length > 0) {
//         // Sum all staffing counts for this shift
//         const shiftStaffingTotal = shift.staffing.reduce(
//           (shiftTotal, staffingEntry) => shiftTotal + staffingEntry.staffing,
//           0
//         );
//         return total + shiftStaffingTotal * dsd.count;
//       }
//       return total;
//     }, 0);

//   return { countActual, countTarget };
// };
