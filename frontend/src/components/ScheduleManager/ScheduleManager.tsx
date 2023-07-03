import React, { useContext, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import minMax from "dayjs/plugin/minMax";

import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import {
  DataGrid,
  GridColDef,
  GridCellParams,
  GridRowsProp,
} from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { HospitalContext } from "../../context/HospitalContext";
import { ScheduleContext } from "../../context/ScheduleContext";
import { Schedule } from "../../types";

dayjs.extend(minMax);

function createSlotDatesArray(startDate: Dayjs, endDate: Dayjs): Dayjs[] {
  const datesArray: Dayjs[] = [];

  let currentDate = startDate;

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
    datesArray.push(currentDate);
    currentDate = currentDate.add(1, "day");
  }

  return datesArray;
}

export default function ScheduleManager() {
  const hospitalContext = useContext(HospitalContext);
  const scheduleContext = useContext(ScheduleContext);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(3, "month"));

  const handleClick = async () => {
    await scheduleContext.getScheduleList(
      hospitalContext.currentHospital?._id ?? "",
      startDate,
      endDate
    );
  };

  const buildRowSlots = () => {
    const rowSlots = [];
    for (const schedule of scheduleContext.currentScheduleList ?? []) {
      const rowSlot = Array(slotDatesLookup.length).fill("");
      const start = dayjs.max(dayjs(schedule.start_date), startDate);
      const end = dayjs.min(dayjs(schedule.end_date), endDate);
      const indexStart = slotDatesLookup.findIndex((date) =>
        date.startOf("day").isSame(start.startOf("day"))
      );
      const indexEnd = slotDatesLookup.findIndex((date) =>
        date.startOf("day").isSame(end.startOf("day"))
      );
      for (let i = indexStart; i <= indexEnd; i += 1) {
        rowSlot[i] = schedule._id;
      }
      rowSlots.push(rowSlot);
    }
    return rowSlots;
  };

  const slotDatesLookup = createSlotDatesArray(startDate, endDate);

  const scheduleRowSlots = buildRowSlots();

  interface RowData {
    id: number;
    rowLabel: string;
    slots: string[];
  }

  const rows: GridRowsProp =
    ((scheduleContext?.currentScheduleList || [])
      .map((schedule: Schedule, index): RowData | null => {
        return {
          id: index,
          rowLabel: schedule._id,
          slots: scheduleRowSlots[index],
        };
      })
      .filter(Boolean) as RowData[]) || [];

  const slotColumnCommonFields: Partial<GridColDef> = {
    cellClassName: (params) => params.value,
    colSpan: ({ row, field, value }: GridCellParams) => {
      const index = Number(field);
      let colSpan = 1;

      for (let i = index + 1; i < row.slots.length; i += 1) {
        const nextValue = row.slots[i];

        if (nextValue === value) {
          colSpan += 1;
        } else {
          break;
        }
      }
      return colSpan;
    },
  };

  const columns: GridColDef[] = [
    {
      field: "rowLabel",
      headerName: "",
      flex: 1,
      minWidth: 100,
      sortable: false,
      renderCell: (params) => params.row.rowLabel,
    },
    ...slotDatesLookup.map((dateHeader, index) => {
      return {
        field: index.toString(),
        headerName: dateHeader.format("D"),
        description: dateHeader.format("dddd D"),
        flex: 0.25,
        minWidth: 40,
        sortable: false,
        colIndex: index,
        valueGetter: ({ row }: any) => row.slots[index],
        ...slotColumnCommonFields,
      };
    }),
  ];

  return (
    <Box>
      <Grid
        container
        direction="row"
        justifyContent="flex-start"
        alignItems="center"
        spacing={2}
      >
        <Grid item>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => {
              if (newValue !== null) {
                setStartDate(newValue);
              }
            }}
          />
        </Grid>
        <Grid item>
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => {
              if (newValue !== null) {
                setEndDate(newValue);
              }
            }}
          />
        </Grid>
        <Grid item>
          <Button variant="contained" color="primary" onClick={handleClick}>
            Get Schedule
          </Button>
        </Grid>
      </Grid>

      <DataGrid
        columns={columns}
        rows={rows}
        autoHeight
        disableRowSelectionOnClick
        hideFooter
        showCellVerticalBorder
        showColumnVerticalBorder
        disableColumnMenu
      />
    </Box>
  );
}
