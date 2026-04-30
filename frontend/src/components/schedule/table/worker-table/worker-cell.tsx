import React from 'react';
import { Sparkle } from 'lucide-react';
// MUI
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
// Components
import AssignmentCell from '../shared/assignment-cell';
import RequestCell from '../shared/request-cell';
import { RoleBased } from '@/components/access/role-based';
// Styles
import './worker-cell.css';
// Types
import { WorkerT } from '../../../../types/worker';
import { ShiftT } from '../../../../types/shift';
import { periodDateT, ScheduleViewSettingsT, ScheduleCellDataT } from '../../../../types/schedule';
import { CreateAssignmentT } from '@/types/assignment';
import { AssignmentDataDictT } from '@/types/assignment';
import { RequestT } from '../../../../types/request';
import { TeamMembershipRole, TeamWithMembership } from '@/types/team';
import { ScheduleSelectionState } from '@/types/scheduleSelection';

export default function WorkerCell({
  periodDate,
  worker,
  shifts,
  scheduleCellData,
  scheduleViewSettings,
  teamWithMembership,
  handleAssignmentSelection,
  handleRequestSelection,
  handleOpenCreateAssignment,
  selectionState,
  handleCellSelect,
  handleAssignmentSelect,
  isCustomSolveModeActive = false,
  isCustomCellSelected = false,
  onCustomCellSelect,
  isDateInCampaign = true,
}: {
  periodDate: periodDateT;
  worker: WorkerT;
  shifts: ShiftT[];
  scheduleCellData: ScheduleCellDataT | null;
  scheduleViewSettings: ScheduleViewSettingsT;
  teamWithMembership: TeamWithMembership;
  handleAssignmentSelection: (seletedCell: AssignmentDataDictT) => void;
  handleRequestSelection?: (request: RequestT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  selectionState: ScheduleSelectionState;
  handleCellSelect: (rowId: string, date: string, scheduleId: string | null) => void;
  handleAssignmentSelect: (assignmentId: string) => void;
  isCustomSolveModeActive?: boolean;
  isCustomCellSelected?: boolean;
  onCustomCellSelect?: () => void;
  isDateInCampaign?: boolean;
}) {
  const isSelectionActive = !!selectionState?.isActive;
  const dateStr = periodDate.date.format('YYYY-MM-DD');
  const isCellSelected =
    selectionState?.selectedCells.some((c) => c.rowId === worker.id && c.date === dateStr) ?? false;
  const hasAssignments =
    scheduleViewSettings.showAssignments && !!scheduleCellData?.assignmentsData?.length;
  const hasRequests = scheduleViewSettings.showRequests && !!scheduleCellData?.requests?.length;
  const hasOtherComponents = hasAssignments || hasRequests || isSelectionActive;

  const sparkleStyle: React.CSSProperties = hasOtherComponents
    ? {
        position: 'absolute',
        bottom: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1,
        color: isCustomCellSelected ? '#1976d2' : '#9e9e9e',
        zIndex: 11,
      }
    : {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1,
        color: isCustomCellSelected ? '#1976d2' : '#9e9e9e',
        zIndex: 11,
      };

  return (
    <div
      className="cell-hover-container relative min-w-[60px] flex-1 border-r border-border/50"
      data-testid={`worker-cell-${worker.id}-${dateStr}`}
      style={{
        backgroundColor: isCellSelected ? 'rgba(25, 118, 210, 0.08)' : undefined,
        outline: isCellSelected ? '2px solid #1976d2' : undefined,
        outlineOffset: isCellSelected ? '-2px' : undefined,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {scheduleViewSettings.showAssignments &&
          scheduleCellData?.assignmentsData.map((aData) => {
            const isAssignmentSelected =
              selectionState?.selectedAssignmentIds.includes(aData.assignment.id) ?? false;
            return (
              <AssignmentCell
                key={aData.assignment.id}
                assignmentData={aData}
                scheduleViewSettings={scheduleViewSettings}
                handleAssignmentSelection={handleAssignmentSelection}
                teamWithMembership={teamWithMembership}
                isSelectionActive={isSelectionActive}
                isSelected={isAssignmentSelected}
                onAssignmentSelect={() => handleAssignmentSelect?.(aData.assignment.id)}
              />
            );
          })}
        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          {scheduleViewSettings.showRequests &&
            scheduleCellData?.requests.map((request) => {
              return (
                <RequestCell
                  key={request.id}
                  request={request}
                  shifts={shifts}
                  handleRequestSelection={handleRequestSelection}
                />
              );
            })}
        </RoleBased>
        {isSelectionActive && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: hasAssignments ? 0 : 1,
              padding: hasAssignments ? '2px 0' : 0,
            }}
          >
            <Checkbox
              size="small"
              checked={isCellSelected}
              onChange={() => handleCellSelect?.(worker.id, dateStr, periodDate.scheduleId)}
              onClick={(e) => e.stopPropagation()}
              data-testid={`worker-cell-checkbox-${worker.id}-${dateStr}`}
              sx={{
                padding: '1px',
                '& .MuiSvgIcon-root': { fontSize: 16 },
              }}
            />
          </div>
        )}
      </div>
      {!isSelectionActive && (
        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          <IconButton
            className="add-icon-button"
            sx={{
              position: 'absolute',
              bottom: -12,
              right: '50%',
              transform: 'translateX(50%)',
              opacity: 0,
              transition: 'opacity 0.3s',
              padding: 0,
              zIndex: 10,
              pointerEvents: 'auto',
            }}
            data-testid={`add-assignment-button-${worker.id}-${periodDate.date.format(
              'YYYY-MM-DD',
            )}`}
            onClick={() =>
              handleOpenCreateAssignment({
                scheduleId: periodDate.scheduleId,
                workerId: worker.id,
                shiftId: null,
                date: periodDate.date,
                haveDemand: false,
              })
            }
          >
            <AddCircleIcon />
          </IconButton>
        </RoleBased>
      )}
      {isCustomSolveModeActive && isDateInCampaign && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCustomCellSelect?.();
          }}
          data-testid={`worker-cell-custom-select-${worker.id}-${dateStr}`}
          style={sparkleStyle}
        >
          <Sparkle size={14} fill={isCustomCellSelected ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  );
}
