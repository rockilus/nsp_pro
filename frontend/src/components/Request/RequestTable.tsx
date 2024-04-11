import React from "react";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import RequestTableRow from "./RequestTableRow";
// Types
import { WorkerT } from "../Worker/types";
import { RequestT } from "../Request/types";
import { ShiftT } from "../Shift/types";
import { TeamT } from "../../containers/types";
// Constants
import { RequestTableFields } from "../../utils/constants";

interface Props {
  team: TeamT;
  requests: RequestT[];
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function RequestTable({
  team,
  requests,
  workers,
  shifts,
}: Props) {
  return (
    <>
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              {Object.keys(RequestTableFields).map((field, index) => (
                <TableCell key={index} sx={{ paddingY: 0, fontWeight: "bold" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 45,
                    }}
                  >
                    {field}
                  </Box>
                </TableCell>
              ))}
              <TableCell sx={{ padding: 0, width: 110 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request, requestIndex) => (
              <RequestTableRow
                key={requestIndex}
                team={team}
                request={request}
                workers={workers}
                shifts={shifts}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
