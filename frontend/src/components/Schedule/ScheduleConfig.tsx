import React, { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import ScheduleTable from "./ScheduleTable";
import {
  ShiftIdNameT,
  WorkerIdNameT,
  ColumnT,
  RowT,
  CellT,
  ScheduleOptionsT,
} from "./types";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/requestStore";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ScheduleConfig({ workers, shifts }: Props) {
  const [columns, setColumns] = useState<ColumnT[]>([]);
  const [rows, setRows] = useState<RowT[]>([]);
  const [shiftSchedule, setShiftSchedule] = useState<boolean>(true);

  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOptionsT>({
    startDate: dateToTimeZero(new Date(Date.UTC(2023, 9, 2, 0, 0, 0))),
    endDate: dateToTimeZero(new Date(Date.UTC(2023, 9, 15, 0, 0, 0))),
  });

  const schedule = useScheduleStore((state) => state.schedule);
  // const fetchSchedule = useScheduleStore((state) => state.fetchSchedule);
  const addSchedule = useScheduleStore((state) => state.addSchedule);
  const fetchFixedAssignments = useFixedAssignmentStore(
    (state) => state.fetchFixedAssignments
  );
  const fetchRequests = useRequestStore((state) => state.fetchRequests);

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
          };

          row.push({
            ...newCell,
          });
        }
        newRows.push(row.slice());
      }
    }
    return newRows;
  }, [columns, schedule, workers, shifts]);

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
        };
        row.push({
          ...newCell,
        });
      }
      newRows.push(row.slice());
    }
    return newRows;
  }, [columns, schedule, workers, shifts]);

  // useEffect(() => {
  //   fetchSchedule();
  // }, [fetchSchedule]);

  useEffect(() => {
    if (schedule) {
      fetchFixedAssignments();
      fetchRequests();
    }
  }, [fetchFixedAssignments, fetchRequests, schedule]);

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
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Schedule
      </Typography>
      <Box>
        <DatePicker
          value={dayjs(scheduleOptions.startDate)}
          onChange={(newValue) =>
            setScheduleOptions({
              ...scheduleOptions,
              startDate: dateToTimeZero(newValue?.toDate() || new Date()),
            })
          }
        />
        <DatePicker
          value={dayjs(scheduleOptions.endDate)}
          onChange={(newValue) =>
            setScheduleOptions({
              ...scheduleOptions,
              endDate: dateToTimeZero(newValue?.toDate() || new Date()),
            })
          }
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => addSchedule(scheduleOptions)}
        >
          Solve
        </Button>
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShiftSchedule(!shiftSchedule)}
      >
        Shift/Worker
      </Button>
      <ScheduleTable columns={columns} rows={rows} />
    </Box>
  );
}
