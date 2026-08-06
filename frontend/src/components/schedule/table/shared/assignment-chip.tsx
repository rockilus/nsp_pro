import React from 'react';
import { cn } from '@/lib/utils';
import { ShiftType } from '@/types/shift';
import './assignment-cell.css';

interface AssignmentChipProps {
  name: string;
  acronym: string;
  showFullName: boolean;
  shiftType: ShiftType;
  shiftStartTime: string;
  shiftEndTime: string;
  isNextDay: boolean;
  showTimes: boolean;
  isFixed?: boolean;
  shiftColor: { background: string; sample: string; text: string };
  onClick?: () => void;
  className?: string;
  dataTestId?: string;
}

export function AssignmentChip({
  name,
  acronym,
  showFullName,
  shiftType,
  shiftStartTime,
  shiftEndTime,
  isNextDay,
  showTimes,
  isFixed = false,
  shiftColor,
  onClick,
  className,
  dataTestId,
}: AssignmentChipProps) {
  const displayName = showFullName ? name : acronym;

  return (
    <div
      className={cn('flex flex-col rounded-[3px] px-1 py-0.5', className)}
      style={{
        backgroundColor: shiftColor.background,
        color: shiftColor.text,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      data-testid={dataTestId}
    >
      <span className="a-cell-title">{displayName}</span>

      {showTimes && (
        <div className="a-cell-shift-times-container">
          <span className="a-cell-shift-times-text">{shiftStartTime}</span>
          <span className="a-cell-shift-times-text">{' - '}</span>
          <span className="a-cell-shift-times-text">
            {shiftEndTime}
            {isNextDay && <sup>+1</sup>}
          </span>
        </div>
      )}

      <div
        className={`a-cell-shift-type-marker ${
          shiftType === ShiftType.DUTY
            ? 'duty'
            : shiftType === ShiftType.ON_CALL
              ? 'on-call'
              : 'other'
        }`}
        style={{ '--bg-color': shiftColor.sample } as React.CSSProperties}
      />

      {isFixed && (
        <span className="assignment-fixed-lock" aria-label="fixed">
          {'\uD83D\uDD12'}
        </span>
      )}
    </div>
  );
}
