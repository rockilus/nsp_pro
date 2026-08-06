import React, { useState } from 'react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '../../app/i18n/client';
import { ShiftT, ShiftType } from '../../types/shift';
import { MultitaskingSelectionState } from '../../types/multitasking';
import { ShiftColorMappings, calendarGridTemplate } from '../../constants/constants';
import { ColumnDefinition, ColumnFilter, TableSort } from '../../types/filter';
import { DemandCellContent } from './DemandCellContent';
import CalendarTableHeader from '../calendar/CalendarTableHeader';
import CalendarRowHeaderCell from '../calendar/CalendarRowHeaderCell';

dayjs.extend(isoWeek);

// Types
interface SelectedCell {
  shiftId: string;
  date: string;
}

interface BulkChangeState {
  isActive: boolean;
  selectedCells: SelectedCell[];
  bulkValue: string;
}

interface ShiftDemandTableProps {
  lng: string;
  shifts: ShiftT[];
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  // Multitasking props
  multitaskingState?: MultitaskingSelectionState;
  onToggleShiftDemandSelection?: (shiftDemandId: string) => void;
  isShiftDemandSelectable?: (shiftId: string, date: Dayjs) => boolean;
  isShiftDemandSelected?: (shiftId: string, date: Dayjs) => boolean;
  // Regular props
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (shiftId: string, date: Dayjs, value: string) => Promise<void>;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  selectAllColumnCells: (date: Dayjs) => void;
  selectAllCells: () => void;
  isRowSelected: (shiftId: string) => boolean;
  isColumnSelected: (date: Dayjs) => boolean;
  isAllSelected: () => boolean;
  savingCells: Set<string>;
  maxHeight?: string;
  // Filter/Sort props
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  shiftColumn?: ColumnDefinition;
}

// ─── Cell ────────────────────────────────────────────────────────────────────

interface ShiftDemandCellProps {
  shiftId: string;
  date: Dayjs;
  value: number;
  isWeekend: boolean;
  isSelected: boolean;
  isBulkMode: boolean;
  isSaving: boolean;
  shift: ShiftT;
  isMultitaskingMode?: boolean;
  isSelectable?: boolean;
  isMultitaskingSelected?: boolean;
  onCellChange: (shiftId: string, date: Dayjs, value: string) => Promise<void>;
  onToggleSelection: (shiftId: string, date: Dayjs) => void;
  onToggleMultitaskingSelection?: (shiftDemandId: string) => void;
}

function ShiftDemandCell({
  shiftId,
  date,
  value,
  isWeekend,
  isSelected,
  isBulkMode,
  isSaving,
  shift,
  isMultitaskingMode = false,
  isSelectable = true,
  isMultitaskingSelected = false,
  onCellChange,
  onToggleSelection,
  onToggleMultitaskingSelection,
}: ShiftDemandCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { background, sample, text } = ShiftColorMappings[shift.color] || {
    background: '#f5f5f5',
    sample: '#9e9e9e',
    text: '#212121',
  };

  const handleAddDemand = async () => {
    if (isSaving) return;
    await onCellChange(shiftId, date, '1');
  };

  const handleIncrement = async () => {
    if (isSaving) return;
    await onCellChange(shiftId, date, String(value + 1));
  };

  const handleDecrement = async () => {
    if (isSaving) return;
    await onCellChange(shiftId, date, String(Math.max(0, value - 1)));
  };

  const handleCellClick = () => {
    if (isMultitaskingMode && onToggleMultitaskingSelection) {
      onToggleMultitaskingSelection(`${shiftId}-${date.format('YYYY-MM-DD')}`);
    } else if (value === 0) {
      handleAddDemand();
    }
  };

  const isWeekBoundary = date.isoWeekday() === 1;

  return (
    <div
      className={cn(
        'relative flex min-h-[40px] items-center justify-center border-r border-border/50 p-1 transition-all duration-200',
        isWeekend && 'bg-muted',
        isWeekBoundary && 'border-l-2 border-l-border',
        isMultitaskingMode && !isSelectable && 'pointer-events-none opacity-40',
        isMultitaskingMode &&
          isSelectable &&
          !isMultitaskingSelected &&
          'cursor-pointer ring-1 ring-border/30 ring-inset hover:bg-primary/5 hover:ring-primary',
        isMultitaskingMode &&
          isMultitaskingSelected &&
          'cursor-pointer bg-primary/10 shadow-sm ring-2 ring-primary ring-inset',
      )}
      style={
        {
          '--shift-bg-color': background,
          '--shift-sample-color': sample,
          '--shift-text-color': text,
        } as React.CSSProperties
      }
      data-testid={`shift-demand-cell-${shiftId}-${date.format('YYYY-MM-DD')}`}
      onClick={isMultitaskingMode ? handleCellClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isBulkMode ? (
        /* Bulk selection mode */
        <div
          className={cn(
            'flex items-center justify-center rounded px-1 py-0.5',
            isSelected && 'border border-[var(--shift-sample-color)] bg-[var(--shift-bg-color)]',
          )}
        >
          <Checkbox
            data-testid={`cell-select-checkbox-${shiftId}-${date.format('YYYY-MM-DD')}`}
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(shiftId, date)}
            className="h-3.5 w-3.5"
          />
          <span className="ml-1 text-xs">{value}</span>
        </div>
      ) : (
        <DemandCellContent
          value={value}
          isSaving={isSaving}
          isHovered={isHovered}
          isMultitaskingMode={isMultitaskingMode}
          onAddDemand={handleAddDemand}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      )}
    </div>
  );
}

