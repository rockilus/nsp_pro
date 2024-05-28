import React from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
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
  const { t } = useTranslation();

  const requestTableFields: Record<string, string>[] = [
    { name: "workerId", label: t("common.worker") },
    { name: "shiftId", label: t("common.shift") },
    { name: "date", label: t("common.date") },
    { name: "hard", label: t("common.hard") },
    { name: "status", label: t("common.status") },
  ];

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{ width: "100%", borderRadius: "0 0 8px 8px" }}
      >
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              {requestTableFields.map((field, index) => (
                <TableCell key={index} sx={{ paddingY: 0, fontWeight: "bold" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 45,
                    }}
                  >
                    {field.label}
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
                requestTableFields={requestTableFields}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
