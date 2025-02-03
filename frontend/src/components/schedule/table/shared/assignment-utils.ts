import dayjs from "dayjs";
// Types
import {
  AssignmentT,
  BreachT,
  AssignmentDictT,
} from "../../../../types/schedule";
import { WorkerT } from "../../../../types/worker";
import { ShiftT, ShiftRestType } from "../../../../types/shift";
import { RequestT } from "../../../../types/request";
import { AttributeOwnerType } from "../../../../types/attribute";

export const generateOwnerIdDateKey = (
  ownerId: string,
  date: dayjs.Dayjs
): string => {
  return `${ownerId}-${date.format("YYYY-MM-DD")}`;
};

export const getAssignmentsDataByOwnerAndDate = (
  ownerType: AttributeOwnerType,
  assignments: AssignmentT[],
  workers: WorkerT[],
  shifts: ShiftT[],
  breaches: BreachT[],
  requests: RequestT[]
): AssignmentDictT => {
  const assignmentDict: AssignmentDictT = {};

  assignments.forEach((assignment) => {
    const worker = workers.find((w) => w.id === assignment.workerId);
    const shift = shifts.find((s) => s.id === assignment.shiftId);
    if (!worker || !shift) return;

    const ownerId =
      ownerType === AttributeOwnerType.WORKER ? worker.id : shift.id;
    const ownerDateKey = generateOwnerIdDateKey(ownerId, assignment.date);

    const associatedBreaches = breaches.filter((breach) =>
      breach.variables.some(
        (variable) =>
          variable.shiftId === shift.id &&
          variable.date.isSame(assignment.date, "day")
      )
    );

    const associatedRequests = requests.filter(
      (request) =>
        request.shiftId === shift.id &&
        request.startDate.isSameOrBefore(assignment.date, "day") &&
        request.endDate.isSameOrAfter(assignment.date, "day")
    );

    if (
      shift.restType === ShiftRestType.RECUPERATION &&
      shift.recuperationDutyId
    ) {
      const referenceShift = shifts.find(
        (s) => s.id === shift.recuperationDutyId
      );
      if (
        referenceShift &&
        !referenceShift.startTime.isSame(referenceShift.endTime, "day")
      ) {
        const shiftAssignmentStartDate = assignment.date.add(1, "day");
        const nextDayKey = generateOwnerIdDateKey(
          ownerId,
          shiftAssignmentStartDate
        );
        if (!assignmentDict[nextDayKey]) {
          assignmentDict[nextDayKey] = [];
        }
        assignmentDict[nextDayKey].push({
          worker,
          shift,
          assignment,
          breaches: associatedBreaches,
          requests: associatedRequests,
        });
        return;
      }
    }

    if (!assignmentDict[ownerDateKey]) {
      assignmentDict[ownerDateKey] = [];
    }
    assignmentDict[ownerDateKey].push({
      worker,
      shift,
      assignment,
      breaches: associatedBreaches,
      requests: associatedRequests,
    });
  });

  return assignmentDict;
};
