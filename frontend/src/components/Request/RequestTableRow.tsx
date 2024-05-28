import dayjs from "dayjs";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import PopoverAnchorElBelow from "../SharedComponents/PopoverAnchorElBelow";
import RequestPanel from "./RequestPanel";
import { HardSoftButton } from "../SharedComponents/HardSoftButton";
// Stores
import { useRequestStore } from "../../stores/requestStore";
// Types
import { RequestT } from "../Request/types";
import { ShiftT } from "../Shift/types";
import { TeamT } from "../../containers/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
  requestTableFields: Record<string, string>[];
}

export default function RequestTableRow({
  team,
  request,
  workers,
  shifts,
  requestTableFields,
}: Props) {
  const { t } = useTranslation();

  const [open, setOpen] = useState<boolean>(false);

  const updateRequest = useRequestStore((state) => state.updateRequest);
  const deleteRequest = useRequestStore((state) => state.deleteRequest);

  const requestStatus: Record<string, string>[] = [
    { name: "pending", label: t("common.pending") },
    { name: "approved", label: t("common.approved") },
    { name: "rejected", label: t("common.rejected") },
  ];

  const handleToggleHard = async (request: RequestT) => {
    const updatedRequest: RequestT = {
      ...request,
      hard: !request.hard,
    };
    updateRequest(updatedRequest, team.id);
  };

  const getWorkerName = (workerId: string): string | undefined => {
    const worker = workers.find((worker) => worker.id === workerId);
    return worker?.name;
  };

  const getShiftName = (shiftId: string): string | undefined => {
    const shift = shifts.find((shift) => shift.id === shiftId);
    return shift?.name;
  };

  const formatDate = (date: dayjs.Dayjs): string => {
    return dayjs(date).format("dddd, MMM D");
  };

  const getRequestStatus = (status: string): string => {
    return (
      requestStatus.find((requestStatus) => requestStatus.name === status)
        ?.label || ""
    );
  };

  return (
    <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
      {requestTableFields.map((field, index) => (
        <TableCell key={index} sx={{ paddingY: 0 }}>
          {(() => {
            if (field.name === "workerId") {
              return getWorkerName(request.workerId);
            } else if (field.name === "date") {
              if (request.startDate.isSame(request.endDate, "day")) {
                return formatDate(request.startDate);
              } else {
                return `${formatDate(request.startDate)} - ${formatDate(
                  request.endDate
                )}`;
              }
            } else if (field.name === "shiftId") {
              return getShiftName(request.shiftId);
            } else if (field.name === "hard") {
              return HardSoftButton(request.hard, () =>
                handleToggleHard(request)
              );
            } else if (field.name === "status") {
              return getRequestStatus(request.status);
            }
          })()}
        </TableCell>
      ))}
      <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
        <Box sx={{ display: "flex" }}>
          <PopoverAnchorElBelow
            buttonContent={
              <IconButton edge="end" aria-label="delete">
                <EditIcon />
              </IconButton>
            }
            content={
              <RequestPanel
                team={team}
                request={request}
                workers={workers}
                shifts={shifts}
                handleClose={() => {
                  setOpen(false);
                }}
              />
            }
            open={open}
            setOpen={setOpen}
          />
          <Button onClick={() => deleteRequest(request.id, team.id)}>
            <DeleteIcon />
          </Button>
        </Box>
      </TableCell>
    </TableRow>
  );
}
