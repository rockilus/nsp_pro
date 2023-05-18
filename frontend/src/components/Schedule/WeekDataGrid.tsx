import React, { useContext } from "react";
import dayjs, { Dayjs } from "dayjs";
import { DataGrid, GridRowsProp, GridColDef } from "@mui/x-data-grid";

import { ScheduleContext } from "../../context/ScheduleContext";
import { ScheduleData } from "../../types";

interface WeekDataGridProps {
  dateArray: Dayjs[];
}

export default function WeekDataGrid(props: WeekDataGridProps) {
  const scheduleContext = useContext(ScheduleContext);

  interface RowData {
    id: string;
    rowLabel: string;
  }

  const rows: GridRowsProp =
    ((scheduleContext.currentSchedule?.shift_labels || [])
      .map((shift_label: string): RowData | null => {
        if (shift_label !== "off") {
          return {
            id: shift_label,
            rowLabel: shift_label,
          };
        }
        return null;
      })
      .filter(Boolean) as RowData[]) || [];

  const columns: GridColDef[] = [
    {
      field: "rowLabel",
      headerName: "",
      flex: 1,
      sortable: false,
      renderCell: (params) => params.row.rowLabel,
    },
    ...(props.dateArray?.map((dateHeader, index) => {
      return {
        field: `column${index}`,
        headerName: dateHeader.format("dddd D"),
        description: dateHeader.format("dddd D"),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          const cellData: ScheduleData | undefined =
            scheduleContext.currentScheduleData?.find(
              (item) =>
                item.shift_type_label === params.row.rowLabel &&
                dayjs(item.date).isSame(dateHeader)
            );
          console.log("cellData", cellData);

          return cellData ? cellData.user_last_name : "";
        },
      };
    }) || []),
  ];

  return (
    <div style={{ height: 300, width: "100%" }}>
      <DataGrid rows={rows} columns={columns} disableColumnMenu={true} />
    </div>
  );
}
