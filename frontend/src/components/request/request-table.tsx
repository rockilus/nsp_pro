import React from "react";
import { useTranslation } from "../../app/i18n/client";
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
import RequestTableRow from "./request-table-row";
// Types
import { WorkerT } from "../../types/worker";
import { RequestT } from "../../types/request";
import { ShiftT } from "../../types/shift";

export default function RequestTable({
  lng,
  requests,
  workers,
  shifts,
  handleUpdateRequest,
  handleDeleteRequest,
}: {
  lng: string;
  requests: RequestT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest: (requestId: string) => void;
}) {
  const { t } = useTranslation(lng, "request-page");

  const requestTableFields: Record<string, string>[] = [
    { name: "workerId", label: t("worker") },
    { name: "shiftId", label: t("shift") },
    { name: "date", label: t("date") },
    { name: "hard", label: t("type") },
    { name: "status", label: t("status") },
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
                lng={lng}
                request={request}
                workers={workers}
                shifts={shifts}
                requestTableFields={requestTableFields}
                handleUpdateRequest={handleUpdateRequest}
                handleDeleteRequest={handleDeleteRequest}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
