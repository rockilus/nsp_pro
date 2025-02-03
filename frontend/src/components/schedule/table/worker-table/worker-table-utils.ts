import { WorkerT } from "../../../../types/worker";
import { AssignmentT, ScheduleT } from "../../../../types/schedule";

export const getRelevantWorkers = (
  workers: WorkerT[],
  assignments: AssignmentT[],
  schedule: ScheduleT | null
): WorkerT[] => {
  const workerIdsInAssignments = new Set(assignments.map((a) => a.workerId));

  if (!schedule) {
    return workers.filter((worker) => workerIdsInAssignments.has(worker.id));
  }

  const relevantWorkers = workers.filter(
    (worker) =>
      workerIdsInAssignments.has(worker.id) ||
      (!worker.deleted &&
        worker.employmentStartDate.isSameOrBefore(schedule.endDate, "day") &&
        (worker.employmentEndDate === null ||
          worker.employmentEndDate.isSameOrAfter(schedule.startDate, "day")))
  );

  return relevantWorkers;
};
