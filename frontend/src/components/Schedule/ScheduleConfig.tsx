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
  shiftSchedule: boolean;
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleConfig({
  schedules,
  assignments,
  objectiveBreaches,
  workers,
  shifts,
  shiftSchedule,
  displayCBs,
  CBsDisplayed,
}: Props) {
  const [columns, setColumns] = useState<ColumnT[]>([]);
  const [rows, setRows] = useState<RowT[]>([]);

  // console.log("assignments", assignments);

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

  const assignmentConflictsShift = useCallback(
    (assignment: AssignmentT): ObjectiveBreachT[] => {
      return objectiveBreaches.filter(
        (ob) =>
          (ob.objectiveCategory === "constraint" &&
            ob.variables.some(
              (variable) =>
                variable.workerId === assignment.workerId &&
                variable.date.isSame(assignment.date) &&
                variable.shiftId === assignment.shiftId
            )) ||
          (["fixed_assignment", "request"].includes(ob.objectiveCategory) &&
            ob.variables.some(
              (variable) =>
                variable.workerId === assignment.workerId &&
                variable.date.isSame(assignment.date)
            ))
      );
    },
    [objectiveBreaches]
  );

  const buildColumnHeaders = useCallback(
    (
      startDate: dayjs.Dayjs,
      endDate: dayjs.Dayjs,
      lastPastDate: dayjs.Dayjs,
      lastValidDate: dayjs.Dayjs
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
          status: currentDate.isBefore(lastPastDate.add(1, "day"))
            ? "past"
            : currentDate.isBefore(lastValidDate.add(1, "day"))
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

  const buildShiftRows = useCallback((): RowT[] => {
    const newRows: RowT[] = [];
    const dateColumns = columns.filter((c: ColumnT) => c.date.valueOf() !== 0);
    for (let shift of shifts.filter((s) => s.name !== "Off")) {
      const shiftAssignments = assignments.filter(
        (a) => a.shiftId === shift.id
      );
      const assignmentsOnDates = dateColumns.map((d) =>
        shiftAssignments.filter((a) => a.date.isSame(d.date))
      );
      const rowSpan = assignmentsOnDates.reduce(
        (max: number, arr) => Math.max(max, arr.length),
        0
      );
      for (let i = 0; i < rowSpan; i++) {
        const row: RowT = [];
        if (i === 0) {
          const newHeaderCell: CellT = {
            date: dayjs(0),
            value: shift.name,
            rowSpan: rowSpan,
            noCoverage: false,
            objectiveBreach: [],
          };
          row.push(newHeaderCell);
        }
        for (let j = 0; j < dateColumns.length; j++) {
          const assignment = assignmentsOnDates[j][i];
          const workerName = assignment
            ? workers.find((w) => w.id === assignment.workerId)?.name || ""
            : "";
          const newCell: CellT = {
            date: dateColumns[j].date,
            value: workerName,
            rowSpan: 1,
            noCoverage: dateColumns[j].noCoverage,
            objectiveBreach: assignment
              ? assignmentConflictsShift(assignment)
              : [],
          };

          row.push({
            ...newCell,
          });
        }
        newRows.push(row.slice());
      }
    }
    return newRows;
  }, [columns, assignments, workers, shifts, assignmentConflictsShift]);

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
      if (shiftSchedule) {
        setRows(buildShiftRows());
      } else {
        setRows(buildWorkerRows());
      }
    }
  }, [columns, assignments, shiftSchedule, buildShiftRows, buildWorkerRows]);

  useEffect(() => {
    if (assignments.length > 0) {
      const startDate = assignments.reduce(
        (min, a) => (a.date.isBefore(min) ? a.date : min),
        assignments[0].date
      );
      const lastPastDate = assignments.reduce(
        (max, a) => (a.date.isAfter(max) && a.status === "past" ? a.date : max),
        assignments[0].date
      );
      const lastValidDate = assignments.reduce(
        (max, a) =>
          a.date.isAfter(max) && a.status === "validated" ? a.date : max,
        assignments[0].date
      );
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
