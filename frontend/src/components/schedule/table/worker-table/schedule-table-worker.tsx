import React from 'react';
import dayjs from 'dayjs';
import { calendarGridTemplate } from '../../../../constants/constants';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useTranslation } from '../../../../app/i18n/client';
// shadcn/ui
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/tooltip';
// Components
import TableFilterBar from '../../../table/TableFilterBar';
import CalendarTableHeader from '../../../calendar/CalendarTableHeader';
import CalendarRowHeaderCell from '../../../calendar/CalendarRowHeaderCell';
import DailyShiftDemandRow from '../shared/daily-shift-demand-row';
import WorkerCell from './worker-cell';
import { RoleBased } from '../../../access/role-based';
import { buildScheduleCellDict, generateOwnerIdDateKey } from '../shared/assignment-utils';
import { getRelevantWorkers } from './worker-table-utils';
// Types
import { ShiftT, ShiftType } from '../../../../types/shift';
import { WorkerT } from '../../../../types/worker';
import { ScheduleT, periodDateT, ScheduleViewSettingsT } from '../../../../types/schedule';
import { BreachT } from '@/types/breach';
import { ShiftDemandDTO } from '@/types/shiftDemand';
import { CreateAssignmentT } from '@/types/assignment';
import { AssignmentDataDictT } from '@/types/assignment';
import { AssignmentT } from '@/types/assignment';
import { RequestT } from '../../../../types/request';
import { AttributeOwnerType } from '../../../../types/attribute';
import { RecurrenceRuleT } from '@/types/recurrence';
import { TeamMembershipRole, TeamWithMembership } from '@/types/team';
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
  SelectionScope,
} from '@/types/scheduleSelection';
import { ColumnDefinition, ColumnFilter, TableSort } from '@/types/filter';
import { useLocalStorageState } from '@/app/lib/hooks/useLocalStorageState';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// ─── Inline WorkerRowHeader content ─────────────────────────────────────────

function WorkerRowHeaderContent({
  lng,
  worker,
  shifts,
  assignments,
  scheduleCampaign,
  teamWithMembership,
}: {
  lng: string;
  worker: WorkerT;
  shifts: ShiftT[];
  assignments: AssignmentT[];
  scheduleCampaign: ScheduleT | null;
  teamWithMembership: TeamWithMembership;
}) {
  const { t } = useTranslation(lng, 'schedule-page');

  const assignmentsWorker = scheduleCampaign
    ? assignments.filter(
        (a) =>
          a.workerId === worker.id &&
          a.date.isSameOrAfter(scheduleCampaign.startDate, 'day') &&
          a.date.isSameOrBefore(scheduleCampaign.endDate, 'day'),
      )
    : [];

  const shiftMap = shifts.reduce(
    (map, s) => {
      map[s.id] = s;
      return map;
    },
    {} as Record<string, ShiftT>,
  );

  const weeklyWorkTimeActual = (() => {
    if (!scheduleCampaign) return 0;
    const total = assignmentsWorker.reduce((acc, a) => {
      const s = shiftMap[a.shiftId];
      if (s && (s.shiftType === ShiftType.NORMAL || s.shiftType === ShiftType.DUTY)) {
        return acc + s.endTime.diff(s.startTime, 'hour', true);
      }
      return acc;
    }, 0);
    const weeks = (scheduleCampaign.endDate.diff(scheduleCampaign.startDate, 'day') + 1) / 7;
    return total / weeks;
  })();

  const dutiesPerMonthActual = (() => {
    if (!scheduleCampaign) return 0;
    const total = assignmentsWorker.reduce((acc, a) => {
      const s = shiftMap[a.shiftId];
      return s && s.shiftType === ShiftType.DUTY ? acc + 1 : acc;
    }, 0);
    const months = scheduleCampaign.endDate.diff(scheduleCampaign.startDate, 'month', true);
    return total / months;
  })();

  return (
    <div className="flex min-w-0 flex-col pl-1">
      <span
        className="truncate text-[0.9rem] font-semibold text-foreground"
        data-testid={`worker-name-${worker.id}`}
      >
        {worker.name} ({worker.acronym})
      </span>
      <RoleBased
        role={teamWithMembership.membership.role}
        allowedRoles={[TeamMembershipRole.OWNER]}
      >
        <TooltipProvider>
          {scheduleCampaign && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-0.5 text-[0.8rem]"
                  data-testid={`worker-stats-hours-${worker.id}`}
                >
                  <span
                    className={
                      weeklyWorkTimeActual > worker.weeklyHoursDesired
                        ? 'font-medium text-destructive'
                        : 'font-medium text-green-600'
                    }
                  >
                    {weeklyWorkTimeActual.toFixed(1)}/{worker.weeklyHoursDesired}
                  </span>
                  <span className="text-[0.7rem] font-light text-muted-foreground italic">
                    {t('h/week')}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('h/week_tooltip')}</TooltipContent>
            </Tooltip>
          )}
          {scheduleCampaign && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-0.5 text-[0.8rem]"
                  data-testid={`worker-stats-duties-${worker.id}`}
                >
                  <span
                    className={
                      dutiesPerMonthActual > worker.dutiesPerMonth
                        ? 'font-medium text-destructive'
                        : 'font-medium text-green-600'
                    }
                  >
                    {dutiesPerMonthActual.toFixed(1)}/{worker.dutiesPerMonth}
                  </span>
                  <span className="text-[0.7rem] font-light text-muted-foreground italic">
                    {t('duties/month')}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('duties/month_tooltip')}</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </RoleBased>
    </div>
  );
}

