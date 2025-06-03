import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Popover from "@mui/material/Popover";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Select from "@mui/material/Select";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import WorkIcon from "@mui/icons-material/Work";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Styles
import "./request-panel.css";
// Types
import { RequestT, RequestStatus, RequestType } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { TeamMembershipRole } from "@/types/team";

export default function RequestPanel({
  lng,
  requestType,
  isEdit,
  request,
  workers,
  shifts,
  userWorkerId,
  userTeamRole,
  handleAddRequest,
  handleUpdateRequest,
}: {
  lng: string;
  requestType: RequestType;
  isEdit: boolean;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleAddRequest: (request: RequestT) => void;
  handleUpdateRequest: (request: RequestT) => void;
}) {
  const { t } = useTranslation(lng, "request-page");

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const [requestState, setRequestState] = useState<RequestT>(request);
  const [dateRange, setDateRange] = useState<boolean>(
    !request.startDate.isSame(request.endDate, "day")
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const handleSaveRequest = async () => {
    if (!isEdit) {
      await handleAddRequest(requestState);
    } else {
      if (
        requestState.workerId === request.workerId &&
        requestState.startDate === request.startDate &&
        requestState.endDate === request.endDate &&
        requestState.shiftId === request.shiftId &&
        requestState.negative === request.negative &&
        requestState.hard === request.hard
      ) {
        handleClose();
        return;
      }
      const updatedRequest = {
        ...requestState,
        status: RequestStatus.PENDING,
      };
      handleUpdateRequest(updatedRequest);
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
      <div className="select-container">
        <FormControl fullWidth>
          <Select
            value={requestState.workerId}
            disabled={userTeamRole === TeamMembershipRole.MEMBER}
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
      </div>
    );
  };
  const selectShift = () => {
    return (
      <div className="select-container">
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
      </div>
    );
  };

  return (
    <div>
      {isEdit ? (
        <IconButton
          edge="end"
          aria-label="delete"
          disabled={
            userTeamRole === TeamMembershipRole.MEMBER &&
            (!userWorkerId || request.workerId !== userWorkerId)
          }
          onClick={handleClick}
        >
          <EditIcon />
        </IconButton>
      ) : (
        <Button
          aria-describedby={id}
          variant="contained"
          disabled={userTeamRole === TeamMembershipRole.MEMBER && !userWorkerId}
          onClick={handleClick}
          sx={{
            textTransform: "none",
          }}
        >
          {t("new_request")}
        </Button>
      )}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <div className="request-panel-container">
          <div className="request-panel-header">
            <Typography variant="h6">{t("new_request")}</Typography>
            <IconButton onClick={handleClose} sx={{ padding: 0 }}>
              <CloseIcon />
            </IconButton>
          </div>
          <div className="variable-input-container">
            <PeopleAltIcon sx={{ marginLeft: 2, marginRight: 1 }} />
            {selectWorker()}
          </div>
          <div className="variable-input-param-container">
            <Checkbox
              checked={dateRange}
              onChange={handleSelectDateRange}
              size="small"
              sx={{ marginLeft: "49px", height: "30px", width: "30px" }}
            />
            <Typography sx={{ fontSize: "0.8rem" }}>
              {t("date_range")}
            </Typography>
          </div>
          <div className="variable-input-container">
            <AccessTimeIcon sx={{ marginLeft: 2, marginRight: 1 }} />
            <div className="date-pickers-container">
              <DatePicker
                minDate={dayjs.utc().startOf("day")}
                sx={{ marginLeft: 1, marginRight: 2 }}
                value={requestState.startDate}
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
                  value={requestState.endDate}
                  onChange={(newValue) =>
                    setRequestState({
                      ...requestState,
                      endDate:
                        newValue?.startOf("day") || dayjs.utc().startOf("day"),
                    })
                  }
                />
              )}
            </div>
          </div>
          {requestType === RequestType.WORK_DEMAND && (
            <div className="variable-input-param-container">
              <ToggleButtonGroup
                color="primary"
                value={requestState.negative}
                exclusive
                onChange={(event, value) =>
                  setRequestState({ ...requestState, negative: value })
                }
                aria-label="Platform"
              >
                <ToggleButton
                  value={false}
                  sx={{
                    marginTop: "5px",
                    marginBottom: "5px",
                    marginLeft: "56px",
                    textTransform: "none",
                    height: "30px",
                    width: "105px",
                    fontSize: "0.8rem",
                  }}
                >
                  {t("do")}
                </ToggleButton>
                <ToggleButton
                  value={true}
                  sx={{
                    marginTop: "5px",
                    marginBottom: "5px",
                    textTransform: "none",
                    height: "30px",
                    width: "105px",
                    fontSize: "0.8rem",
                  }}
                >
                  {t("dont")}
                </ToggleButton>
              </ToggleButtonGroup>
            </div>
          )}
          <div className="variable-input-container">
            <WorkIcon sx={{ marginLeft: 2, marginRight: 1 }} />
            {selectShift()}
          </div>
          <div className="save-button-container">
            <Button
              variant="contained"
              color="primary"
              sx={{ marginRight: 2 }}
              onClick={handleSaveRequest}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
