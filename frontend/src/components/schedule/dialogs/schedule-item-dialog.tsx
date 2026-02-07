import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: ScheduleItemType;
  value: ScheduleItemType;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`schedule-item-tabpanel-${index}`}
      aria-labelledby={`schedule-item-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

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

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: ScheduleItemType,
  ) => {
    setActiveType(newValue);
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
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs
              value={activeType}
              onChange={handleTabChange}
              aria-label="schedule item type tabs"
            >
              <Tab
                label={t("assignment")}
                value={ScheduleItemType.ASSIGNMENT}
                id="schedule-item-tab-assignment"
              />
              <Tab
                label={t("demand")}
                value={ScheduleItemType.DEMAND}
                id="schedule-item-tab-demand"
              />
              <Tab
                label={t("request")}
                value={ScheduleItemType.REQUEST}
                id="schedule-item-tab-request"
              />
            </Tabs>
          </Box>
        )}

        <TabPanel value={activeType} index={ScheduleItemType.ASSIGNMENT}>
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
        </TabPanel>

        <TabPanel value={activeType} index={ScheduleItemType.DEMAND}>
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
        </TabPanel>

        <TabPanel value={activeType} index={ScheduleItemType.REQUEST}>
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
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}