// ─── Row header ──────────────────────────────────────────────────────────────

interface ShiftDemandRowHeaderProps {
  shift: ShiftT;
  isBulkMode: boolean;
  isRowSelected: boolean;
  onSelectRow: (shiftId: string) => void;
}

function ShiftDemandRowHeader({
  shift,
  isBulkMode,
  isRowSelected,
  onSelectRow,
}: ShiftDemandRowHeaderProps) {
  const { sample } = ShiftColorMappings[shift.color] || { sample: '#9e9e9e' };

  const isNextDay = !shift.endTime.isSame(shift.startTime, 'day');
  const isDutyShift = shift.shiftType === ShiftType.DUTY;
  const isOnCallShift = shift.shiftType === ShiftType.ON_CALL;

  return (
    <CalendarRowHeaderCell
      data-testid={`shift-demand-row-header-${shift.id}`}
      isBulkMode={isBulkMode}
      isSelected={isRowSelected}
      onSelect={() => onSelectRow(shift.id)}
      checkboxTestId={`row-select-checkbox-${shift.id}`}
    >
      <div className="flex w-full min-w-0 items-center gap-1">
        {/* Shift type colour bar */}
        <div
          className={cn(
            'w-1 flex-shrink-0 self-stretch rounded-sm',
            !isDutyShift && !isOnCallShift && 'invisible',
          )}
          style={
            isDutyShift
              ? { backgroundColor: sample }
              : isOnCallShift
                ? {
                    backgroundImage: `repeating-linear-gradient(to bottom, ${sample} 0px, ${sample} 8px, transparent 8px, transparent 12px)`,
                  }
                : undefined
          }
        />
        <span
          className="w-full min-w-0 py-2 text-sm font-[550] break-words text-foreground"
          data-testid={`shift-demand-name-${shift.id}`}
        >
          {shift.name || shift.acronym}
        </span>
        <div className="flex flex-shrink-0 flex-col items-start py-2 pr-2 text-[11px] leading-tight text-muted-foreground">
          <span>{shift.startTime.format('HH:mm')}</span>
          <span>
            {shift.endTime.format('HH:mm')}
            {isNextDay && <sup>+1</sup>}
          </span>
        </div>
      </div>
    </CalendarRowHeaderCell>
  );
}

interface ShiftDemandRowProps {
  shift: ShiftT;
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  multitaskingState?: MultitaskingSelectionState;
  onToggleShiftDemandSelection?: (shiftDemandId: string) => void;
  isShiftDemandSelectable?: (shiftId: string, date: Dayjs) => boolean;
  isShiftDemandSelected?: (shiftId: string, date: Dayjs) => boolean;
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (shiftId: string, date: Dayjs, value: string) => Promise<void>;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
  savingCells: Set<string>;
}

function ShiftDemandRow({
  shift,
  dates,
  bulkChangeState,
  multitaskingState,
  onToggleShiftDemandSelection,
  isShiftDemandSelectable,
  isShiftDemandSelected,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
  savingCells,
}: ShiftDemandRowProps) {
  return (
    <div
      className="min-h-[40px] border-b border-border/50"
      style={{
        display: 'grid',
        gridTemplateColumns: calendarGridTemplate(dates.length),
      }}
    >
      <ShiftDemandRowHeader
        shift={shift}
        isBulkMode={bulkChangeState.isActive}
        isRowSelected={isRowSelected(shift.id)}
        onSelectRow={selectAllRowCells}
      />
      {/* Day cells — direct grid children */}
      {dates.map((date) => {
        const value = getDemandValue(shift.id, date);
        const isWeekend = date.day() === 0 || date.day() === 6;
        const isSelected = isCellSelected(shift.id, date);
        const cellKey = `${shift.id}-${date.format('YYYY-MM-DD')}`;
        const isSaving = savingCells.has(cellKey);

        return (
          <ShiftDemandCell
            key={date.toISOString()}
            shiftId={shift.id}
            date={date}
            value={value}
            isWeekend={isWeekend}
            isSelected={isSelected}
            isBulkMode={bulkChangeState.isActive}
            isSaving={isSaving}
            shift={shift}
            isMultitaskingMode={multitaskingState?.isActive || false}
            isSelectable={isShiftDemandSelectable ? isShiftDemandSelectable(shift.id, date) : true}
            isMultitaskingSelected={
              isShiftDemandSelected ? isShiftDemandSelected(shift.id, date) : false
            }
            onCellChange={handleCellChange}
            onToggleSelection={toggleCellSelection}
            onToggleMultitaskingSelection={onToggleShiftDemandSelection}
          />
        );
      })}
    </div>
  );
}