// ─── Inline WorkerRow ────────────────────────────────────────────────────────

function WorkerRow({
  lng,
  worker,
  shifts,
  assignments,
  scheduleCampaign,
  periodDates,
  scheduleCellsDict,
  scheduleViewSettings,
  teamWithMembership,
  handleAssignmentSelection,
  handleRequestSelection,
  handleOpenCreateAssignment,
  selectionState,
  selectionScope,
  handleCellSelect,
  handleAssignmentSelect,
  handleRowSelect,
  isCustomSolveModeActive = false,
  customSolveSelectedCells = [],
  handleCustomRowSelect,
  handleCustomCellSelect,
}: {
  lng: string;
  worker: WorkerT;
  shifts: ShiftT[];
  assignments: AssignmentT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  scheduleCellsDict: Record<
    string,
    import('../../../../types/schedule').ScheduleCellDataT | undefined
  >;
  scheduleViewSettings: ScheduleViewSettingsT;
  teamWithMembership: TeamWithMembership;
  handleAssignmentSelection: (selectedCell: AssignmentDataDictT) => void;
  handleRequestSelection?: (request: RequestT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  selectionState: ScheduleSelectionState;
  selectionScope: SelectionScope;
  handleCellSelect: (rowId: string, date: string, scheduleId: string | null) => void;
  handleAssignmentSelect: (assignmentId: string) => void;
  handleRowSelect: (rowId: string, scope: SelectionScope) => void;
  isCustomSolveModeActive?: boolean;
  customSolveSelectedCells?: SelectedScheduleCell[];
  handleCustomRowSelect?: (rowId: string) => void;
  handleCustomCellSelect?: (rowId: string, date: string, scheduleId: string | null) => void;
}) {
  const workerCustomCells = customSolveSelectedCells.filter((c) => c.rowId === worker.id);
  const isRowCustomSelected = isCustomSolveModeActive && workerCustomCells.length > 0;

  const isRowSelected =
    !!selectionState?.isActive &&
    ((!!selectionState.campaignIntent &&
      (selectionState.campaignIntent.selectedRowIds.length === 0 ||
        selectionState.campaignIntent.selectedRowIds.includes(worker.id))) ||
      (periodDates.length > 0 &&
        periodDates.every((pd) =>
          selectionState.selectedCells.some(
            (c) => c.rowId === worker.id && c.date === pd.date.format('YYYY-MM-DD'),
          ),
        )));

  const isRowIndeterminate =
    !!selectionState?.isActive &&
    !(
      !!selectionState.campaignIntent &&
      (selectionState.campaignIntent.selectedRowIds.length === 0 ||
        selectionState.campaignIntent.selectedRowIds.includes(worker.id))
    ) &&
    !periodDates.every((pd) =>
      selectionState.selectedCells.some(
        (c) => c.rowId === worker.id && c.date === pd.date.format('YYYY-MM-DD'),
      ),
    ) &&
    (periodDates.some((pd) =>
      selectionState.selectedCells.some(
        (c) => c.rowId === worker.id && c.date === pd.date.format('YYYY-MM-DD'),
      ),
    ) ||
      assignments.some(
        (a) => a.workerId === worker.id && selectionState.selectedAssignmentIds.includes(a.id),
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
        data-testid={`worker-row-header-${worker.id}`}
        isBulkMode={!!selectionState?.isActive}
        isSelected={isRowSelected}
        isIndeterminate={isRowIndeterminate}
        onSelect={() => handleRowSelect(worker.id, selectionScope ?? 'view')}
        checkboxTestId={`worker-row-checkbox-${worker.id}`}
        isCustomSolveMode={isCustomSolveModeActive}
        isCustomSelected={isRowCustomSelected}
        isCustomIndeterminate={false}
        onCustomSelect={() => handleCustomRowSelect?.(worker.id)}
        customSelectTestId={`worker-row-custom-select-${worker.id}`}
        className="py-1"
      >
        <WorkerRowHeaderContent
          lng={lng}
          worker={worker}
          shifts={shifts}
          assignments={assignments}
          scheduleCampaign={scheduleCampaign}
          teamWithMembership={teamWithMembership}
        />
      </CalendarRowHeaderCell>

      {/* Day cells — direct grid children */}
      {periodDates.map((pDate, dateIndex) => {
        const scheduleCellDataKey = generateOwnerIdDateKey(worker.id, pDate.date);
        const scheduleCellData = scheduleCellsDict[scheduleCellDataKey] ?? null;
        return (
          <WorkerCell
            key={dateIndex}
            periodDate={pDate}
            worker={worker}
            shifts={shifts}
            scheduleCellData={scheduleCellData}
            scheduleViewSettings={scheduleViewSettings}
            teamWithMembership={teamWithMembership}
            handleAssignmentSelection={handleAssignmentSelection}
            handleRequestSelection={handleRequestSelection}
            handleOpenCreateAssignment={handleOpenCreateAssignment}
            selectionState={selectionState}
            handleCellSelect={handleCellSelect}
            handleAssignmentSelect={handleAssignmentSelect}
            isCustomSolveModeActive={isCustomSolveModeActive}
            isCustomCellSelected={customSolveSelectedCells.some(
              (c) => c.rowId === worker.id && c.date === pDate.date.format('YYYY-MM-DD'),
            )}
            onCustomCellSelect={() =>
              handleCustomCellSelect?.(worker.id, pDate.date.format('YYYY-MM-DD'), pDate.scheduleId)
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

// ─── ScheduleTableWorker ─────────────────────────────────────────────────────

export default function ScheduleTableWorker({
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
  handleAssignmentSelection,
  handleRequestSelection,
  handleOpenCreateAssignment,
  selectionState,
  selectionScope,
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
  handleAssignmentSelection: (selectedCell: AssignmentDataDictT) => void;
  handleRequestSelection?: (request: RequestT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  selectionState: ScheduleSelectionState;
  selectionScope: SelectionScope;
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
    `scheduleViewSettings_${teamId}_workerTableSort`,
    null,
  );
  const [currentFilter, setCurrentFilter] = useLocalStorageState<ColumnFilter | null>(
    `scheduleViewSettings_${teamId}_workerTableFilter`,
    null,
  );

  const workerColumn: ColumnDefinition = {
    id: 'name',
    label: t('worker'),
    type: 'text',
    getValue: (w: WorkerT) => w.name,
  };

  const allWorkersForHeader = getRelevantWorkers(workers, assignments, scheduleCampaign);
  const workersForHeader = (() => {
    let result = allWorkersForHeader;
    if (
      currentFilter &&
      currentFilter.id === 'name' &&
      typeof currentFilter.value === 'string' &&
      currentFilter.value
    ) {
      const needle = currentFilter.value.toLowerCase();
      result = result.filter((w) => w.name.toLowerCase().includes(needle));
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
    AttributeOwnerType.WORKER,
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
      data-testid="schedule-table-worker"
    >
      {/* Sticky header */}
      <CalendarTableHeader
        lng={lng}
        days={days}
        rowHeaderLabel={t('worker')}
        rowColumn={workerColumn}
        currentSort={currentSort ?? undefined}
        currentFilter={currentFilter ?? undefined}
        onSort={setCurrentSort}
        onFilter={(f) => setCurrentFilter(f)}
        leadingColumnContent={null}
        isBulkMode={!!selectionState?.isActive}
        isColumnSelected={(d) => {
          const date = d.format('YYYY-MM-DD');
          return workersForHeader.every((w) =>
            selectionState?.selectedCells.some((c) => c.rowId === w.id && c.date === date),
          );
        }}
        onColumnSelect={(d) =>
          handleColumnSelect(
            d.format('YYYY-MM-DD'),
            workersForHeader.map((w) => w.id),
            selectionScope ?? 'view',
          )
        }
        isCustomSolveMode={isCustomSolveModeActive}
        isCustomColumnSelected={(d) => {
          const date = d.format('YYYY-MM-DD');
          return (
            workersForHeader.length > 0 &&
            workersForHeader.every((w) =>
              customSolveSelectedCells.some((c) => c.rowId === w.id && c.date === date),
            )
          );
        }}
        isCustomColumnIndeterminate={(d) => {
          const date = d.format('YYYY-MM-DD');
          const allSelected =
            workersForHeader.length > 0 &&
            workersForHeader.every((w) =>
              customSolveSelectedCells.some((c) => c.rowId === w.id && c.date === date),
            );
          const someSelected = workersForHeader.some((w) =>
            customSolveSelectedCells.some((c) => c.rowId === w.id && c.date === date),
          );
          return someSelected && !allSelected;
        }}
        onCustomColumnSelect={(d) =>
          handleCustomColumnSelect?.(
            d.format('YYYY-MM-DD'),
            workersForHeader.map((w) => w.id),
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

      {/* Shift demand row (below header) */}
      {teamWithMembership.membership.role === TeamMembershipRole.OWNER &&
        teamWithMembership.team.useSolver && (
          <DailyShiftDemandRow
            lng={lng}
            shifts={shifts}
            assignments={assignments}
            shiftDemands={shiftDemands}
            periodDates={periodDates}
            scheduleViewSettings={scheduleViewSettings}
          />
        )}

      {/* Worker rows */}
      {workersForHeader.map((worker, workerIndex) => (
        <WorkerRow
          key={workerIndex}
          lng={lng}
          shifts={shifts}
          worker={worker}
          assignments={assignments}
          scheduleCampaign={scheduleCampaign}
          periodDates={periodDates}
          scheduleCellsDict={scheduleCellDict}
          scheduleViewSettings={scheduleViewSettings}
          teamWithMembership={teamWithMembership}
          handleAssignmentSelection={handleAssignmentSelection}
          handleRequestSelection={handleRequestSelection}
          handleOpenCreateAssignment={handleOpenCreateAssignment}
          selectionState={selectionState}
          selectionScope={selectionScope}
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
