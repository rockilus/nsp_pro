import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "@/app/i18n/client";
// MUI
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Box from "@mui/material/Box";
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
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon from "@mui/icons-material/Undo";
import ClearIcon from "@mui/icons-material/Clear";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Chip from "@mui/material/Chip";
// Components
import ShiftOptionsDisplay from "@/components/stats/nav-bar/shift-options-display";
// Styles
import "@/components/request/request-panel.css";
// Utils
import {
  getRequestStatusColor,
  getRequestStatusLabel,
} from "@/utils/shift-worker-option-display";
// Types
import {
  RequestT,
  RequestStatus,
  RequestType,
  FulfillmentStatus,
} from "@/types/request";
import { ShiftT, ShiftType, ShiftRestType } from "@/types/shift";
import { WorkerT } from "@/types/worker";
import { TeamMembershipRole } from "@/types/team";
import { ShiftWorkerOptionT, SWOIdTypes } from "@/types/constraint";

export default function RequestForm({
  lng,
  teamId,
  isEdit,
  request = null,
  workers,
  shifts,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  handleAddRequest,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
  onClose,
  fullWidth = false,
  isMobile = false,
  title,
}: {
  lng: string;
  teamId: string;
  isEdit: boolean;
  request?: RequestT | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleAddRequest?: (request: RequestT) => void;
  handleUpdateRequest?: (request: RequestT) => void;
  handleDeleteRequest?: (requestId: string) => void;
  handleRescindRequest?: (requestId: string) => void;
  handleAcceptRequest?: (requestId: string) => void;
  handleDenyRequest?: (requestId: string) => void;
  onClose?: () => void;
  fullWidth?: boolean;
  isMobile?: boolean;
  title?: string;
}) {
  const { t } = useTranslation(lng, "request-page");

  // Helper to create a default request object
  const createDefaultRequest = (): RequestT => ({
    id: "",
    teamId: teamId,
    requestType: RequestType.WORK_DEMAND,
    workerId: userWorkerId || "",
    startDate: dayjs.utc().startOf("day"),
    endDate: dayjs.utc().startOf("day"),
    shiftId: null,
    shiftOptions: [],
    negative: false,
    hard: true,
    status: RequestStatus.PENDING,
    fulfillment: FulfillmentStatus.NOT_PROCESSED,
    comment: "",
    createdAt: dayjs.utc(),
    active: true,
    shiftTargetIds: [],
    missingAttributes: [],
  });

  // If editing, always expect a real request object. If creating, use default.
  const [requestState, setRequestState] = useState<RequestT>(
    isEdit && request ? request : createDefaultRequest(),
  );
  const [dateRange, setDateRange] = useState<boolean>(
    isEdit && request
      ? !request.startDate.isSame(request.endDate, "day")
      : false,
  );
  const [requestType, setRequestType] = useState<RequestType>(
    isEdit && request ? request.requestType : RequestType.WORK_DEMAND,
  );

  // Validation error state
  const [workerIdError, setWorkerIdError] = useState(false);
  const [startDateError, setStartDateError] = useState(false);
  const [endDateError, setEndDateError] = useState(false);
  const [shiftIdError, setShiftIdError] = useState(false);
  const [shiftOptionsError, setShiftOptionsError] = useState(false);

  // Helper functions for action button logic (use requestState instead of request for current status)
  const canEdit =
    userTeamRole !== TeamMembershipRole.MEMBER ||
    (userWorkerId && requestState.workerId === userWorkerId);

  const canApprove =
    userTeamRole === TeamMembershipRole.OWNER &&
    requestState.status === RequestStatus.PENDING;

  const canRescind =
    userTeamRole === TeamMembershipRole.OWNER &&
    (requestState.status === RequestStatus.APPROVED ||
      requestState.status === RequestStatus.DENIED);

  // Helper to filter shifts by request type
  function filterShiftsByRequestType(
    shifts: ShiftT[],
    requestType: RequestType,
  ): ShiftT[] {
    return shifts.filter((s) => {
      if (requestType === RequestType.WORK_DEMAND) {
        return (
          !s.deleted &&
          (s.shiftType === ShiftType.NORMAL || s.shiftType === ShiftType.DUTY)
        );
      } else {
        return (
          !s.deleted &&
          (s.shiftType === ShiftType.REST || s.shiftType === ShiftType.LEAVE) &&
          (s.restType === ShiftRestType.OFF ||
            s.restType === ShiftRestType.NONE)
        );
      }
    });
  }

  // Filters shiftOptions for ShiftOptionsDisplay (readability)
  function filterShiftOptions(
    shiftOptions: ShiftWorkerOptionT[],
    shifts: ShiftT[],
  ): ShiftWorkerOptionT[] {
    const normalDutyShiftIds = shifts
      .filter(
        (s) =>
          !s.deleted &&
          (s.shiftType === ShiftType.NORMAL || s.shiftType === ShiftType.DUTY),
      )
      .map((s) => s.id);

    return shiftOptions.filter((opt) => {
      if (opt.categoryName === "All") return false;
      if (
        opt.idType === SWOIdTypes.SHIFT &&
        !normalDutyShiftIds.includes(opt.id)
      ) {
        return false;
      }
      return true;
    });
  }

  const handleEditSelectedShifts = (selectedShifts: ShiftWorkerOptionT[]) => {
    if (requestType === RequestType.LEAVE) return;

    const newRequestState: RequestT = {
      ...requestState,
      shiftOptions: selectedShifts,
    };
    setRequestState(newRequestState);
  };

  // Initialize with request data if provided (for calendar usage)
  React.useEffect(() => {
    if (request) {
      setRequestState(request);
      setRequestType(request.requestType);
      setDateRange(!request.startDate.isSame(request.endDate, "day"));
    }
  }, [request, isEdit]);

  const handleSaveRequest = async () => {
    // Reset all errors
    setWorkerIdError(false);
    setStartDateError(false);
    setEndDateError(false);
    setShiftIdError(false);
    setShiftOptionsError(false);

    let hasError = false;
    // Worker ID validation
    if (!requestState.workerId || requestState.workerId.trim() === "") {
      setWorkerIdError(true);
      hasError = true;
    }
    // Start date must be after today
    const today = dayjs.utc().startOf("day");
    if (
      !requestState.startDate ||
      !requestState.startDate.isAfter(today.subtract(1, "day"))
    ) {
      setStartDateError(true);
      hasError = true;
    }
    // End date must be same as or after start date
    if (
      !requestState.endDate ||
      requestState.endDate.isBefore(requestState.startDate, "day")
    ) {
      setEndDateError(true);
      hasError = true;
    }
    // Leave request: shiftId required, shiftOptions must be empty
    if (requestType === RequestType.LEAVE) {
      if (!requestState.shiftId || requestState.shiftId === "") {
        setShiftIdError(true);
        hasError = true;
      }
      if (requestState.shiftOptions && requestState.shiftOptions.length > 0) {
        setShiftOptionsError(true);
        hasError = true;
      }
    }
    // Work demand: shiftId must be null, shiftOptions required
    if (requestType === RequestType.WORK_DEMAND) {
      if (requestState.shiftId !== null) {
        setShiftIdError(true);
        hasError = true;
      }
      if (
        !requestState.shiftOptions ||
        requestState.shiftOptions.length === 0
      ) {
        setShiftOptionsError(true);
        hasError = true;
      }
    }
    if (hasError) return;

    if (!isEdit) {
      if (!handleAddRequest) return;
      await handleAddRequest(requestState);
      // Close after successful creation
      if (onClose) {
        onClose();
      }
    } else if (request) {
      // Helper function to compare shiftOptions arrays
      const areShiftOptionsEqual = (
        options1: ShiftWorkerOptionT[],
        options2: ShiftWorkerOptionT[],
      ) => {
        if (options1.length !== options2.length) return false;
        return options1.every((opt1, index) => {
          const opt2 = options2[index];
          return opt1.id === opt2.id && opt1.idType === opt2.idType;
        });
      };

      // Only compare if editing and request is defined
      if (
        requestState.workerId === request.workerId &&
        requestState.startDate === request.startDate &&
        requestState.endDate === request.endDate &&
        requestState.shiftId === request.shiftId &&
        requestState.negative === request.negative &&
        requestState.hard === request.hard &&
        areShiftOptionsEqual(requestState.shiftOptions, request.shiftOptions)
      ) {
        if (onClose) {
          onClose();
        }
        return;
      }
      const updatedRequest = {
        ...requestState,
        status: RequestStatus.PENDING,
      };
      if (handleUpdateRequest) {
        handleUpdateRequest(updatedRequest);
      }
    }
    if (onClose) {
      onClose();
    }
  };

  const handleSelectDateRange = () => {
    if (dateRange) {
      setRequestState({
        ...requestState,
        endDate: requestState.startDate,
      });
    } else if (request) {
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
        <FormControl fullWidth error={workerIdError}>
          <Select
            value={requestState.workerId}
            disabled={userTeamRole === TeamMembershipRole.MEMBER}
            label="Worker"
            onChange={(e) => {
              setRequestState({
                ...requestState,
                workerId: e.target.value as string,
              });
              setWorkerIdError(false);
            }}
            data-testid="worker-select"
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
        <FormControl fullWidth error={shiftIdError}>
          <Select
            value={requestState.shiftId || ""}
            label="Shift"
            onChange={(e) => {
              setRequestState({
                ...requestState,
                shiftId: e.target.value as string,
              });
              setShiftIdError(false);
            }}
            data-testid="shift-select"
          >
            {filterShiftsByRequestType(shifts, requestType).map((shift) => (
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
      {/* Mobile header with close button */}
      {isMobile && (
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1100,
            backgroundColor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title || "Request"}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            edge="end"
            data-testid="close-request-dialog-button"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      {/* Status chip and action buttons */}
      {isEdit && request && (
        <div className="flex items-center gap-2 mb-4">
          <Chip
            label={getRequestStatusLabel(requestState.status, t)}
            size="small"
            color={getRequestStatusColor(requestState.status)}
            variant="filled"
          />
          {/* Action buttons for edit mode */}
          {canApprove && handleAcceptRequest && (
            <IconButton
              size="small"
              onClick={() => {
                handleAcceptRequest(request.id);
                // Update local state to reflect the approval
                setRequestState((prev) => ({
                  ...prev,
                  status: RequestStatus.APPROVED,
                }));
              }}
              title="Approve Request"
              color="success"
              data-testid={`approve-request-button-${request.id}`}
            >
              <CheckIcon />
            </IconButton>
          )}

          {canApprove && handleDenyRequest && (
            <IconButton
              size="small"
              onClick={() => {
                handleDenyRequest(request.id);
                // Update local state to reflect the denial
                setRequestState((prev) => ({
                  ...prev,
                  status: RequestStatus.DENIED,
                }));
              }}
              title="Reject Request"
              color="error"
              data-testid={`reject-request-button-${request.id}`}
            >
              <ClearIcon />
            </IconButton>
          )}

          {canRescind && handleRescindRequest && (
            <IconButton
              size="small"
              onClick={() => {
                handleRescindRequest(request.id);
                // Update local state to reflect the rescind (back to pending)
                setRequestState((prev) => ({
                  ...prev,
                  status: RequestStatus.PENDING,
                }));
              }}
              title={`Rescind ${
                requestState.status === RequestStatus.APPROVED
                  ? "Approval"
                  : "Rejection"
              }`}
              color="warning"
              data-testid={`rescind-request-button-${request.id}`}
            >
              <UndoIcon />
            </IconButton>
          )}

          {/* Delete moved to mobile save area */}
        </div>
      )}

      {/* Form content */}
      <div
        className="request-panel-container"
        style={fullWidth ? { width: "100%" } : undefined}
      >
        <ToggleButtonGroup
          color="primary"
          value={requestType}
          exclusive
          onChange={(_event, value) => {
            if (value !== null) {
              setRequestType(value);
              setRequestState((prev) => {
                if (value === RequestType.WORK_DEMAND) {
                  // When switching to work demand, clear shiftId but preserve worker and dates
                  return {
                    ...prev,
                    shiftId: null,
                    requestType: value,
                    // Preserve workerId and dates from initial request
                    workerId: request?.workerId || prev.workerId,
                    startDate: request?.startDate || prev.startDate,
                    endDate: request?.endDate || prev.endDate,
                  };
                } else if (value === RequestType.LEAVE) {
                  // When switching to leave, clear shiftOptions and set negative to false but preserve worker and dates
                  return {
                    ...prev,
                    shiftOptions: [],
                    negative: false,
                    requestType: value,
                    // Preserve workerId and dates from initial request
                    workerId: request?.workerId || prev.workerId,
                    startDate: request?.startDate || prev.startDate,
                    endDate: request?.endDate || prev.endDate,
                  };
                }
                return prev;
              });
            }
          }}
          aria-label="Request Type"
          sx={{ marginBottom: 2, marginLeft: 2 }}
          data-testid="request-type-toggle"
        >
          <ToggleButton
            value={RequestType.WORK_DEMAND}
            sx={{
              marginTop: "5px",
              marginBottom: "5px",
              marginLeft: "56px",
              textTransform: "none",
              height: "30px",
              width: "105px",
              fontSize: "0.8rem",
            }}
            data-testid="work-request-type-button"
          >
            {t("work")}
          </ToggleButton>
          <ToggleButton
            value={RequestType.LEAVE}
            sx={{
              marginTop: "5px",
              marginBottom: "5px",
              textTransform: "none",
              height: "30px",
              width: "105px",
              fontSize: "0.8rem",
            }}
            data-testid="leave-request-type-button"
          >
            {t("leave")}
          </ToggleButton>
        </ToggleButtonGroup>
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
            data-testid="date-range-checkbox"
          />
          <Typography sx={{ fontSize: "0.8rem" }}>{t("date_range")}</Typography>
        </div>
        <div className="variable-input-container">
          <AccessTimeIcon sx={{ marginLeft: 2, marginRight: 1 }} />
          <div className="date-pickers-container">
            <DatePicker
              minDate={dayjs.utc().startOf("day")}
              sx={{ marginLeft: 1, marginRight: 2 }}
              value={requestState.startDate}
              onChange={(newValue) => {
                setRequestState({
                  ...requestState,
                  startDate:
                    newValue?.startOf("day") || dayjs.utc().startOf("day"),
                  endDate: !dateRange
                    ? newValue?.startOf("day") || dayjs.utc().startOf("day")
                    : requestState.endDate,
                });
                setStartDateError(false);
                if (!dateRange) setEndDateError(false);
              }}
              slotProps={{
                textField: {
                  error: startDateError,
                  inputProps: { "data-testid": "start-date-picker" },
                },
                // openPickerButton: { "data-testid": "start-date-picker" } as any,
              }}
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
                onChange={(newValue) => {
                  setRequestState({
                    ...requestState,
                    endDate:
                      newValue?.startOf("day") || dayjs.utc().startOf("day"),
                  });
                  setEndDateError(false);
                }}
                slotProps={{
                  textField: {
                    error: endDateError,
                    inputProps: { "data-testid": "end-date-picker" },
                  },
                }}
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
              onChange={(event, value) => {
                // Only update if value is not null (prevent deselection)
                if (value !== null) {
                  setRequestState({ ...requestState, negative: value });
                }
              }}
              aria-label="Platform"
              data-testid="negative-positive-toggle"
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
                data-testid="positive-request-button"
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
                data-testid="negative-request-button"
              >
                {t("dont")}
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        )}
        <div className="variable-input-container">
          <WorkIcon sx={{ marginLeft: 2, marginRight: 1 }} />
          {requestType === RequestType.WORK_DEMAND ? (
            <div
              style={
                shiftOptionsError
                  ? {
                      border: "2px solid #f44336",
                      borderRadius: 8,
                      padding: 2,
                    }
                  : {}
              }
            >
              <ShiftOptionsDisplay
                lng={lng}
                selectedShifts={requestState.shiftOptions}
                statsShiftOptions={filterShiftOptions(shiftOptions, shifts)}
                workers={workers}
                shifts={shifts}
                disabled={false}
                handleEditSelectedShifts={(selected) => {
                  handleEditSelectedShifts(selected);
                  setShiftOptionsError(false);
                }}
              />
            </div>
          ) : (
            selectShift()
          )}
        </div>
        <div className="save-button-container">
          {isMobile && isEdit && request && handleDeleteRequest && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                handleDeleteRequest(request.id);
                if (onClose) onClose();
              }}
              disabled={!canEdit}
              startIcon={<DeleteIcon />}
              sx={{ marginRight: 2 }}
              data-testid={`delete-request-button`}
            >
              {t("delete")}
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            sx={{ marginRight: 2 }}
            onClick={handleSaveRequest}
            data-testid="save-request-button"
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
