import React from 'react';
import { useTranslation } from '../../../../app/i18n/client';
// shadcn/ui
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/tooltip';
// Components
import TableFilterBar from '../../../table/TableFilterBar';
import CalendarTableHeader from '../../../calendar/CalendarTableHeader';
import CalendarRowHeaderCell from '../../../calendar/CalendarRowHeaderCell';
import DailyShiftDemandRow from '../shared/daily-shift-demand-row';
import ShiftCell from './shift-cell';
import { RoleBased } from '../../../access/role-based';
import { buildScheduleCellDict, generateOwnerIdDateKey } from '../shared/assignment-utils';
import { getRelevantShifts } from './shift-table-utils';
import { countShiftsTotalPeriod } from '../shared/assignment-count-methods';
// Types
import { ShiftT, ShiftType } from '../../../../types/shift';
import { WorkerT } from '../../../../types/worker';
import {
  ScheduleT,
  periodDateT,
  AssignmentDataT,
  ScheduleCellDataT,
  ScheduleViewSettingsT,
} from '../../../../types/schedule';
import { BreachT } from '@/types/breach';
import { ShiftDemandDTO } from '@/types/shiftDemand';
import { AssignmentT, CreateAssignmentT } from '@/types/assignment';
import { RequestT } from '../../../../types/request';
import { AttributeOwnerType } from '../../../../types/attribute';
import { RecurrenceRuleT } from '@/types/recurrence';
import { TeamMembershipRole, TeamWithMembership } from '@/types/team';
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
  SelectionScope,
} from '../../../../types/scheduleSelection';
// Constants
import { ShiftColorMappings, calendarGridTemplate } from '../../../../constants/constants';
import { ColumnDefinition, ColumnFilter, TableSort } from '@/types/filter';
import { useLocalStorageState } from '@/app/lib/hooks/useLocalStorageState';

// ─── Inline ShiftRowHeader content ──────────────────────────────────────────

