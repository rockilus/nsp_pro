import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

dayjs.extend(utc);

interface Props {
  name: string;
  content: React.ReactNode;
}

export default function TableRowScheduleWIP({ name, content }: Props) {
  return (
    <TableRow>
      <TableCell sx={{ width: 70, padding: 0 }}>
        <Box
          sx={{
            display: "flex",
            width: "50px",
            paddingLeft: "10px",
            color: "grey.700",
            height: "30px",
            alignItems: "center",
          }}
        >
          {name}
        </Box>
      </TableCell>
      <TableCell sx={{ padding: 0, paddingLeft: "10px" }}>{content}</TableCell>
    </TableRow>
  );
}
