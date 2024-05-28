import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
// MUI
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import WorkIcon from "@mui/icons-material/Work";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Stores
import { useRequestStore } from "../../stores/requestStore";
// Types
import { RequestT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
  handleClose: () => void;
}

export default function RequestPanel({
  team,
  request,
  workers,
  shifts,
  handleClose,
}: Props) {
  const { t } = useTranslation();

  const [requestState, setRequestState] = useState<RequestT>({
    id: request.id,
    workerId: request.workerId,
    startDate: request.startDate,
    endDate: request.endDate,
    shiftId: request.shiftId,
    hard: request.hard,
    status: request.status,
  });
  const [dateRange, setDateRange] = useState<boolean>(
    !request.startDate.isSame(request.endDate, "day")
  );

  const addRequest = useRequestStore((state) => state.addRequest);
  const updateRequest = useRequestStore((state) => state.updateRequest);

  const handleSaveRequest = async () => {
    if (requestState.id === "") {
      await addRequest(requestState, team.id);
    } else {
      if (
        requestState.workerId === request.workerId &&
        requestState.startDate === request.startDate &&
        requestState.endDate === request.endDate &&
        requestState.shiftId === request.shiftId &&
        requestState.hard === request.hard
      ) {
        handleClose();
        return;
      }
      const updatedRequest = {
        ...requestState,
        status: "pending",
      };
      updateRequest(updatedRequest, team.id);
    }
    handleClose();
  };

  const handleSelectDateRange = () => {
    if (dateRange) {
      setRequestState({
        ...requestState,
        endDate: requestState.startDate,
      });
    } else {
      setRequestState({
        ...requestState,
        endDate: request.endDate,
      });
    }
    setDateRange(!dateRange);
  };

  const selectWorker = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={requestState.workerId}
            label="Worker"
            onChange={(e) =>
              setRequestState({
                ...requestState,
                workerId: e.target.value as string,
              })
            }
          >
            {workers.map((worker) => (
              <MenuItem key={worker.id} value={worker.id}>
                {worker.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };
  const selectShift = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={requestState.shiftId}
            label="Shift"
            onChange={(e) =>
              setRequestState({
                ...requestState,
                shiftId: e.target.value as string,
              })
            }
          >
            {shifts.map((shift) => (
              <MenuItem key={shift.id} value={shift.id}>
                {shift.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 1,
        }}
      >
        <PeopleAltIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        {selectWorker()}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Checkbox
          checked={dateRange}
          onChange={handleSelectDateRange}
          size="small"
          sx={{ marginLeft: "49px", height: "30px", width: "30px" }}
        />
        <Typography sx={{ fontSize: "0.8rem" }}>
          {t("request.date_range")}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 1,
        }}
      >
        <AccessTimeIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <DatePicker
            minDate={dayjs.utc().startOf("day")}
            sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}
            value={dayjs(requestState.startDate)}
            onChange={(newValue) =>
              setRequestState({
                ...requestState,
                startDate:
                  newValue?.startOf("day") || dayjs.utc().startOf("day"),
                endDate: !dateRange
                  ? newValue?.startOf("day") || dayjs.utc().startOf("day")
                  : requestState.endDate,
              })
            }
          />
          {dateRange && (
            <DatePicker
              minDate={requestState.startDate}
              sx={{
                marginLeft: 1,
                marginTop: "1px",
                marginRight: 2,
                width: "100%",
              }}
              value={dayjs(requestState.endDate)}
              onChange={(newValue) =>
                setRequestState({
                  ...requestState,
                  endDate:
                    newValue?.startOf("day") || dayjs.utc().startOf("day"),
                })
              }
            />
          )}
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 1,
        }}
      >
        <WorkIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        {selectShift()}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          sx={{ marginRight: 2 }}
          onClick={handleSaveRequest}
        >
          {t("common.save")}
        </Button>
      </Box>
    </Box>
  );
}
