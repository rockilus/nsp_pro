import React, { useState } from "react";
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
import { hardSoftButton } from "../SharedComponents/HardSoftButton";
// Stores
import { useRequestStore } from "../../stores/requestStore";
// Types
import { RequestT } from "../Request/types";
import { ShiftT } from "../Shift/types";
import { TeamT } from "../../containers/types";
import { WorkerT } from "../Worker/types";
// Constants
import { RequestTableFields } from "../../utils/constants";

interface Props {
  team: TeamT;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function RequestTableRow({
  team,
  request,
  workers,
  shifts,
}: Props) {
  const [open, setOpen] = useState<boolean>(false);

  const updateRequest = useRequestStore((state) => state.updateRequest);
  const deleteRequest = useRequestStore((state) => state.deleteRequest);

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

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "short",
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  return (
    <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
      {Object.values(RequestTableFields).map((field, index) => (
        <TableCell key={index} sx={{ paddingY: 0 }}>
          {(() => {
            if (field === "workerId") {
              return getWorkerName(request.workerId);
            } else if (field === "date") {
              return formatDate(request.date);
            } else if (field === "shiftId") {
              return getShiftName(request.shiftId);
            } else if (field === "hard") {
              return hardSoftButton(request.hard, () =>
                handleToggleHard(request)
              );
            } else if (field === "status") {
              return (
                request.status.charAt(0).toUpperCase() + request.status.slice(1)
              );
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
                handleClose={() => {}}
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