function ShiftRowHeaderContent({
  lng,
  teamWithMembership,
  shift,
  assignments,
  shiftDemands,
  scheduleCampaign,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  shift: ShiftT;
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  scheduleCampaign: ScheduleT | null;
}) {
  const { t } = useTranslation(lng, 'schedule-page');
  const { sample } = ShiftColorMappings[shift.color] || { sample: '#9e9e9e' };

  const { countActual: shiftCountActual, countTarget: shiftCountTarget } = scheduleCampaign
    ? countShiftsTotalPeriod(
        [shift],
        assignments,
        shiftDemands,
        scheduleCampaign.startDate,
        scheduleCampaign.endDate,
      )
    : { countActual: 0, countTarget: 0 };

  return (
    <div className="flex min-w-0 flex-1 flex-row items-center">
      {/* Colored type marker */}
      {shift.shiftType === ShiftType.DUTY && (
        <div className="mr-1 h-full w-1 shrink-0 rounded-sm" style={{ backgroundColor: sample }} />
      )}
      {/* Left: name + stats */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="truncate text-[0.9rem] font-semibold text-foreground"
          data-testid={`shift-name-${shift.id}`}
        >
          {shift.name} ({shift.acronym})
        </span>
        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          <TooltipProvider>
            {teamWithMembership.team.useSolver && scheduleCampaign && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={
                      shiftCountActual !== shiftCountTarget
                        ? 'text-[0.8rem] font-medium text-destructive'
                        : 'text-[0.8rem] font-medium text-green-600'
                    }
                    data-testid={`shift-count-${shift.id}`}
                  >
                    {shiftCountActual} / {shiftCountTarget}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('shift_count_tooltip')}</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </RoleBased>
      </div>
      {/* Right: times */}
      <div className="flex shrink-0 flex-col items-center justify-center px-1">
        <span
          className="text-[0.75rem] font-medium text-muted-foreground"
          data-testid={`shift-time-start-${shift.id}`}
        >
          {shift.startTime.format('HH:mm')}
        </span>
        <span
          className="text-[0.75rem] font-medium text-muted-foreground"
          data-testid={`shift-time-end-${shift.id}`}
        >
          {shift.endTime.format('HH:mm')}
          {!shift.endTime.isSame(shift.startTime, 'day') && <sup>+1</sup>}
        </span>
      </div>
    </div>
  );
}

// ─── Inline ShiftRow ─────────────────────────────────────────────────────────

function ShiftRow({
  lng,
  teamWithMembership,
  shift,
  assignments,
  shiftDemands,
  periodDates,
  scheduleCampaign,
  scheduleCellsDict,
  scheduleViewSettings,
  selectionState,
  selectionScope,
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
  handleCellSelect,
  handleAssignmentSelect,
  handleRowSelect,
  isCustomSolveModeActive = false,
  customSolveSelectedCells = [],
  handleCustomRowSelect,
  handleCustomCellSelect,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  shift: ShiftT;
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  scheduleCellsDict: Record<
    string,
    import('../../../../types/schedule').ScheduleCellDataT | undefined
  >;
  scheduleViewSettings: ScheduleViewSettingsT;
  selectionState: ScheduleSelectionState;
  selectionScope: SelectionScope;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  handleCellSelect: (rowId: string, date: string, scheduleId: string | null) => void;
  handleAssignmentSelect: (assignmentId: string) => void;
  handleRowSelect: (rowId: string, scope: SelectionScope) => void;
  isCustomSolveModeActive?: boolean;
  customSolveSelectedCells?: SelectedScheduleCell[];
  handleCustomRowSelect?: (rowId: string) => void;
  handleCustomCellSelect?: (rowId: string, date: string, scheduleId: string | null) => void;
}) {
  const shiftCustomCells = customSolveSelectedCells.filter((c) => c.rowId === shift.id);
  const isRowCustomSelected = isCustomSolveModeActive && shiftCustomCells.length > 0;

  const isRowSelected =
    !!selectionState?.isActive &&
    ((!!selectionState.campaignIntent &&
      (selectionState.campaignIntent.selectedRowIds.length === 0 ||
        selectionState.campaignIntent.selectedRowIds.includes(shift.id))) ||
      (periodDates.length > 0 &&
        periodDates.every((pd) =>
          selectionState.selectedCells.some(
            (c) => c.rowId === shift.id && c.date === pd.date.format('YYYY-MM-DD'),
          ),
        )));

  const isRowIndeterminate =
    !!selectionState?.isActive &&
    !(
      !!selectionState.campaignIntent &&
      (selectionState.campaignIntent.selectedRowIds.length === 0 ||
        selectionState.campaignIntent.selectedRowIds.includes(shift.id))
    ) &&
    !periodDates.every((pd) =>
      selectionState.selectedCells.some(
        (c) => c.rowId === shift.id && c.date === pd.date.format('YYYY-MM-DD'),
      ),
    ) &&
    (periodDates.some((pd) =>
      selectionState.selectedCells.some(
        (c) => c.rowId === shift.id && c.date === pd.date.format('YYYY-MM-DD'),
      ),
    ) ||
      assignments.some(
        (a) => a.shiftId === shift.id && selectionState.selectedAssignmentIds.includes(a.id),
      ));

  return (
    <div
      className="border-b border-border/50"
      style={{
        display: 'grid',
        gridTemplateColumns: calendarGridTemplate(periodDates.length),
      }}
    >
      <CalendarRowHeaderCell
        data-testid={`shift-row-header-${shift.id}`}
        isBulkMode={!!selectionState?.isActive}
        isSelected={isRowSelected}
        isIndeterminate={isRowIndeterminate}
        onSelect={() => handleRowSelect(shift.id, selectionScope ?? 'view')}
        checkboxTestId={`shift-row-checkbox-${shift.id}`}
        isCustomSolveMode={isCustomSolveModeActive}
        isCustomSelected={isRowCustomSelected}
        isCustomIndeterminate={false}
        onCustomSelect={() => handleCustomRowSelect?.(shift.id)}
        customSelectTestId={`shift-row-custom-select-${shift.id}`}
        className="py-1"
      >
        <ShiftRowHeaderContent
          lng={lng}
          teamWithMembership={teamWithMembership}
          shift={shift}
          assignments={assignments}
          shiftDemands={shiftDemands}
          scheduleCampaign={scheduleCampaign}
        />
      </CalendarRowHeaderCell>

      {/* Day cells — direct grid children */}
      {periodDates.map((pDate, dateIndex) => {
        const scheduleCellDataKey = generateOwnerIdDateKey(shift.id, pDate.date);
        const scheduleCellData = scheduleCellsDict[scheduleCellDataKey] ?? null;
        return (
          <ShiftCell
            key={dateIndex}
            lng={lng}
            teamWithMembership={teamWithMembership}
            periodDate={pDate}
            shift={shift}
            scheduleCellData={scheduleCellData}
            scheduleViewSettings={scheduleViewSettings}
            selectionState={selectionState}
            handleAssignmentSelection={handleAssignmentSelection}
            handleDemandSelection={handleDemandSelection}
            handleOpenCreateAssignment={handleOpenCreateAssignment}
            handleCellSelect={handleCellSelect}
            handleAssignmentSelect={handleAssignmentSelect}
            isCustomSolveModeActive={isCustomSolveModeActive}
            isCustomCellSelected={customSolveSelectedCells.some(
              (c) => c.rowId === shift.id && c.date === pDate.date.format('YYYY-MM-DD'),
            )}
            onCustomCellSelect={() =>
              handleCustomCellSelect?.(shift.id, pDate.date.format('YYYY-MM-DD'), pDate.scheduleId)
            }
            isDateInCampaign={
              scheduleCampaign
                ? !pDate.date.isBefore(scheduleCampaign.startDate, 'day') &&
                  !pDate.date.isAfter(scheduleCampaign.endDate, 'day')
                : false
            }
          />
        );
      })}
    </div>
  );
}

// ─── ScheduleTableShift ──────────────────────────────────────────────────────

export default function ScheduleTableShift({
  lng,
  teamWithMembership,
  shifts,
  workers,
  requests,
  assignments,
  shiftDemands,
  recurrences,
  scheduleCampaign,
  periodDates,
  breaches,
  scheduleViewSettings,
  selectionState,
  selectionScope,
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
  handleCellSelect,
  handleAssignmentSelect,
  handleRowSelect,
  handleColumnSelect,
  handleSelectAll,
  isCustomSolveModeActive = false,
  customSolveSelectedCells = [],
  handleCustomRowSelect,
  handleCustomColumnSelect,
  handleCustomCellSelect,
  handleCustomSelectAll,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  recurrences: RecurrenceRuleT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  breaches: BreachT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  selectionState: ScheduleSelectionState;
  selectionScope: SelectionScope;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  handleCellSelect: (rowId: string, date: string, scheduleId: string | null) => void;
  handleAssignmentSelect: (assignmentId: string) => void;
  handleRowSelect: (rowId: string, scope: SelectionScope) => void;
  handleColumnSelect: (date: string, rowIds: string[], scope: SelectionScope) => void;
  handleSelectAll: (rowIds: string[], scope: SelectionScope) => void;
  isCustomSolveModeActive?: boolean;
  customSolveSelectedCells?: SelectedScheduleCell[];
  handleCustomRowSelect?: (rowId: string) => void;
  handleCustomColumnSelect?: (date: string, rowIds: string[]) => void;
  handleCustomCellSelect?: (rowId: string, date: string, scheduleId: string | null) => void;
  handleCustomSelectAll?: (cells: SelectedScheduleCell[]) => void;
}) {
  const { t } = useTranslation(lng, 'schedule-page');
  const teamId = teamWithMembership.team.id;
  const [currentSort, setCurrentSort] = useLocalStorageState<TableSort | null>(
    `scheduleViewSettings_${teamId}_shiftTableSort`,
    null,
  );
  const [currentFilter, setCurrentFilter] = useLocalStorageState<ColumnFilter | null>(
    `scheduleViewSettings_${teamId}_shiftTableFilter`,
    null,
  );

  const shiftColumn: ColumnDefinition = {
    id: 'name',
    label: t('shift'),
    type: 'text',
    getValue: (s: ShiftT) => s.name,
  };

  const allShiftsForHeader = getRelevantShifts(shifts, assignments);
  const shiftsForHeader = (() => {
    let result = allShiftsForHeader;
    if (
      currentFilter &&
      currentFilter.id === 'name' &&
      typeof currentFilter.value === 'string' &&
      currentFilter.value
    ) {
      const needle = currentFilter.value.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(needle));
    }
    if (currentSort && currentSort.columnId === 'name') {
      result = [...result].sort((a, b) =>
        currentSort.direction === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name),
      );
    }
    return result;
  })();

  const scheduleCellDict = buildScheduleCellDict(
    AttributeOwnerType.SHIFT,
    assignments,
    shiftDemands,
    recurrences,
    requests,
    workers,
    shifts,
    breaches,
  );

  const days = periodDates.map((pd) => pd.date);

  return (
    <div
      className="flex h-[calc(100vh-104px)] w-full flex-col overflow-auto"
      data-testid="schedule-table-shift"
    >
      {/* Sticky header */}
      <CalendarTableHeader
        lng={lng}
        days={days}
        rowHeaderLabel={t('shift')}
        rowColumn={shiftColumn}
        currentSort={currentSort ?? undefined}
        currentFilter={currentFilter ?? undefined}
        onSort={setCurrentSort}
        onFilter={(f) => setCurrentFilter(f)}
        leadingColumnContent={null}
        isBulkMode={!!selectionState?.isActive}
        isColumnSelected={(d) => {
          const date = d.format('YYYY-MM-DD');
          return shiftsForHeader.every((s) =>
            selectionState?.selectedCells.some((c) => c.rowId === s.id && c.date === date),
          );
        }}
        onColumnSelect={(d) =>
          handleColumnSelect(
            d.format('YYYY-MM-DD'),
            shiftsForHeader.map((s) => s.id),
            selectionScope ?? 'view',
          )
        }
        isCustomSolveMode={isCustomSolveModeActive}
        isCustomColumnSelected={(d) => {
          const date = d.format('YYYY-MM-DD');
          return (
            shiftsForHeader.length > 0 &&
            shiftsForHeader.every((s) =>
              customSolveSelectedCells.some((c) => c.rowId === s.id && c.date === date),
            )
          );
        }}
        isCustomColumnIndeterminate={(d) => {
          const date = d.format('YYYY-MM-DD');
          const allSelected =
            shiftsForHeader.length > 0 &&
            shiftsForHeader.every((s) =>
              customSolveSelectedCells.some((c) => c.rowId === s.id && c.date === date),
            );
          const someSelected = shiftsForHeader.some((s) =>
            customSolveSelectedCells.some((c) => c.rowId === s.id && c.date === date),
          );
          return someSelected && !allSelected;
        }}
        onCustomColumnSelect={(d) =>
          handleCustomColumnSelect?.(
            d.format('YYYY-MM-DD'),
            shiftsForHeader.map((s) => s.id),
          )
        }
      />

      {/* Active filter/sort indicator */}
      {(currentSort || currentFilter) && (
        <TableFilterBar
          lng={lng}
          filters={currentFilter ? [currentFilter] : []}
          sort={currentSort ?? null}
          onRemoveFilter={() => setCurrentFilter(null)}
          onRemoveSort={() => setCurrentSort(null)}
          onResetAll={() => {
            setCurrentSort(null);
            setCurrentFilter(null);
          }}
        />
      )}

      {/* Shift demand row */}
      <RoleBased
        role={teamWithMembership.membership.role}
        allowedRoles={[TeamMembershipRole.OWNER]}
      >
        {teamWithMembership.team.useSolver && (
          <DailyShiftDemandRow
            lng={lng}
            shifts={shifts}
            assignments={assignments}
            shiftDemands={shiftDemands}
            periodDates={periodDates}
            scheduleViewSettings={scheduleViewSettings}
          />
        )}
      </RoleBased>

      {/* Shift rows */}
      {shiftsForHeader.map((shift, shiftIndex) => (
        <ShiftRow
          key={shiftIndex}
          lng={lng}
          teamWithMembership={teamWithMembership}
          shift={shift}
          assignments={assignments}
          shiftDemands={shiftDemands}
          periodDates={periodDates}
          scheduleCampaign={scheduleCampaign}
          scheduleCellsDict={scheduleCellDict}
          scheduleViewSettings={scheduleViewSettings}
          selectionState={selectionState}
          selectionScope={selectionScope}
          handleAssignmentSelection={handleAssignmentSelection}
          handleDemandSelection={handleDemandSelection}
          handleOpenCreateAssignment={handleOpenCreateAssignment}
          handleCellSelect={handleCellSelect}
          handleAssignmentSelect={handleAssignmentSelect}
          handleRowSelect={handleRowSelect}
          isCustomSolveModeActive={isCustomSolveModeActive}
          customSolveSelectedCells={customSolveSelectedCells}
          handleCustomRowSelect={handleCustomRowSelect}
          handleCustomCellSelect={handleCustomCellSelect}
        />
      ))}
    </div>
  );
}
