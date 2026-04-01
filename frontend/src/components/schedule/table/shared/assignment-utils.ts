import dayjs from 'dayjs';
// Types
import { BreachT } from '@/types/breach';
import { AssignmentT } from '@/types/assignment';
import { WorkerT } from '../../../../types/worker';
import { ShiftT, ShiftRestType } from '../../../../types/shift';
import { RequestT } from '../../../../types/request';
import { AttributeOwnerType } from '../../../../types/attribute';
import { RecurrenceRuleT } from '@/types/recurrence';
import { ShiftDemandDTO } from '@/types/shiftDemand';
import { AssignmentsDictT, ShiftDemandsDictT, ScheduleCellsDictT } from '@/types/schedule';

export const generateOwnerIdDateKey = (ownerId: string, date: dayjs.Dayjs): string => {
  return `${ownerId}-${date.format('YYYY-MM-DD')}`;
};

export const buildAssignmentsDataByOwnerAndDate = (
  ownerType: AttributeOwnerType,
  assignments: AssignmentT[],
  recurrences: RecurrenceRuleT[],
  workers: WorkerT[],
  shifts: ShiftT[],
  breaches: BreachT[],
  requests: RequestT[],
): AssignmentsDictT => {
  const assignmentDict: AssignmentsDictT = {};

  // Precompute a map of recurrences by recurrenceId
  const recurrenceMap = new Map<string, RecurrenceRuleT>();
  recurrences.forEach((recurrence) => {
    recurrenceMap.set(recurrence.id, recurrence);
  });

  // Precompute a map of breaches by shiftId and date
  const breachMap = new Map<string, BreachT[]>();
  breaches.forEach((breach) => {
    breach.variables.forEach((variable) => {
      const key = `${variable.shiftId}-${variable.date.format('YYYY-MM-DD')}`;
      if (!breachMap.has(key)) {
        breachMap.set(key, []);
      }
      breachMap.get(key)!.push(breach);
    });
  });

  // Precompute a map of requests by shiftId and date range
  const requestMap = new Map<string, RequestT[]>();
  requests.forEach((request) => {
    if (!request.shiftId) return; // TO COME
    const key = request.shiftId;
    if (!requestMap.has(key)) {
      requestMap.set(key, []);
    }
    requestMap.get(key)!.push(request);
  });

  assignments.forEach((assignment) => {
    const worker = workers.find((w) => w.id === assignment.workerId);
    const shift = shifts.find((s) => s.id === assignment.shiftId);
    if (!worker || !shift) return;

    const ownerId = ownerType === AttributeOwnerType.WORKER ? worker.id : shift.id;
    const ownerDateKey = generateOwnerIdDateKey(ownerId, assignment.date);

    // Get the recurrence for the assignment
    const recurrence = assignment.sourceId ? recurrenceMap.get(assignment.sourceId) || null : null;

    // Get associated breaches using the precomputed map
    const breachKey = `${shift.id}-${assignment.date.format('YYYY-MM-DD')}`;
    const associatedBreaches = breachMap.get(breachKey) || [];

    // Get associated requests using the precomputed map
    const associatedRequests = (requestMap.get(shift.id) || []).filter(
      (request) =>
        request.startDate.isSameOrBefore(assignment.date, 'day') &&
        request.endDate.isSameOrAfter(assignment.date, 'day'),
    );

    if (shift.restType === ShiftRestType.RECUPERATION && shift.recuperationDutyId) {
      const referenceShift = shifts.find((s) => s.id === shift.recuperationDutyId);
      if (referenceShift && !referenceShift.startTime.isSame(referenceShift.endTime, 'day')) {
        const shiftAssignmentStartDate = assignment.date.add(1, 'day');
        const nextDayKey = generateOwnerIdDateKey(ownerId, shiftAssignmentStartDate);
        if (!assignmentDict[nextDayKey]) {
          assignmentDict[nextDayKey] = [];
        }
        assignmentDict[nextDayKey].push({
          worker,
          shift,
          assignment,
          recurrence,
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
      recurrence,
      breaches: associatedBreaches,
      requests: associatedRequests,
    });
  });

  return assignmentDict;
};

export const buildShiftDemandsDataByShiftAndDate = (
  shiftDemands: ShiftDemandDTO[],
  shifts: ShiftT[],
): ShiftDemandsDictT => {
  const shiftDemandDict: ShiftDemandsDictT = {};

  // Precompute a map of shifts by shiftId
  const shiftMap = new Map<string, ShiftT>();
  shifts.forEach((shift) => {
    shiftMap.set(shift.id, shift);
  });

  shiftDemands.forEach((shiftDemand) => {
    const shift = shiftMap.get(shiftDemand.shiftId);
    if (!shift) return;

    const ownerDateKey = generateOwnerIdDateKey(shift.id, dayjs.unix(shiftDemand.date));

    // Since there's only one demand per shift/date now, we can directly assign
    shiftDemandDict[ownerDateKey] = {
      shiftDemand: shiftDemand,
      shift: shift,
    };
  });

  return shiftDemandDict;
};

export const buildRequestsByWorkerAndDate = (
  requests: RequestT[],
): { [key: string]: RequestT[] } => {
  const requestDict: { [key: string]: RequestT[] } = {};

  requests.forEach((request) => {
    let currentDate = request.startDate;

    while (currentDate.isSameOrBefore(request.endDate, 'day')) {
      const ownerDateKey = generateOwnerIdDateKey(request.workerId, currentDate);

      if (!requestDict[ownerDateKey]) {
        requestDict[ownerDateKey] = [];
      }
      requestDict[ownerDateKey].push(request);

      currentDate = currentDate.add(1, 'day');
    }
  });

  return requestDict;
};

// Updated function using ShiftDemandDTO throughout - no legacy conversion
export const buildScheduleCellDict = (
  ownerType: AttributeOwnerType,
  assignments: AssignmentT[],
  shiftDemands: ShiftDemandDTO[],
  recurrences: RecurrenceRuleT[],
  requests: RequestT[],
  workers: WorkerT[],
  shifts: ShiftT[],
  breaches: BreachT[],
): ScheduleCellsDictT => {
  const assignmentDict = buildAssignmentsDataByOwnerAndDate(
    ownerType,
    assignments,
    recurrences,
    workers,
    shifts,
    breaches,
    requests,
  );

  let shiftDemandDict: ShiftDemandsDictT = {};
  let requestDict: { [key: string]: RequestT[] } = {};

  if (ownerType === AttributeOwnerType.SHIFT) {
    shiftDemandDict = buildShiftDemandsDataByShiftAndDate(shiftDemands, shifts);
  } else if (ownerType === AttributeOwnerType.WORKER) {
    requestDict = buildRequestsByWorkerAndDate(requests);
  }

  const allKeys = new Set([
    ...Object.keys(assignmentDict),
    ...Object.keys(shiftDemandDict),
    ...Object.keys(requestDict),
  ]);

  const scheduleCellDict: ScheduleCellsDictT = {};

  allKeys.forEach((key) => {
    scheduleCellDict[key] = {
      assignmentsData: assignmentDict[key] || [],
      shiftDemandsData: shiftDemandDict[key] || null,
      requests: requestDict[key] || [],
    };
  });

  return scheduleCellDict;
};
