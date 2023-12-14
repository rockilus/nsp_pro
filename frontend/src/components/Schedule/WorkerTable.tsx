import React, { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";

import ScheduleTable from "./ScheduleTable";
import {
  ShiftIdNameT,
  WorkerIdNameT,
  ColumnT,
  RowT,
  CellT,
  AssignmentT,
  ScheduleT,
  ObjectiveBreachT,
} from "./types";

interface Props {
  schedules: ScheduleT[];
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function WorkerTable({
  schedules,
  assignments,
  objectiveBreaches,
  workers,
  shifts,
  displayCBs,
  CBsDisplayed,
}: Props) {
  const [columns, setColumns] = useState<ColumnT[]>([]);
  const [rows, setRows] = useState<RowT[]>([]);

  const assignmentInConflictsWorker = useCallback(
    (assignment: AssignmentT): ObjectiveBreachT[] => {
      return objectiveBreaches.filter((ob) =>
        ob.variables.some(
          (variable) =>
            variable.workerId === assignment.workerId &&
            variable.date.isSame(assignment.date)
        )
      );
    },
    [objectiveBreaches]
  );

  const buildColumnHeaders = useCallback(
    (
      startDate: dayjs.Dayjs,
      endDate: dayjs.Dayjs,
      lastPastDate: dayjs.Dayjs | null,
      lastValidDate: dayjs.Dayjs | null
    ): ColumnT[] => {
      const columns: ColumnT[] = [
        { date: dayjs(0), name: "", noCoverage: false, status: "" },
      ];
      let currentDate = startDate;

      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        day: "numeric",
        month: "short",
      };
      while (currentDate <= endDate) {
        const column: ColumnT = {
          date: dayjs(currentDate),
          name: currentDate.format("ddd, MMM D"),
          noCoverage:
            schedules
              .find((s) => s.status === "WIP")
              ?.missingCoverageDates.some((date) => date.isSame(currentDate)) ||
            false,
          status:
            lastPastDate && currentDate.isBefore(lastPastDate.add(1, "day"))
              ? "past"
              : lastValidDate &&
                currentDate.isBefore(lastValidDate.add(1, "day"))
              ? "validated"
              : "wip",
        };
        columns.push({ ...column });
        currentDate = currentDate.add(1, "day");
      }
      return columns;
    },
    [schedules]
  );

  const buildWorkerRows = useCallback((): RowT[] => {
    const newRows: RowT[] = [];
    for (let worker of workers) {
      const row: RowT = [];
      const assignmentsWorker = assignments.filter(
        (a) => a.workerId === worker.id
      );
      const newHeaderCell: CellT = {
        date: dayjs(0),
        value: worker.name,
        rowSpan: 1,
        noCoverage: false,
        objectiveBreach: [],
      };
      row.push({
        ...newHeaderCell,
      });
      for (let column of columns.filter(
        (c: ColumnT) => c.date.valueOf() !== 0
      )) {
        const assignmentOnDate = assignmentsWorker.find((a: AssignmentT) =>
          a.date.isSame(column.date)
        );
        const shiftName = assignmentOnDate
          ? shifts.find((s) => s.id === assignmentOnDate.shiftId)?.name || ""
          : "";
        const newCell: CellT = {
          date: column.date,
          value: shiftName,
          rowSpan: 1,
          noCoverage: column.noCoverage,
          objectiveBreach: assignmentOnDate
            ? assignmentInConflictsWorker(assignmentOnDate)
            : [],
        };
        row.push({
          ...newCell,
        });
      }
      newRows.push(row.slice());
    }

    return newRows;
  }, [columns, assignments, workers, shifts, assignmentInConflictsWorker]);

  useEffect(() => {
    if (columns.length > 0 && assignments.length > 0) {
      setRows(buildWorkerRows());
    }
  }, [columns, assignments, buildWorkerRows]);

  useEffect(() => {
    if (assignments.length > 0) {
      const startDate = assignments.reduce(
        (min, a) => (a.date.isBefore(min) ? a.date : min),
        assignments[0].date
      );
      const pastAssignments = assignments.filter((a) => a.status === "past");
      const validatedAssignments = assignments.filter(
        (a) => a.status === "validated"
      );
      const lastPastDate =
        pastAssignments.length > 0
          ? pastAssignments.reduce(
              (max, a) => (a.date.isAfter(max) ? a.date : max),
              pastAssignments[0].date
            )
          : null;
      const lastValidDate =
        validatedAssignments.length > 0
          ? validatedAssignments.reduce(
              (max, a) =>
                a.date.isAfter(max) && a.status === "validated" ? a.date : max,
              validatedAssignments[0].date
            )
          : null;
      const endDate = assignments.reduce(
        (max, a) => (a.date.isAfter(max) ? a.date : max),
        assignments[0].date
      );
      setColumns(
        buildColumnHeaders(startDate, endDate, lastPastDate, lastValidDate)
      );
    } else {
      setColumns([]);
    }
  }, [assignments, buildColumnHeaders]);

  return (
    <ScheduleTable
      columns={columns}
      rows={rows}
      displayCBs={displayCBs}
      CBsDisplayed={CBsDisplayed}
    />
  );
}
