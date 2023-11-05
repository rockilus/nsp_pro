import React, { useCallback, useEffect, useState } from "react";

import ScheduleTable from "./ScheduleTable";
import {
  ShiftIdNameT,
  WorkerIdNameT,
  ColumnT,
  RowT,
  CellT,
  AssignmentT,
  ScheduleT,
  ConstraintBreachT,
} from "./types";

interface Props {
  schedule: ScheduleT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  shiftSchedule: boolean;
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleConfig({
  schedule,
  workers,
  shifts,
  shiftSchedule,
  displayCBs,
  CBsDisplayed,
}: Props) {
  const [columns, setColumns] = useState<ColumnT[]>([]);
  const [rows, setRows] = useState<RowT[]>([]);

  const assignmentInConflictsWorker = useCallback(
    (assignment: AssignmentT): ConstraintBreachT[] => {
      return schedule.comments.constraintBreaches.filter((cb) =>
        cb.variables.some(
          (variable) =>
            variable[0] === assignment.workerId &&
            variable[1].getTime() === assignment.date.getTime()
        )
      );
    },
    [schedule]
  );

  const assignmentConflictsShift = useCallback(
    (assignment: AssignmentT): ConstraintBreachT[] => {
      return schedule.comments.constraintBreaches.filter(
        (cb) =>
          (cb.category === "constraint" &&
            cb.variables.some(
              (variable) =>
                variable[1].getTime() === assignment.date.getTime() &&
                variable[2] === assignment.shiftId
            )) ||
          (["fixed_assignment", "request"].includes(cb.category) &&
            cb.variables.some(
              (variable) =>
                variable[0] === assignment.workerId &&
                variable[1].getTime() === assignment.date.getTime()
            ))
      );
    },
    [schedule]
  );

  const buildColumnHeaders = useCallback(
    (startDate: Date, endDate: Date): ColumnT[] => {
      const columns: ColumnT[] = [
        { date: new Date(0), name: "", noCoverage: false },
      ];
      let currentDate = startDate;
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        day: "numeric",
        month: "short",
      };
      while (currentDate <= endDate) {
        const column: ColumnT = {
          date: new Date(currentDate),
          name: new Intl.DateTimeFormat("en-US", options).format(currentDate),
          noCoverage: schedule.comments.missingCoverageDates.some(
            (date) => date.getTime() === currentDate.getTime()
          ),
        };
        columns.push({ ...column });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return columns;
    },
    [schedule.comments.missingCoverageDates]
  );

  const buildShiftRows = useCallback((): RowT[] => {
    const newRows: RowT[] = [];
    const dateColumns = columns.filter((c) => c.date.getTime() !== 0);
    for (let shift of shifts.filter((s) => s.name !== "Off")) {
      const shiftAssignments = schedule.assignments.filter(
        (a) => a.shiftId === shift.id
      );
      const assignments = dateColumns.map((d) =>
        shiftAssignments.filter((a) => a.date.getTime() === d.date.getTime())
      );
      const rowSpan = assignments.reduce(
        (max, arr) => Math.max(max, arr.length),
        0
      );
      for (let i = 0; i < rowSpan; i++) {
        const row: RowT = [];
        if (i === 0) {
          const newHeaderCell: CellT = {
            date: new Date(0),
            value: shift.name,
            rowSpan: rowSpan,
            noCoverage: false,
            constraintBreach: [],
          };
          row.push(newHeaderCell);
        }
        for (let j = 0; j < dateColumns.length; j++) {
          const assignment = assignments[j][i];
          const workerName = assignment
            ? workers.find((w) => w.id === assignment.workerId)?.name || ""
            : "";
          const newCell: CellT = {
            date: dateColumns[j].date,
            value: workerName,
            rowSpan: 1,
            noCoverage: dateColumns[j].noCoverage,
            constraintBreach: assignment
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
  }, [columns, schedule, workers, shifts, assignmentConflictsShift]);

  const buildWorkerRows = useCallback((): RowT[] => {
    const newRows: RowT[] = [];
    for (let worker of workers) {
      const row: RowT = [];
      const assignments = schedule.assignments.filter(
        (a) => a.workerId === worker.id
      );
      const newHeaderCell: CellT = {
        date: new Date(0),
        value: worker.name,
        rowSpan: 1,
        noCoverage: false,
        constraintBreach: [],
      };
      row.push({
        ...newHeaderCell,
      });
      for (let column of columns.filter((c) => c.date.getTime() !== 0)) {
        const assignment = assignments.find(
          (a) => a.date.getTime() === column.date.getTime()
        );
        const shiftName = assignment
          ? shifts.find((s) => s.id === assignment.shiftId)?.name || ""
          : "";
        const newCell: CellT = {
          date: column.date,
          value: shiftName,
          rowSpan: 1,
          noCoverage: column.noCoverage,
          constraintBreach: assignment
            ? assignmentInConflictsWorker(assignment)
            : [],
        };
        row.push({
          ...newCell,
        });
      }
      newRows.push(row.slice());
    }
    return newRows;
  }, [columns, schedule, workers, shifts, assignmentInConflictsWorker]);

  useEffect(() => {
    if (columns.length > 0 && schedule) {
      if (shiftSchedule) {
        setRows(buildShiftRows());
      } else {
        setRows(buildWorkerRows());
      }
    }
  }, [columns, schedule, shiftSchedule, buildShiftRows, buildWorkerRows]);

  useEffect(() => {
    if (schedule) {
      setColumns(buildColumnHeaders(schedule.startDate, schedule.endDate));
    }
  }, [schedule, buildColumnHeaders]);

  return (
    <ScheduleTable
      columns={columns}
      rows={rows}
      displayCBs={displayCBs}
      CBsDisplayed={CBsDisplayed}
    />
  );
}
