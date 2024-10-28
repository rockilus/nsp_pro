import React from "react";
import dayjs from "dayjs";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import DateHeaderCell from "./date-header-cell";

export default function DatesHeaderRow({ dates }: { dates: dayjs.Dayjs[] }) {
  return (
    <TableRow>
      <TableCell
        sx={{
          position: "sticky",
          left: 0,
          backgroundColor: "#FFFFFF",
          padding: 0,
        }}
      >
        <div
          style={{
            width: "100px",
            padding: "10px",
          }}
        ></div>
      </TableCell>
      {dates.map((date, dateIndex) => (
        <DateHeaderCell key={dateIndex} date={date} />
      ))}
    </TableRow>
  );
}