interface ShiftDemandBodyProps {
  shifts: ShiftT[];
  dates: Dayjs[];
  bulkChangeState: BulkChangeState;
  multitaskingState?: MultitaskingSelectionState;
  onToggleShiftDemandSelection?: (shiftDemandId: string) => void;
  isShiftDemandSelectable?: (shiftId: string, date: Dayjs) => boolean;
  isShiftDemandSelected?: (shiftId: string, date: Dayjs) => boolean;
  getDemandValue: (shiftId: string, date: Dayjs) => number;
  handleCellChange: (shiftId: string, date: Dayjs, value: string) => Promise<void>;
  isCellSelected: (shiftId: string, date: Dayjs) => boolean;
  toggleCellSelection: (shiftId: string, date: Dayjs) => void;
  selectAllRowCells: (shiftId: string) => void;
  isRowSelected: (shiftId: string) => boolean;
  savingCells: Set<string>;
}

function ShiftDemandBody({
  shifts,
  dates,
  bulkChangeState,
  multitaskingState,
  onToggleShiftDemandSelection,
  isShiftDemandSelectable,
  isShiftDemandSelected,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  isRowSelected,
  savingCells,
}: ShiftDemandBodyProps) {
  return (
    <div className="flex flex-col bg-card">
      {shifts.map((shift) => (
        <ShiftDemandRow
          key={shift.id}
          shift={shift}
          dates={dates}
          bulkChangeState={bulkChangeState}
          multitaskingState={multitaskingState}
          onToggleShiftDemandSelection={onToggleShiftDemandSelection}
          isShiftDemandSelectable={isShiftDemandSelectable}
          isShiftDemandSelected={isShiftDemandSelected}
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          isRowSelected={isRowSelected}
          savingCells={savingCells}
        />
      ))}
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

export default function ShiftDemandTable({
  lng,
  shifts,
  dates,
  bulkChangeState,
  multitaskingState,
  onToggleShiftDemandSelection,
  isShiftDemandSelectable,
  isShiftDemandSelected,
  getDemandValue,
  handleCellChange,
  isCellSelected,
  toggleCellSelection,
  selectAllRowCells,
  selectAllColumnCells,
  selectAllCells,
  isRowSelected,
  isColumnSelected,
  isAllSelected,
  savingCells,
  maxHeight = '70vh',
  currentSort,
  currentFilter,
  onSort,
  onFilter,
  shiftColumn,
}: ShiftDemandTableProps) {
  const { t } = useTranslation(lng, 'shift-demands');

  const leadingColumnContent = bulkChangeState.isActive ? (
    <Checkbox
      data-testid="select-all-checkbox"
      checked={isAllSelected()}
      onCheckedChange={selectAllCells}
      className="h-3.5 w-3.5"
    />
  ) : undefined;

  return (
    <div
      className="relative w-full overflow-auto rounded border border-border/50"
      style={{ maxHeight }}
      data-testid="shift-demand-table"
    >
      <CalendarTableHeader
        lng={lng}
        days={dates}
        rowHeaderLabel={t('shift')}
        rowColumn={shiftColumn}
        currentSort={currentSort}
        currentFilter={currentFilter}
        onSort={onSort}
        onFilter={onFilter}
        leadingColumnContent={leadingColumnContent}
        isBulkMode={bulkChangeState.isActive}
        isColumnSelected={isColumnSelected}
        onColumnSelect={selectAllColumnCells}
      />

      <ShiftDemandBody
        shifts={shifts}
        dates={dates}
        bulkChangeState={bulkChangeState}
        multitaskingState={multitaskingState}
        onToggleShiftDemandSelection={onToggleShiftDemandSelection}
        isShiftDemandSelectable={isShiftDemandSelectable}
        isShiftDemandSelected={isShiftDemandSelected}
        getDemandValue={getDemandValue}
        handleCellChange={handleCellChange}
        isCellSelected={isCellSelected}
        toggleCellSelection={toggleCellSelection}
        selectAllRowCells={selectAllRowCells}
        isRowSelected={isRowSelected}
        savingCells={savingCells}
      />
    </div>
  );
}
