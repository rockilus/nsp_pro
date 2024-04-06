import React, { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
// Components
import ScheduleTable from "./ScheduleTable";
// Types
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
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  schedules: ScheduleT[];
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ShiftTable({
  team,
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
      lastPastDate: dayjs.Dayjs | null,
      lastValidDate: dayjs.Dayjs | null
    ): ColumnT[] => {
      const columns: ColumnT[] = [
        {
          date: dayjs(0),
          name: "",
          noCoverage: false,
          status: "",
          schedule: null,
        },
      ];
      let currentDate = startDate;

      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        day: "numeric",
        month: "short",
      };
      while (currentDate <= endDate) {
        const schedule = schedules.find(
          (s) =>
            (s.startDate.isBefore(currentDate) &&
              s.endDate.isAfter(currentDate)) ||
            s.startDate.isSame(currentDate) ||
            s.endDate.isSame(currentDate)
        );
        const column: ColumnT = {
          date: dayjs(currentDate),
          name: currentDate.format("ddd, MMM D"),
          noCoverage:
            schedule?.status === "WIP"
              ? schedule.missingCoverageDates.some((date) =>
                  date.isSame(currentDate)
                )
              : false || false,
          status:
            lastPastDate && currentDate.isBefore(lastPastDate.add(1, "day"))
              ? "past"
              : lastValidDate &&
                currentDate.isBefore(lastValidDate.add(1, "day"))
              ? "validated"
              : "wip",
          schedule: schedule ? schedule : null,
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
    for (let shift of shifts.filter((s) => !s.isTimeOff)) {
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

  useEffect(() => {
    if (columns.length > 0 && assignments.length > 0) {
      setRows(buildShiftRows());
    }
  }, [columns, assignments, buildShiftRows]);

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
      team={team}
      columns={columns}
      rows={rows}
      displayCBs={displayCBs}
      CBsDisplayed={CBsDisplayed}
    />
  );
}
