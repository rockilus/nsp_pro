import React, { useCallback, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import ScheduleTable from "./ScheduleTable";

import { ShiftScheduleT, WorkerScheduleT } from "./types";
import { useScheduleStore } from "../../stores/scheduleStore";

interface Props {
  workers: WorkerScheduleT[];
  shifts: ShiftScheduleT[];
}

export default function ScheduleConfig({ workers, shifts }: Props) {
  const [columns, setColumns] = useState<(string | Date)[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [shiftSchedule, setShiftSchedule] = useState<boolean>(true);

  const schedule = useScheduleStore((state) => state.schedule);
  const fetchSchedule = useScheduleStore((state) => state.fetchSchedule);

  const buildDatesArray = (startDate: Date, endDate: Date): Date[] => {
    const dates = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const buildShiftRows = useCallback(() => {
    const newRows = [];
    const dateColumns = columns
      .filter((c) => c instanceof Date)
      .map((c) => c as Date);
    for (let shift of shifts.filter((s) => s.name !== "Off")) {
      const shiftAssignments = schedule.assignments.filter(
        (a) => a.shiftId === shift.id
      );
      const assignments = dateColumns.map((d) =>
        shiftAssignments.filter((a) => a.date.getTime() === d.getTime())
      );
      const rowSpan = assignments.reduce(
        (max, arr) => Math.max(max, arr.length),
        0
      );
      for (let i = 0; i < rowSpan; i++) {
        const row = [];
        i === 0 &&
          row.push({
            rowSpan: rowSpan,
            value: shift.name,
            column: "",
          });
        for (let j = 0; j < dateColumns.length; j++) {
          const assignment = assignments[j][i];
          const workerName = assignment
            ? workers.find((w) => w.id === assignment.workerId)?.name || ""
            : "";
          const rowContent = {
            value: workerName,
            column: dateColumns[j],
          };

          row.push({
            ...rowContent,
          });
        }
        newRows.push(row.slice());
      }
    }
    return newRows;
  }, [columns, schedule, workers, shifts]);

  const buildWorkerRows = useCallback(() => {
    const newRows = [];
    for (let worker of workers) {
      const row = [];
      const assignments = schedule.assignments.filter(
        (a) => a.workerId === worker.id
      );
      const rowHeader = {
        value: worker.name,
        column: "",
      };
      row.push({
        ...rowHeader,
      });
      for (let column of columns.filter((c) => c instanceof Date)) {
        const assignment = assignments.find(
          (a) => a.date.getTime() === column.getTime()
        );
        const shiftName = assignment
          ? shifts.find((s) => s.id === assignment.shiftId)?.name || ""
          : "";
        const rowContent = {
          value: shiftName,
          column: column,
        };
        row.push({
          ...rowContent,
        });
      }
      newRows.push(row.slice());
    }
    return newRows;
  }, [columns, schedule, workers, shifts]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

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
      setColumns([
        "",
        ...buildDatesArray(schedule.startDate, schedule.endDate),
      ]);
    }
  }, [schedule]);

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Schedule
      </Typography>
      {/* <Button variant="contained" color="primary" onClick={fetchSchedule}>
        Solver
      </Button> */}
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
