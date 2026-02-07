import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
// Types
import {
  ScheduleItemType,
  DialogMode,
  ScheduleItemDialogProps,
  CreateAssignmentData,
  EditAssignmentData,
  CreateDemandData,
  EditDemandData,
  CreateRequestData,
  EditRequestData,
} from "./schedule-item-types";
// Forms
import AssignmentForm from "./assignment/assignment-form";
import DemandForm from "./demand/demand-form";
import RequestForm from "./request/request-form";

export default function ScheduleItemDialog({
  lng,
  open,
  onClose,
  mode,
  selectedType,
  dialogData,
  teamId,
  scheduleId,
  workers,
  shifts,
  schedules,
  specialties,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  useSolver,
  handleCreateAssignment,
  handleUpdateAssignment,
  handleDeleteAssignment,
  handleCreateShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
  handleAddRequest,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
}: ScheduleItemDialogProps) {
  const { t } = useTranslation(lng, "schedule-page");

  const [activeType, setActiveType] = useState<ScheduleItemType>(selectedType);

  // Reset activeType when dialog opens with new selectedType
  React.useEffect(() => {
    if (open) {
      setActiveType(selectedType);
    }
  }, [open, selectedType]);

  const handleTypeChange = (newType: ScheduleItemType) => {
    setActiveType(newType);
  };

  const getDialogTitle = () => {
    if (mode === DialogMode.EDIT) {
      switch (activeType) {
        case ScheduleItemType.ASSIGNMENT:
          return t("edit_assignment");
        case ScheduleItemType.DEMAND:
          return t("edit_demand");
        case ScheduleItemType.REQUEST:
          return t("edit_request");
      }
    }
    return t("new_schedule_item");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid="schedule-item-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <span>{getDialogTitle()}</span>
          <IconButton onClick={onClose} size="small" edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {mode === DialogMode.CREATE && (
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button
              variant={
                activeType === ScheduleItemType.ASSIGNMENT
                  ? "contained"
                  : "outlined"
              }
              size="small"
              onClick={() => handleTypeChange(ScheduleItemType.ASSIGNMENT)}
              data-testid="assignment-button"
              sx={{ textTransform: "none" }}
            >
              {t("assignment")}
            </Button>
            <Button
              variant={
                activeType === ScheduleItemType.DEMAND
                  ? "contained"
                  : "outlined"
              }
              size="small"
              onClick={() => handleTypeChange(ScheduleItemType.DEMAND)}
              data-testid="demand-button"
              sx={{ textTransform: "none" }}
            >
              {t("demand")}
            </Button>
            <Button
              variant={
                activeType === ScheduleItemType.REQUEST
                  ? "contained"
                  : "outlined"
              }
              size="small"
              onClick={() => handleTypeChange(ScheduleItemType.REQUEST)}
              data-testid="request-button"
              sx={{ textTransform: "none" }}
            >
              {t("request")}
            </Button>
          </Box>
        )}

        {activeType === ScheduleItemType.ASSIGNMENT && (
          <AssignmentForm
            lng={lng}
            mode={mode}
            teamId={teamId}
            scheduleId={scheduleId}
            workers={workers}
            shifts={shifts}
            schedules={schedules}
            assignmentData={
              mode === DialogMode.EDIT &&
              dialogData &&
              "assignmentData" in dialogData
                ? (dialogData as EditAssignmentData).assignmentData
                : null
            }
            initialData={
              mode === DialogMode.CREATE &&
              dialogData &&
              "workerId" in dialogData
                ? (dialogData as CreateAssignmentData)
                : null
            }
            useSolver={useSolver}
            onSave={(assignment, recurrence, updateScope) => {
              if (mode === DialogMode.CREATE && handleCreateAssignment) {
                handleCreateAssignment(assignment, recurrence);
              } else if (mode === DialogMode.EDIT && handleUpdateAssignment) {
                handleUpdateAssignment(assignment, recurrence, updateScope);
              }
              onClose();
            }}
            onDelete={(assignmentId, recurrenceId, updateScope) => {
              if (handleDeleteAssignment) {
                handleDeleteAssignment(assignmentId, recurrenceId, updateScope);
              }
              onClose();
            }}
            onCancel={onClose}
          />
        )}

        {activeType === ScheduleItemType.DEMAND && (
          <DemandForm
            lng={lng}
            mode={mode}
            shifts={shifts}
            specialties={specialties}
            cellData={
              mode === DialogMode.EDIT && dialogData && "cellData" in dialogData
                ? (dialogData as EditDemandData).cellData
                : null
            }
            initialData={
              mode === DialogMode.CREATE &&
              dialogData &&
              "shiftId" in dialogData
                ? (dialogData as CreateDemandData)
                : null
            }
            onCreateDemand={handleCreateShiftDemand}
            onUpdateDemand={handleUpdateShiftDemand}
            onDeleteDemand={handleDeleteShiftDemand}
            onCancel={onClose}
          />
        )}

        {activeType === ScheduleItemType.REQUEST && (
          <RequestForm
            lng={lng}
            teamId={teamId}
            isEdit={mode === DialogMode.EDIT}
            request={
              mode === DialogMode.EDIT && dialogData && "request" in dialogData
                ? (dialogData as EditRequestData).request
                : null
            }
            workers={workers}
            shifts={shifts}
            shiftOptions={shiftOptions}
            userWorkerId={userWorkerId}
            userTeamRole={userTeamRole}
            handleAddRequest={handleAddRequest}
            handleUpdateRequest={handleUpdateRequest}
            handleDeleteRequest={handleDeleteRequest}
            handleRescindRequest={handleRescindRequest}
            handleAcceptRequest={handleAcceptRequest}
            handleDenyRequest={handleDenyRequest}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
