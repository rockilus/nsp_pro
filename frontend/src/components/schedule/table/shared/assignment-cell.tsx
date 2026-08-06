import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
// Styles
import './assignment-cell.css';
// Types
import { AssignmentDataT, ScheduleViewSettingsT } from '../../../../types/schedule';
import { TeamMembershipRole, TeamWithMembership } from '@/types/team';
// Constants
import { ShiftColorMappings } from '../../../../constants/constants';
import { AssignmentChip } from './assignment-chip';

export default function AssignmentCell({
  assignmentData,
  scheduleViewSettings,
  handleAssignmentSelection,
  teamWithMembership,
  isSelectionActive,
  isSelected,
  onAssignmentSelect,
}: {
  assignmentData: AssignmentDataT;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedCell: AssignmentDataT) => void;
  teamWithMembership: TeamWithMembership;
  isSelectionActive: boolean;
  isSelected: boolean;
  onAssignmentSelect: () => void;
}) {
  const { background, sample, text } = ShiftColorMappings[assignmentData.shift.color] || {
    background: '#f5f5f5',
    sample: '#9e9e9e',
    text: '#212121',
  };

  return (
    <div
      className="assignment-cell-container"
      data-testid={`assignment-cell-${assignmentData.assignment.id}`}
      onClick={() => {
        if (teamWithMembership.membership.role === TeamMembershipRole.OWNER) {
          if (isSelectionActive && onAssignmentSelect) {
            onAssignmentSelect();
          } else {
            handleAssignmentSelection(assignmentData);
          }
        }
      }}
      style={
        {
          '--bg-color': background,
          '--text-color': text,
          position: 'relative',
          cursor:
            teamWithMembership.membership.role === TeamMembershipRole.OWNER ? 'pointer' : 'default',
          outline: isSelected ? '2px solid #1976d2' : undefined,
          outlineOffset: isSelected ? '-2px' : undefined,
        } as React.CSSProperties
      }
    >
      {isSelectionActive && (
        <Checkbox
          checked={!!isSelected}
          onCheckedChange={() => onAssignmentSelect?.()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 z-[5] size-3.5 p-px"
          data-testid={`assignment-checkbox-${assignmentData.assignment.id}`}
        />
      )}
      <AssignmentChip
        name={
          scheduleViewSettings.groupBy === 'worker'
            ? assignmentData.shift.name
            : assignmentData.worker.name
        }
        acronym={
          scheduleViewSettings.groupBy === 'worker'
            ? assignmentData.shift.acronym
            : assignmentData.worker.acronym
        }
        showFullName={scheduleViewSettings.timeFrame === 'week'}
        shiftType={assignmentData.shift.shiftType}
        shiftStartTime={assignmentData.shift.startTime.format('HH:mm')}
        shiftEndTime={assignmentData.shift.endTime.format('HH:mm')}
        isNextDay={!assignmentData.shift.endTime.isSame(assignmentData.shift.startTime, 'day')}
        showTimes={
          scheduleViewSettings.groupBy === 'worker' && scheduleViewSettings.timeFrame === 'week'
        }
        isFixed={assignmentData.assignment.fixed}
        shiftColor={{ background, sample, text }}
      />
    </div>
  );
}
