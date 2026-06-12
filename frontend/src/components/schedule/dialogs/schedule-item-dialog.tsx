import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { useIsMobile } from '@/hooks/useIsMobile';
// shadcn
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
} from './schedule-item-types';
// Forms
import AssignmentForm from './assignment/assignment-form';
import DemandForm from './demand/demand-form';
import { RequestForm } from '@/components/common/RequestForm';
import { TeamMembershipRole } from '@/types/team';

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
  const { t } = useTranslation(lng, 'schedule-page');
  const isMobile = useIsMobile();

  const [activeType, setActiveType] = useState<ScheduleItemType>(selectedType);

  React.useEffect(() => {
    if (open) {
      setActiveType(selectedType);
    }
  }, [open, selectedType]);

  const getDialogTitle = () => {
    switch (activeType) {
      case ScheduleItemType.ASSIGNMENT:
        return mode === DialogMode.CREATE ? t('new_assignment') : t('edit_assignment');
      case ScheduleItemType.DEMAND:
        return mode === DialogMode.CREATE ? t('new_coverage') : t('edit_coverage');
      case ScheduleItemType.REQUEST:
        return mode === DialogMode.CREATE ? t('new_request') : t('edit_request');
      default:
        return mode === DialogMode.CREATE ? t('new_schedule_item') : t('edit_schedule_item');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className={
          isMobile
            ? 'h-[100dvh] max-w-full rounded-none p-0 sm:max-w-lg sm:rounded-xl'
            : 'sm:max-w-lg'
        }
        showCloseButton={!isMobile}
        data-testid="schedule-item-dialog"
      >
        {!isMobile && (
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
        )}

        {/* Mobile header */}
        {isMobile && (
          <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-popover p-4">
            <h2 className="text-lg font-semibold">{getDialogTitle()}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              data-testid="close-dialog-button"
            >
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-x"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </Button>
          </div>
        )}

        <div className={isMobile ? 'px-4 py-2' : ''}>
          {/* Type selector (create mode + desktop) */}
          {mode === DialogMode.CREATE && !isMobile && (
            <div className="mb-4" data-testid="schedule-item-type-buttons">
              <ToggleGroup
                type="single"
                value={activeType}
                onValueChange={(value) => {
                  if (value) setActiveType(value as ScheduleItemType);
                }}
              >
                <ToggleGroupItem
                  value={ScheduleItemType.ASSIGNMENT}
                  data-testid="assignment-button"
                  className="px-3"
                >
                  {t('assignment')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={ScheduleItemType.DEMAND}
                  data-testid="demand-button"
                  className="px-3"
                >
                  {t('demand')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={ScheduleItemType.REQUEST}
                  data-testid="request-button"
                  className="px-3"
                >
                  {t('request')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
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
                mode === DialogMode.EDIT && dialogData && 'assignmentData' in dialogData
                  ? (dialogData as EditAssignmentData).assignmentData
                  : null
              }
              initialData={
                mode === DialogMode.CREATE && dialogData && 'workerId' in dialogData
                  ? (dialogData as CreateAssignmentData)
                  : null
              }
              useSolver={useSolver}
              onSave={(assignment, recurrence, updateScope, options) => {
                if (mode === DialogMode.CREATE && handleCreateAssignment) {
                  handleCreateAssignment(assignment, recurrence);
                } else if (mode === DialogMode.EDIT && handleUpdateAssignment) {
                  handleUpdateAssignment(assignment, recurrence, updateScope);
                }
                if (!options?.keepOpen) {
                  onClose();
                }
              }}
              onDelete={(assignmentId, recurrenceId, updateScope) => {
                if (handleDeleteAssignment) {
                  handleDeleteAssignment(assignmentId, recurrenceId, updateScope);
                }
                onClose();
              }}
              onCancel={onClose}
              isLeader={userTeamRole !== TeamMembershipRole.MEMBER}
            />
          )}

          {activeType === ScheduleItemType.DEMAND && (
            <DemandForm
              lng={lng}
              mode={mode}
              shifts={shifts}
              specialties={specialties}
              cellData={
                mode === DialogMode.EDIT && dialogData && 'cellData' in dialogData
                  ? (dialogData as EditDemandData).cellData
                  : null
              }
              initialData={
                mode === DialogMode.CREATE && dialogData && 'shiftId' in dialogData
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
                mode === DialogMode.EDIT && dialogData && 'request' in dialogData
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
