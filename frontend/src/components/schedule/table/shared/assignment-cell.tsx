import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
// Styles
import './assignment-cell.css';
// Types
import { AssignmentDataT, ScheduleViewSettingsT } from '../../../../types/schedule';
import { ShiftType } from '@/types/shift';
import { TeamMembershipRole, TeamWithMembership } from '@/types/team';
import { AssignmentSource } from '@/types/assignment';
// Constants
import { ShiftColorMappings } from '../../../../constants/constants';

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
      <span className="a-cell-title">
        {scheduleViewSettings.groupBy === 'worker'
          ? scheduleViewSettings.timeFrame === 'week'
            ? assignmentData.shift.name
            : assignmentData.shift.acronym
          : scheduleViewSettings.groupBy === 'shift'
            ? scheduleViewSettings.timeFrame === 'week'
              ? assignmentData.worker.name
              : assignmentData.worker.acronym
            : null}
      </span>
      {scheduleViewSettings.groupBy === 'worker' && scheduleViewSettings.timeFrame === 'week' && (
        <div className="a-cell-shift-times-container">
          <span className="a-cell-shift-times-text">
            {assignmentData.shift.startTime.format('HH:mm')}
          </span>
          <span className="a-cell-shift-times-text">{' - '}</span>
          <span className="a-cell-shift-times-text">
            {assignmentData.shift.endTime.format('HH:mm')}
            {!assignmentData.shift.endTime.isSame(assignmentData.shift.startTime, 'day') && (
              <sup>+1</sup>
            )}
          </span>
        </div>
      )}
      {scheduleViewSettings.groupBy === 'worker' && (
        <div
          className={`a-cell-shift-type-marker ${
            assignmentData.shift.shiftType === ShiftType.DUTY
              ? 'duty'
              : assignmentData.shift.shiftType === ShiftType.ON_CALL
                ? 'on-call'
                : 'other'
          }`}
          style={{ '--bg-color': sample } as React.CSSProperties}
        ></div>
      )}
      {assignmentData.assignment.fixed && (
        <span className="assignment-fixed-lock" aria-label="fixed">
          🔒
        </span>
      )}
      <span className="assignment-source-icons">
        {assignmentData.assignment.source === AssignmentSource.RECURRENCE && (
          <span className="assignment-source-icon" aria-label="recurring">
            🔁
          </span>
        )}
        {assignmentData.assignment.source === AssignmentSource.ROTATION && (
          <span className="assignment-source-icon" aria-label="rotation">
            🔄
          </span>
        )}
      </span>
    </div>
  );
}
