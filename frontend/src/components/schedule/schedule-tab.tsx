import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTranslation } from '../../app/i18n/client';
// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MobileScheduleTab from './mobile/mobile-schedule-tab';
// Hooks
import { useIsMobile } from '@/hooks/useIsMobile';
// Components
import ScheduleDisplay from './table/schedule-display';
import ScheduleNavBar from './nav-bar/schedule-nav-bar';
import ScheduleItemDialog from './dialogs/schedule-item-dialog';
import {
  ScheduleItemType,
  DialogMode,
  ScheduleItemDialogData,
  CreateAssignmentData,
} from './dialogs/schedule-item-types';
import NoAssignmentsDisplay from './no-assignments-display';
import { getPeriodStartEndDates } from './schedule-utils';
import { computePeriodEndDate } from '../../app/lib/utils/scheduleViewSettingsUtils';
import { ScheduleActionToolbar } from './toolbar/ScheduleActionToolbar';
// Skeletons
import ScheduleSelectorSkeleton from '../skeletons/schedule-selector-skeleton';
import ScheduleTableSkeleton from '../skeletons/schedule-table-skeleton';
// Actions
import { useGetBreaches } from '../../hooks/useBreach';
import { useGetSpecialties } from '../../hooks/useSpecialty';
// Assignment Hooks
import {
  useAddAssignmentAndRecurrence,
  useUpdateAssignmentAndRecurrence,
  useDeleteAssignment,
  useBulkCreateAssignments,
  useBulkUpdateAssignments,
  useBulkToggleFixed,
  useBulkDeleteAssignments,
} from '../../hooks/useAssignment';
import { useAssignmentsByPeriod, assignmentsQueryKeys } from '../../app/lib/hooks/useAssignments';
import { calculateBufferMonths, shouldFetchMore } from '../../app/lib/utils/assignmentBufferUtils';
// Request Hooks
import {
  useGetRequests,
  useAddRequest,
  useUpdateRequest,
  useDeleteRequest,
  useRescindRequest,
  useAcceptRequest,
  useDenyRequest,
} from '../../hooks/useRequest';
// Hooks
import {
  useValidateSchedule,
  useUpdateSchedule,
  useGetSchedules,
  useGetScheduleEntities,
  useDuplicatePeriod,
} from '../../hooks/useSchedule';
import { useExportSchedule } from '../../hooks/useExport';
import { useUserWorker } from '../../hooks/useUserWorker';
import NoWorkerAssigned from '../common/NoWorkerAssigned';
// Styles
import '../../styles/tab-container-styles.css';
import './schedule-tab.css';
// Types
import { ShiftT } from '../../types/shift';
import { WorkerT } from '../../types/worker';
import {
  ScheduleT,
  ExportOptionsT,
  ScheduleStatus,
  periodDateT,
  DuplicateRequestT,
  AssignmentDataT,
  ScheduleCellDataT,
  DuplicateResultT,
} from '../../types/schedule';
import { BreachT } from '@/types/breach';
import { TeamMembershipRole } from '@/types/team';
import { ShiftDemandCreateDTO, ShiftDemandUpdateDTO } from '@/types/shiftDemand';
import { AssignmentT, AssignmentsRecurrencesResultT, CreateAssignmentT } from '@/types/assignment';
import { RequestT } from '../../types/request';
import { RecurrenceRuleT, RecurrenceUpdateScope } from '@/types/recurrence';
import { SpecialtyT } from '@/types/specialty';
import { TeamWithMembership } from '@/types/team';
import { SolveTaskStatusResponseT } from '@/types/solveTaskStatus';
import { useShiftDemands, useShiftDemandMutations } from '../../app/lib/hooks/useShiftDemands';
import { useScheduleViewSettings } from '../../app/lib/hooks/useScheduleViewSettings';
import { getDefaultScheduleViewSettings } from '../../app/lib/utils/scheduleViewSettingsUtils';
import {
  useGenerationSelection,
  clearGenerationSelection,
} from '../../app/lib/hooks/useGenerationSelection';
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
  SelectionScope,
  CampaignSelectionIntent,
} from '../../types/scheduleSelection';
import { BulkCreateCellPayload } from '@/app/lib/api/assignmentApi';
import { SolveScopeType } from '../../types/solveTaskStatus';

dayjs.extend(utc);
dayjs.extend(isoWeek);

export default function ScheduleTab({
  lng,
  teamWithMembership,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
}) {
  const { t } = useTranslation(lng, 'schedule-page');

  // Query client for manual cache operations (prefetching)
  const queryClient = useQueryClient();

  // Data hooks for owner-only data
  const getBreaches = useGetBreaches();
  const getSpecialties = useGetSpecialties();
  const getRequests = useGetRequests();

  // Schedule hooks
  const validateSchedule = useValidateSchedule();
  const updateSchedule = useUpdateSchedule();
  const getSchedules = useGetSchedules();
  const getScheduleEntities = useGetScheduleEntities();
  const duplicatePeriod = useDuplicatePeriod();
  const exportSchedule = useExportSchedule();

  // Assignment hooks
  const addAssignmentAndRecurrence = useAddAssignmentAndRecurrence();
  const updateAssignmentAndRecurrence = useUpdateAssignmentAndRecurrence();
  const deleteAssignment = useDeleteAssignment();
  const bulkCreateAssignments = useBulkCreateAssignments();
  const bulkUpdateAssignments = useBulkUpdateAssignments();
  const bulkToggleFixed = useBulkToggleFixed();
  const bulkDeleteAssignments = useBulkDeleteAssignments();

  // Request hooks
  const addRequest = useAddRequest();
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const rescindRequest = useRescindRequest();
  const acceptRequest = useAcceptRequest();
  const denyRequest = useDenyRequest();

  // Fetch user's worker for role-based checks (only for members)
  const {
    data: userWorker,
    isLoading: isLoadingUserWorker,
    error: userWorkerError,
  } = useUserWorker(
    teamWithMembership.team.id,
    teamWithMembership.membership.role === TeamMembershipRole.MEMBER,
  );

  // Check if member has no worker association
  const memberHasNoWorker =
    teamWithMembership.membership.role === TeamMembershipRole.MEMBER &&
    !isLoadingUserWorker &&
    userWorker === null;

  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true);

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [schedulesValidated, setSchedulesValidated] = useState<ScheduleT[]>([]);
  const [scheduleCampaign, setScheduleCampaign] = useState<ScheduleT | null>(null);
  const [breaches, setBreaches] = useState<BreachT[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyT[]>([]);

  // Use persistent schedule view settings
  const defaultSettings = getDefaultScheduleViewSettings(teamWithMembership.team.useSolver);

  const [scheduleViewSettings, updateScheduleViewSettings, resetScheduleViewSettings] =
    useScheduleViewSettings(teamWithMembership.team.id, defaultSettings);

  // resetScheduleViewSettings can be called to reset all settings to defaults
  // Example: resetScheduleViewSettings() - useful for settings reset UI

  // Calculate buffer range for smart assignment loading
  const bufferRange = useMemo(() => {
    const periodEnd = computePeriodEndDate(
      scheduleViewSettings.periodStartDate,
      scheduleViewSettings.timeFrame,
    );
    return calculateBufferMonths(scheduleViewSettings.periodStartDate, periodEnd);
  }, [scheduleViewSettings.periodStartDate, scheduleViewSettings.timeFrame]);

  // Determine if user should see campaign assignments (owners/leaders only)
  const includeCampaign = teamWithMembership.membership.role !== TeamMembershipRole.MEMBER;

  // React Query hook for assignments with smart buffering
  const {
    assignments,
    recurrences,
    isLoading: isLoadingAssignments,
    isFetching: isFetchingAssignments,
    error: assignmentsError,
  } = useAssignmentsByPeriod(
    teamWithMembership.team.id,
    bufferRange.start,
    bufferRange.end,
    includeCampaign,
    undefined, // No worker filter for desktop view
    {
      enabled: !memberHasNoWorker, // Don't fetch if member has no worker
    },
  );

  // React Query hooks for shift demands - use dates from settings
  const {
    demands: shiftDemands,
    demandsById: shiftDemandsById,
    matrix: shiftDemandMatrix,
    isLoading: isLoadingShiftDemands,
    error: shiftDemandError,
  } = useShiftDemands(
    teamWithMembership.team.id,
    scheduleViewSettings.periodStartDate,
    computePeriodEndDate(scheduleViewSettings.periodStartDate, scheduleViewSettings.timeFrame),
    {
      enabled:
        teamWithMembership.team.useSolver &&
        teamWithMembership.membership.role !== TeamMembershipRole.MEMBER,
      bufferDays: 7, // Load extra days for better UX
    },
  );

  // Mutation hooks for shift demands
  const shiftDemandMutations = useShiftDemandMutations(teamWithMembership.team.id);

  const getScheduleFromDate = useCallback(
    (date: dayjs.Dayjs) => {
      if (scheduleCampaign) {
        if (
          date.isSameOrBefore(scheduleCampaign.endDate, 'day') &&
          date.isSameOrAfter(scheduleCampaign.startDate, 'day')
        ) {
          return scheduleCampaign;
        }
      }
      const validatedSchedule = schedulesValidated.find(
        (s) => date.isSameOrBefore(s.endDate, 'day') && date.isSameOrAfter(s.startDate, 'day'),
      );
      if (validatedSchedule) {
        return validatedSchedule;
      }
      return null;
    },
    [scheduleCampaign, schedulesValidated],
  );

  const buildDates = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
      const dates: periodDateT[] = [];
      let currentDate = startDate;

      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const schedule = getScheduleFromDate(currentDate);
        dates.push({
          date: currentDate,
          scheduleId: schedule ? schedule.id : null,
          scheduleStatus: schedule ? schedule.status : null,
        });
        currentDate = currentDate.add(1, 'day');
      }
      return dates;
    },
    [getScheduleFromDate],
  );

  // Compute periodDates from the centralized date state
  const periodDates = useMemo(
    () =>
      buildDates(
        scheduleViewSettings.periodStartDate,
        computePeriodEndDate(scheduleViewSettings.periodStartDate, scheduleViewSettings.timeFrame),
      ),
    [scheduleViewSettings.periodStartDate, scheduleViewSettings.timeFrame, buildDates],
  );

  // Unified dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(DialogMode.CREATE);
  const [dialogType, setDialogType] = useState<ScheduleItemType>(ScheduleItemType.ASSIGNMENT);
  const [dialogData, setDialogData] = useState<ScheduleItemDialogData>(null);

  // Selection mode state (OWNER only, desktop only)
  const [selectionState, setSelectionState] = useState<ScheduleSelectionState>({
    isActive: false,
    scope: 'view',
    selectedCells: [],
    selectedAssignmentIds: [],
  });
  const [selectionScope, setSelectionScope] = useState<SelectionScope>('view');

  // Custom solve mode state - persisted alongside selected cells in localStorage
  const [
    workerSolveCells,
    updateWorkerSolveCells,
    shiftSolveCells,
    updateShiftSolveCells,
    selectedSolveScope,
    setSelectedSolveScope,
  ] = useGenerationSelection(scheduleCampaign?.id ?? null);

  const isCustomSolveModeActive = selectedSolveScope === 'CUSTOM';

  const isMobile = useIsMobile();

  const handleAssignmentSelection = (selectedAssignment: AssignmentDataT) => {
    setDialogOpen(true);
    setDialogMode(DialogMode.EDIT);
    setDialogType(ScheduleItemType.ASSIGNMENT);
    setDialogData({ assignmentData: selectedAssignment });
  };

  const handleDemandSelection = (selectedScheduleCellData: ScheduleCellDataT) => {
    setDialogOpen(true);
    setDialogMode(DialogMode.EDIT);
    setDialogType(ScheduleItemType.DEMAND);
    setDialogData({ cellData: selectedScheduleCellData });
  };

  const handleRequestSelection = (request: RequestT) => {
    setDialogOpen(true);
    setDialogMode(DialogMode.EDIT);
    setDialogType(ScheduleItemType.REQUEST);
    setDialogData({ request });
  };

  //////////////////////////
  // Selection Mode Handlers
  //////////////////////////

  const handleSolveOptionChange = useCallback(
    (scope: SolveScopeType) => {
      setSelectedSolveScope(scope);
    },
    [setSelectedSolveScope],
  );

  const handleCustomRowSelect = useCallback(
    (rowId: string) => {
      if (!scheduleCampaign) return;
      const campaignDates = buildDates(scheduleCampaign.startDate, scheduleCampaign.endDate);
      const updateFn =
        scheduleViewSettings.groupBy === 'worker' ? updateWorkerSolveCells : updateShiftSolveCells;
      updateFn((prev) => {
        const isFullySelected = campaignDates.every((pd) =>
          prev.some((c) => c.rowId === rowId && c.date === pd.date.format('YYYY-MM-DD')),
        );
        if (isFullySelected) {
          return prev.filter((c) => c.rowId !== rowId);
        }
        const existingKeys = new Set(prev.map((c) => `${c.rowId}-${c.date}`));
        const toAdd: SelectedScheduleCell[] = campaignDates
          .filter((pd) => !existingKeys.has(`${rowId}-${pd.date.format('YYYY-MM-DD')}`))
          .map((pd) => ({
            rowId,
            date: pd.date.format('YYYY-MM-DD'),
            scheduleId: pd.scheduleId,
          }));
        return [...prev, ...toAdd];
      });
    },
    [
      scheduleCampaign,
      buildDates,
      scheduleViewSettings.groupBy,
      updateWorkerSolveCells,
      updateShiftSolveCells,
    ],
  );

  const handleCustomColumnSelect = useCallback(
    (date: string, rowIds: string[]) => {
      if (!scheduleCampaign) return;
      const scheduleId =
        buildDates(scheduleCampaign.startDate, scheduleCampaign.endDate).find(
          (pd) => pd.date.format('YYYY-MM-DD') === date,
        )?.scheduleId ?? null;
      const updateFn =
        scheduleViewSettings.groupBy === 'worker' ? updateWorkerSolveCells : updateShiftSolveCells;
      updateFn((prev) => {
        const rowIdSet = new Set(rowIds);
        const isFullySelected = rowIds.every((rowId) =>
          prev.some((c) => c.rowId === rowId && c.date === date),
        );
        if (isFullySelected) {
          return prev.filter((c) => !(rowIdSet.has(c.rowId) && c.date === date));
        }
        const existingKeys = new Set(prev.map((c) => `${c.rowId}-${c.date}`));
        const toAdd: SelectedScheduleCell[] = rowIds
          .filter((rowId) => !existingKeys.has(`${rowId}-${date}`))
          .map((rowId) => ({ rowId, date, scheduleId }));
        return [...prev, ...toAdd];
      });
    },
    [
      scheduleCampaign,
      buildDates,
      scheduleViewSettings.groupBy,
      updateWorkerSolveCells,
      updateShiftSolveCells,
    ],
  );

  const handleCustomCellSelect = useCallback(
    (rowId: string, date: string, scheduleId: string | null) => {
      const updateFn =
        scheduleViewSettings.groupBy === 'worker' ? updateWorkerSolveCells : updateShiftSolveCells;
      updateFn((prev) => {
        const exists = prev.some((c) => c.rowId === rowId && c.date === date);
        return exists
          ? prev.filter((c) => !(c.rowId === rowId && c.date === date))
          : [...prev, { rowId, date, scheduleId }];
      });
    },
    [scheduleViewSettings.groupBy, updateWorkerSolveCells, updateShiftSolveCells],
  );

  const handleCustomSelectAll = useCallback(
    (cells: SelectedScheduleCell[]) => {
      if (scheduleViewSettings.groupBy === 'worker') {
        updateWorkerSolveCells(cells);
      } else {
        updateShiftSolveCells(cells);
      }
    },
    [scheduleViewSettings.groupBy, updateWorkerSolveCells, updateShiftSolveCells],
  );

  //////////////////////////
  // Selection Mode Handlers
  //////////////////////////

  // Keep refs to avoid stale closures in the navigation-sync effect below
  // while preventing the effect from re-firing on every intent change
  // (the handlers already handle that case with immediate updates).
  const campaignIntentRef = React.useRef(selectionState.campaignIntent);
  const scheduleCampaignRef = React.useRef(scheduleCampaign);
  const groupByRef = React.useRef(scheduleViewSettings.groupBy);
  const workersRef = React.useRef(workers);
  const shiftsRef = React.useRef(shifts);
  campaignIntentRef.current = selectionState.campaignIntent;
  scheduleCampaignRef.current = scheduleCampaign;
  groupByRef.current = scheduleViewSettings.groupBy;
  workersRef.current = workers;
  shiftsRef.current = shifts;

  // When the user navigates to a different period, re-derive selectedCells and
  // selectedAssignmentIds from the active campaign intent so that newly visible
  // rows and assignments appear highlighted automatically.
  useEffect(() => {
    const intent = campaignIntentRef.current;
    if (!intent) return;

    const campaign = scheduleCampaignRef.current;
    if (!campaign) return;

    const isWorkerView = groupByRef.current === 'worker';
    const allRowIds = isWorkerView
      ? workersRef.current.map((w) => w.id)
      : shiftsRef.current.map((s) => s.id);
    const targetRowIds =
      intent.selectedRowIds.length > 0 ? new Set(intent.selectedRowIds) : new Set(allRowIds);
    const excludedSet = new Set(intent.excludedAssignmentIds);

    // Only consider period dates that fall within the campaign boundaries
    const campaignStart = campaign.startDate.format('YYYY-MM-DD');
    const campaignEnd = campaign.endDate.format('YYYY-MM-DD');
    const visibleCampaignDates = periodDates.filter((pd) => {
      const d = pd.date.format('YYYY-MM-DD');
      return d >= campaignStart && d <= campaignEnd;
    });

    if (visibleCampaignDates.length === 0) {
      // Navigated completely outside the campaign — clear visual cells/assignments
      setSelectionState((prev) => ({
        ...prev,
        selectedCells: [],
        selectedAssignmentIds: [],
      }));
      return;
    }

    const visibleDateSet = new Set(visibleCampaignDates.map((pd) => pd.date.format('YYYY-MM-DD')));

    // Assignments in the visible campaign dates matching the intent
    const matchingIds = assignments
      .filter((a) => {
        if (!visibleDateSet.has(a.date.format('YYYY-MM-DD'))) return false;
        if (excludedSet.has(a.id)) return false;
        return targetRowIds.has(isWorkerView ? a.workerId : a.shiftId);
      })
      .map((a) => a.id);

    // Cells: targeted rows × visible campaign dates only
    const newCells: SelectedScheduleCell[] = [];
    for (const rowId of targetRowIds) {
      for (const pd of visibleCampaignDates) {
        newCells.push({ rowId, date: pd.date.format('YYYY-MM-DD'), scheduleId: pd.scheduleId });
      }
    }

    setSelectionState((prev) => ({
      ...prev,
      selectedCells: newCells,
      selectedAssignmentIds: matchingIds,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDates, assignments]);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionState((prev) => ({
      isActive: !prev.isActive,
      scope: 'view',
      selectedCells: [],
      selectedAssignmentIds: [],
      campaignIntent: undefined,
    }));
    setSelectionScope('view');
  }, []);

  const handleCellSelect = useCallback((rowId: string, date: string, scheduleId: string | null) => {
    setSelectionState((prev) => {
      const key = `${rowId}-${date}`;
      const exists = prev.selectedCells.some((c) => c.rowId === rowId && c.date === date);
      return {
        ...prev,
        selectedCells: exists
          ? prev.selectedCells.filter((c) => !(c.rowId === rowId && c.date === date))
          : [...prev.selectedCells, { rowId, date, scheduleId }],
      };
    });
  }, []);

  const handleAssignmentSelect = useCallback((assignmentId: string) => {
    setSelectionState((prev) => {
      const exists = prev.selectedAssignmentIds.includes(assignmentId);
      return {
        ...prev,
        selectedAssignmentIds: exists
          ? prev.selectedAssignmentIds.filter((id) => id !== assignmentId)
          : [...prev.selectedAssignmentIds, assignmentId],
      };
    });
  }, []);

  const handleRowSelect = useCallback(
    (rowId: string, scope: SelectionScope) => {
      const isWorkerView = scheduleViewSettings.groupBy === 'worker';

      if (scope === 'campaign' && scheduleCampaign) {
        // Campaign scope: produce implicit intent for this row across the full campaign.
        // Also add currently loaded assignments for immediate visual feedback.
        const campaignDates = buildDates(scheduleCampaign.startDate, scheduleCampaign.endDate);
        const campaignDateSet = new Set(campaignDates.map((pd) => pd.date.format('YYYY-MM-DD')));
        const loadedRowAssignmentIds = assignments
          .filter((a) => {
            const rowMatch = isWorkerView ? a.workerId === rowId : a.shiftId === rowId;
            return rowMatch && campaignDateSet.has(a.date.format('YYYY-MM-DD'));
          })
          .map((a) => a.id);

        setSelectionState((prev) => {
          const intent = prev.campaignIntent ?? {
            campaignId: scheduleCampaign.id,
            selectedRowIds: [],
            excludedAssignmentIds: [],
          };
          const isRowSelected = intent.selectedRowIds.includes(rowId);
          const isAllSelected = intent.selectedRowIds.length === 0 && !!prev.campaignIntent;

          if (isRowSelected || isAllSelected) {
            // Deselect: remove row from intent, remove its loaded assignments and cells
            const loadedSet = new Set(loadedRowAssignmentIds);
            const newSelectedRowIds = isAllSelected
              ? [] // clearing "all" by toggling a single row: fallback to removing just this one
              : intent.selectedRowIds.filter((id) => id !== rowId);
            const newIntent: CampaignSelectionIntent | undefined =
              newSelectedRowIds.length > 0 || isAllSelected
                ? { ...intent, selectedRowIds: newSelectedRowIds }
                : undefined;
            return {
              ...prev,
              selectedCells: prev.selectedCells.filter((c) => c.rowId !== rowId),
              selectedAssignmentIds: prev.selectedAssignmentIds.filter((id) => !loadedSet.has(id)),
              campaignIntent: newIntent,
            };
          }

          // Select: add row to intent, add visible assignments + cells for current period
          const newIntent: CampaignSelectionIntent = {
            ...intent,
            campaignId: scheduleCampaign.id,
            selectedRowIds: [...intent.selectedRowIds, rowId],
          };
          const newAssignmentIds = loadedRowAssignmentIds.filter(
            (id) => !prev.selectedAssignmentIds.includes(id),
          );
          // Only add cells for dates that fall within the campaign boundaries
          const campaignStart = scheduleCampaign.startDate.format('YYYY-MM-DD');
          const campaignEnd = scheduleCampaign.endDate.format('YYYY-MM-DD');
          const newCells = periodDates
            .filter((pd) => {
              const d = pd.date.format('YYYY-MM-DD');
              return (
                d >= campaignStart &&
                d <= campaignEnd &&
                !prev.selectedCells.some((c) => c.rowId === rowId && c.date === d)
              );
            })
            .map((pd) => ({
              rowId,
              date: pd.date.format('YYYY-MM-DD'),
              scheduleId: pd.scheduleId,
            }));
          return {
            ...prev,
            selectedCells: [...prev.selectedCells, ...newCells],
            selectedAssignmentIds: [...prev.selectedAssignmentIds, ...newAssignmentIds],
            campaignIntent: newIntent,
          };
        });
        return;
      }

      // View scope: explicit IDs only (existing behaviour)
      const dates = periodDates;
      const datestrs = dates.map((pd) => pd.date.format('YYYY-MM-DD'));
      const dateSet = new Set(datestrs);

      const rowAssignmentIds = assignments
        .filter((a) => {
          const rowMatch = isWorkerView ? a.workerId === rowId : a.shiftId === rowId;
          return rowMatch && dateSet.has(a.date.format('YYYY-MM-DD'));
        })
        .map((a) => a.id);

      const allRowAssignmentIdSet = new Set(
        assignments
          .filter((a) => (isWorkerView ? a.workerId === rowId : a.shiftId === rowId))
          .map((a) => a.id),
      );

      setSelectionState((prev) => {
        const isFullySelected = datestrs.every((ds) =>
          prev.selectedCells.some((c) => c.rowId === rowId && c.date === ds),
        );
        if (isFullySelected) {
          return {
            ...prev,
            selectedCells: prev.selectedCells.filter((c) => c.rowId !== rowId),
            selectedAssignmentIds: prev.selectedAssignmentIds.filter(
              (id) => !allRowAssignmentIdSet.has(id),
            ),
          };
        }
        const existingKeys = new Set(prev.selectedCells.map((c) => `${c.rowId}-${c.date}`));
        const toAdd = dates
          .filter((pd) => !existingKeys.has(`${rowId}-${pd.date.format('YYYY-MM-DD')}`))
          .map((pd) => ({
            rowId,
            date: pd.date.format('YYYY-MM-DD'),
            scheduleId: pd.scheduleId,
          }));
        const newAssignmentIds = rowAssignmentIds.filter(
          (id) => !prev.selectedAssignmentIds.includes(id),
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...toAdd],
          selectedAssignmentIds: [...prev.selectedAssignmentIds, ...newAssignmentIds],
        };
      });
    },
    [scheduleCampaign, periodDates, buildDates, assignments, scheduleViewSettings.groupBy],
  );

  const handleColumnSelect = useCallback(
    (date: string, rowIds: string[], scope: SelectionScope) => {
      const allDates =
        scope === 'campaign' && scheduleCampaign
          ? buildDates(scheduleCampaign.startDate, scheduleCampaign.endDate)
          : periodDates;
      const targetDates = [
        {
          date,
          scheduleId:
            allDates.find((pd) => pd.date.format('YYYY-MM-DD') === date)?.scheduleId ?? null,
        },
      ];

      const isWorkerView = scheduleViewSettings.groupBy === 'worker';
      const targetDateSet = new Set(targetDates.map((td) => td.date));
      const rowIdSet = new Set(rowIds);
      const colAssignmentIds = assignments
        .filter((a) => {
          const rowMatch = isWorkerView ? rowIdSet.has(a.workerId) : rowIdSet.has(a.shiftId);
          return rowMatch && targetDateSet.has(a.date.format('YYYY-MM-DD'));
        })
        .map((a) => a.id);

      setSelectionState((prev) => {
        const isFullySelected = rowIds.every((rowId) =>
          targetDates.every(({ date: d }) =>
            prev.selectedCells.some((c) => c.rowId === rowId && c.date === d),
          ),
        );
        if (isFullySelected) {
          const colAssignmentIdSet = new Set(colAssignmentIds);
          return {
            ...prev,
            selectedCells: prev.selectedCells.filter(
              (c) => !(rowIdSet.has(c.rowId) && targetDateSet.has(c.date)),
            ),
            selectedAssignmentIds: prev.selectedAssignmentIds.filter(
              (id) => !colAssignmentIdSet.has(id),
            ),
          };
        }
        const existingKeys = new Set(prev.selectedCells.map((c) => `${c.rowId}-${c.date}`));
        const newCells: SelectedScheduleCell[] = [];
        for (const rowId of rowIds) {
          for (const { date: d, scheduleId } of targetDates) {
            const key = `${rowId}-${d}`;
            if (!existingKeys.has(key)) {
              newCells.push({ rowId, date: d, scheduleId });
            }
          }
        }
        const newAssignmentIds = colAssignmentIds.filter(
          (id) => !prev.selectedAssignmentIds.includes(id),
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...newCells],
          selectedAssignmentIds: [...prev.selectedAssignmentIds, ...newAssignmentIds],
        };
      });
    },
    [scheduleCampaign, periodDates, buildDates, assignments, scheduleViewSettings.groupBy],
  );

  const handleSelectAll = useCallback(
    (rowIds: string[], scope: SelectionScope) => {
      if (scope === 'campaign' && scheduleCampaign) {
        // rowIds = [] means deselect all (called when isAllSelected is true)
        if (rowIds.length === 0) {
          setSelectionState((prev) => ({
            ...prev,
            selectedCells: [],
            selectedAssignmentIds: [],
            campaignIntent: undefined,
          }));
          return;
        }

        // Campaign scope: set implicit intent covering all rows.
        // Populate explicit IDs with loaded campaign assignments; cells for current period only.
        const isWorkerView = scheduleViewSettings.groupBy === 'worker';
        const rowIdSet = new Set(rowIds);
        const campaignDateSet = new Set(
          buildDates(scheduleCampaign.startDate, scheduleCampaign.endDate).map((pd) =>
            pd.date.format('YYYY-MM-DD'),
          ),
        );
        const loadedAssignmentIds = assignments
          .filter((a) => {
            const rowMatch = isWorkerView ? rowIdSet.has(a.workerId) : rowIdSet.has(a.shiftId);
            return rowMatch && campaignDateSet.has(a.date.format('YYYY-MM-DD'));
          })
          .map((a) => a.id);

        // Cells for visible rows × current period (within campaign boundaries)
        const newCells: SelectedScheduleCell[] = [];
        for (const rowId of rowIds) {
          for (const pd of periodDates) {
            if (campaignDateSet.has(pd.date.format('YYYY-MM-DD'))) {
              newCells.push({
                rowId,
                date: pd.date.format('YYYY-MM-DD'),
                scheduleId: pd.scheduleId,
              });
            }
          }
        }

        setSelectionState((prev) => ({
          ...prev,
          selectedCells: newCells,
          selectedAssignmentIds: loadedAssignmentIds,
          campaignIntent: {
            campaignId: scheduleCampaign.id,
            selectedRowIds: [], // empty = all rows
            excludedAssignmentIds: [],
          },
        }));
        return;
      }

      // View scope: explicit IDs only (existing behaviour)
      const dates = periodDates;
      const newCells: SelectedScheduleCell[] = [];
      for (const rowId of rowIds) {
        for (const pd of dates) {
          newCells.push({
            rowId,
            date: pd.date.format('YYYY-MM-DD'),
            scheduleId: pd.scheduleId,
          });
        }
      }

      const isWorkerView = scheduleViewSettings.groupBy === 'worker';
      const rowIdSet = new Set(rowIds);
      const dateSet = new Set(newCells.map((c) => c.date));
      const newAssignmentIds = assignments
        .filter((a) => {
          const rowMatch = isWorkerView ? rowIdSet.has(a.workerId) : rowIdSet.has(a.shiftId);
          return rowMatch && dateSet.has(a.date.format('YYYY-MM-DD'));
        })
        .map((a) => a.id);

      setSelectionState((prev) => ({
        ...prev,
        selectedCells: newCells,
        selectedAssignmentIds: newAssignmentIds,
      }));
    },
    [scheduleCampaign, periodDates, buildDates, assignments, scheduleViewSettings.groupBy],
  );

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    try {
      const newSchedule = await updateSchedule(schedule);
      setScheduleCampaign(newSchedule);
    } catch (error) {
      console.error('Failed to update schedule:', error);
      // Handle error appropriately
    }
  };

  const handleValidateSchedule = async (scheduleId: string) => {
    try {
      const newSchedule = await validateSchedule(scheduleId, teamWithMembership.team.id);
      clearGenerationSelection(scheduleId);
      setScheduleCampaign(null);
      setSchedulesValidated([...schedulesValidated, newSchedule]);
      setBreaches([]);
    } catch (error) {
      console.error('Failed to validate schedule:', error);
      // Handle error appropriately
    }
  };

  const handleDuplicateResult = (duplicateResult: DuplicateResultT) => {
    if (duplicateResult.assignments) {
      updateAssignmentsAndRecurrencesStates(duplicateResult.assignments);
    }
    // Note: Shift demands will be automatically updated via React Query
    // when the duplicate operation affects shift demands
  };

  const handleSendDuplicateRequest = async (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string,
  ) => {
    try {
      const duplicateResult = await duplicatePeriod(request, campaignId, teamId);
      handleDuplicateResult(duplicateResult);
      const newPeriodStart = request.targetPeriod.startDate.startOf('isoWeek');
      const newPeriodEnd = request.targetPeriod.startDate.endOf('isoWeek');
      updateSelectedPeriod(newPeriodStart, newPeriodEnd);
    } catch (error) {
      console.error('Failed to duplicate period:', error);
      // Handle error appropriately
    }
  };

  //////////////////////////
  // Shift Demand Actions (New Implementation)
  //////////////////////////

  const handleCreateShiftDemand = useCallback(
    async (shiftId: string, date: dayjs.Dayjs, count: number, notes?: string) => {
      try {
        const demandData: Omit<ShiftDemandCreateDTO, 'teamId'> = {
          shiftId,
          date: date.unix(),
          count,
          notes: notes || null,
          source: 'manual',
          sourceId: null,
        };

        await shiftDemandMutations.create.mutateAsync({ demand: demandData });

        // Note: React Query will handle state updates automatically
        // No need to manually update local state
      } catch (error) {
        console.error('Failed to create shift demand:', error);
        // Error handling will be managed by React Query
      }
    },
    [shiftDemandMutations],
  );

  const handleUpdateShiftDemand = useCallback(
    async (demandId: string, updates: Partial<ShiftDemandUpdateDTO>) => {
      try {
        // Get the updated shift demand from the mutation response
        const updatedShiftDemand = await shiftDemandMutations.update.mutateAsync({
          demandId,
          demand: updates,
        });
      } catch (error) {
        console.error('Failed to update shift demand:', error);
      }
    },
    [shiftDemandMutations],
  );

  const handleDeleteShiftDemand = useCallback(
    async (demandId: string) => {
      try {
        await shiftDemandMutations.delete.mutateAsync(demandId);
      } catch (error) {
        console.error('Failed to delete shift demand:', error);
      }
    },
    [shiftDemandMutations],
  );

  //////////////////////////
  // Request Actions
  //////////////////////////

  const handleAddRequest = useCallback(
    async (request: RequestT) => {
      try {
        const newRequest = await addRequest(request, teamWithMembership.team.id);
        setRequests([...requests, newRequest]);
      } catch (error) {
        console.error('Failed to add request:', error);
      }
    },
    [addRequest, teamWithMembership.team.id, requests],
  );

  const handleUpdateRequest = useCallback(
    async (request: RequestT) => {
      try {
        const updatedRequest = await updateRequest(request, teamWithMembership.team.id);
        setRequests(requests.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      } catch (error) {
        console.error('Failed to update request:', error);
      }
    },
    [updateRequest, teamWithMembership.team.id, requests],
  );

  const handleDeleteRequest = useCallback(
    async (requestId: string) => {
      try {
        await deleteRequest(requestId, teamWithMembership.team.id);
        setRequests(requests.filter((r) => r.id !== requestId));
      } catch (error) {
        console.error('Failed to delete request:', error);
      }
    },
    [deleteRequest, teamWithMembership.team.id, requests],
  );

  const handleRescindRequest = useCallback(
    async (requestId: string) => {
      try {
        const result = await rescindRequest(requestId, teamWithMembership.team.id);
        const rescindedRequest = result.request;
        const assignmentsDeletedIds = result.assignmentsDeletedIds || [];

        setRequests((prev) =>
          prev.map((r) => (r.id === rescindedRequest.id ? rescindedRequest : r)),
        );

        // React Query cache invalidation in the mutation hook handles assignment updates
      } catch (error) {
        console.error('Failed to rescind request:', error);
      }
    },
    [rescindRequest, teamWithMembership.team.id],
  );

  const handleAcceptRequest = useCallback(
    async (requestId: string) => {
      try {
        const result = await acceptRequest(requestId, teamWithMembership.team.id);
        const acceptedRequest = result.request;
        const newAssignments = result.assignments || [];

        // Update requests list
        setRequests((prev) => prev.map((r) => (r.id === acceptedRequest.id ? acceptedRequest : r)));

        // React Query cache invalidation in the mutation hook handles assignment updates
      } catch (error) {
        console.error('Failed to accept request:', error);
      }
    },
    [acceptRequest, teamWithMembership.team.id],
  );

  const handleDenyRequest = useCallback(
    async (requestId: string) => {
      try {
        const deniedRequest = await denyRequest(requestId, teamWithMembership.team.id);
        setRequests(requests.map((r) => (r.id === deniedRequest.id ? deniedRequest : r)));
      } catch (error) {
        console.error('Failed to deny request:', error);
      }
    },
    [denyRequest, teamWithMembership.team.id, requests],
  );

  //////////////////////////
  // Assignment Actions
  //////////////////////////

  const updateAssignmentsAndRecurrencesStates = useCallback(
    (ARResult: AssignmentsRecurrencesResultT) => {
      // React Query cache invalidation in the mutation hooks handles updates automatically
      // This function is kept for backward compatibility but no longer updates local state
    },
    [],
  );

  const handleOpenCreateAssignment = useCallback(
    (createAssignmentData: CreateAssignmentT) => {
      setDialogOpen(true);
      setDialogMode(DialogMode.CREATE);
      setDialogType(ScheduleItemType.ASSIGNMENT);
      setDialogData({
        scheduleId: createAssignmentData.scheduleId,
        workerId: createAssignmentData.workerId,
        shiftId: createAssignmentData.shiftId,
        date: createAssignmentData.date,
        addDemandActive:
          !createAssignmentData.haveDemand && scheduleViewSettings.groupBy === 'shift',
      } as CreateAssignmentData);
    },
    [scheduleViewSettings.groupBy],
  );

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogData(null);
  }, []);

  const handleCreateAssignment = useCallback(
    async (assignment: AssignmentT, recurrence: RecurrenceRuleT | null = null) => {
      await addAssignmentAndRecurrence(assignment, recurrence);
      // React Query cache invalidation in the mutation hook handles updates automatically
    },
    [addAssignmentAndRecurrence],
  );

  const handleUpdateAssignment = useCallback(
    async (
      assignment: AssignmentT,
      recurrence: RecurrenceRuleT | null = null,
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
    ) => {
      const ARResult = await updateAssignmentAndRecurrence(
        assignment,
        teamWithMembership.team.id,
        recurrence,
        recurrenceUpdateScope,
      );

      updateAssignmentsAndRecurrencesStates(ARResult);
    },
    [
      updateAssignmentAndRecurrence,
      teamWithMembership.team.id,
      updateAssignmentsAndRecurrencesStates,
    ],
  );

  const handleDeleteAssignment = useCallback(
    async (
      assignmentId: string,
      recurrenceId: string | null = null,
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
    ) => {
      const ARResult = await deleteAssignment(
        assignmentId,
        teamWithMembership.team.id,
        recurrenceId,
        recurrenceUpdateScope,
      );
      updateAssignmentsAndRecurrencesStates(ARResult);
    },
    [deleteAssignment, teamWithMembership.team.id, updateAssignmentsAndRecurrencesStates],
  );

  //////////////////////////
  // Bulk Assignment Actions
  //////////////////////////

  const handleBulkCreateAssignments = useCallback(
    async (id: string) => {
      // id is workerId (shift view) or shiftId (worker view)
      const isShiftView = scheduleViewSettings.groupBy === 'shift';

      // Build intent payload if campaign intent is active — backend handles expansion
      const intent = selectionState.campaignIntent
        ? {
            campaignId: selectionState.campaignIntent.campaignId,
            selectedRowWorkerIds: isShiftView ? [] : selectionState.campaignIntent.selectedRowIds,
            selectedRowShiftIds: isShiftView ? selectionState.campaignIntent.selectedRowIds : [],
            excludedAssignmentIds: selectionState.campaignIntent.excludedAssignmentIds,
          }
        : undefined;

      const cells: BulkCreateCellPayload[] = selectionState.selectedCells.map((cell) => ({
        rowId: cell.rowId,
        date: dayjs.utc(cell.date),
      }));
      if (cells.length === 0 && !intent) return;
      await bulkCreateAssignments(
        cells,
        id,
        scheduleViewSettings.groupBy,
        teamWithMembership.team.id,
        intent,
      );
      setSelectionState((prev) => ({ ...prev, selectedCells: [], campaignIntent: undefined }));
    },
    [
      selectionState.selectedCells,
      selectionState.campaignIntent,
      scheduleViewSettings.groupBy,
      teamWithMembership.team.id,
      bulkCreateAssignments,
    ],
  );

  const handleBulkUpdateAssignments = useCallback(
    async (id: string) => {
      // id is workerId (shift view) or shiftId (worker view)
      const isShiftView = scheduleViewSettings.groupBy === 'shift';

      // Build intent payload if campaign intent is present
      const intent = selectionState.campaignIntent
        ? {
            campaignId: selectionState.campaignIntent.campaignId,
            selectedRowWorkerIds: isShiftView ? [] : selectionState.campaignIntent.selectedRowIds,
            selectedRowShiftIds: isShiftView ? selectionState.campaignIntent.selectedRowIds : [],
            excludedAssignmentIds: selectionState.campaignIntent.excludedAssignmentIds,
          }
        : undefined;

      if (selectionState.selectedAssignmentIds.length === 0 && !intent) return;
      await bulkUpdateAssignments(
        selectionState.selectedAssignmentIds,
        id,
        scheduleViewSettings.groupBy,
        teamWithMembership.team.id,
        intent,
      );
      setSelectionState((prev) => ({
        ...prev,
        selectedAssignmentIds: [],
        campaignIntent: undefined,
      }));
    },
    [
      selectionState.selectedAssignmentIds,
      selectionState.campaignIntent,
      scheduleViewSettings.groupBy,
      teamWithMembership.team.id,
      bulkUpdateAssignments,
    ],
  );

  const handleBulkDeleteAssignments = useCallback(async () => {
    const intent = selectionState.campaignIntent
      ? {
          campaignId: selectionState.campaignIntent.campaignId,
          selectedRowWorkerIds:
            scheduleViewSettings.groupBy === 'worker'
              ? selectionState.campaignIntent.selectedRowIds
              : [],
          selectedRowShiftIds:
            scheduleViewSettings.groupBy === 'shift'
              ? selectionState.campaignIntent.selectedRowIds
              : [],
          excludedAssignmentIds: selectionState.campaignIntent.excludedAssignmentIds,
        }
      : undefined;

    if (selectionState.selectedAssignmentIds.length === 0 && !intent) return;
    await bulkDeleteAssignments(
      selectionState.selectedAssignmentIds,
      teamWithMembership.team.id,
      intent,
    );
    setSelectionState((prev) => ({
      ...prev,
      selectedAssignmentIds: [],
      campaignIntent: undefined,
    }));
  }, [
    selectionState.selectedAssignmentIds,
    selectionState.campaignIntent,
    scheduleViewSettings.groupBy,
    teamWithMembership.team.id,
    bulkDeleteAssignments,
  ]);

  const handleScopeChange = useCallback((newScope: SelectionScope) => {
    // Reset intent and selection when switching scopes
    setSelectionState((prev) => ({
      ...prev,
      scope: newScope,
      selectedCells: [],
      selectedAssignmentIds: [],
      campaignIntent: undefined,
    }));
    setSelectionScope(newScope);
  }, []);

  const handleBulkToggleFixed = useCallback(async () => {
    const isShiftView = scheduleViewSettings.groupBy === 'shift';

    const intent = selectionState.campaignIntent
      ? {
          campaignId: selectionState.campaignIntent.campaignId,
          selectedRowWorkerIds: isShiftView ? [] : selectionState.campaignIntent.selectedRowIds,
          selectedRowShiftIds: isShiftView ? selectionState.campaignIntent.selectedRowIds : [],
          excludedAssignmentIds: selectionState.campaignIntent.excludedAssignmentIds,
        }
      : undefined;

    if (selectionState.selectedAssignmentIds.length === 0 && !intent) return;

    await bulkToggleFixed(selectionState.selectedAssignmentIds, teamWithMembership.team.id, intent);

    setSelectionState((prev) => ({
      ...prev,
      selectedAssignmentIds: [],
      campaignIntent: undefined,
    }));
  }, [
    selectionState.selectedAssignmentIds,
    selectionState.campaignIntent,
    scheduleViewSettings.groupBy,
    teamWithMembership.team.id,
    bulkToggleFixed,
  ]);

  const updateSelectedPeriod = (newPeriodStart: dayjs.Dayjs, newPeriodEnd: dayjs.Dayjs) => {
    updateScheduleViewSettings({
      periodStartDate: newPeriodStart,
    });
    // No need to setPeriodDates since it's now computed
  };

  const handleToday = async () => {
    const newPeriodStart =
      scheduleViewSettings.timeFrame === 'week'
        ? dayjs.utc().startOf('isoWeek')
        : scheduleViewSettings.timeFrame === 'month'
          ? dayjs.utc().startOf('month')
          : dayjs.utc(); // Default to current time if neither "week" nor "month"
    const newPeriodEnd =
      scheduleViewSettings.timeFrame === 'week'
        ? dayjs.utc().endOf('isoWeek')
        : scheduleViewSettings.timeFrame === 'month'
          ? dayjs.utc().endOf('month')
          : dayjs.utc(); // Default to current time if neither "week" nor "month"
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  const handlePreviousPeriod = async () => {
    const isMonth = scheduleViewSettings.timeFrame === 'month';
    const newPeriodStart = scheduleViewSettings.periodStartDate.subtract(
      1,
      isMonth ? 'month' : 'week',
    );
    const newPeriodEnd = computePeriodEndDate(newPeriodStart, scheduleViewSettings.timeFrame);
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);

    // Prefetch data for extended buffer if approaching edge
    const newBufferRange = calculateBufferMonths(newPeriodStart, newPeriodEnd);
    if (shouldFetchMore(bufferRange, newPeriodStart, newPeriodEnd)) {
      // Prefetch extended buffer in background
      queryClient.prefetchQuery({
        queryKey: assignmentsQueryKeys.byPeriod(
          teamWithMembership.team.id,
          newBufferRange.start,
          newBufferRange.end,
          includeCampaign,
          undefined,
        ),
      });
    }
  };

  const handleNextPeriod = async () => {
    const isMonth = scheduleViewSettings.timeFrame === 'month';
    const newPeriodStart = scheduleViewSettings.periodStartDate.add(1, isMonth ? 'month' : 'week');
    const newPeriodEnd = computePeriodEndDate(newPeriodStart, scheduleViewSettings.timeFrame);
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);

    // Prefetch data for extended buffer if approaching edge
    const newBufferRange = calculateBufferMonths(newPeriodStart, newPeriodEnd);
    if (shouldFetchMore(bufferRange, newPeriodStart, newPeriodEnd)) {
      // Prefetch extended buffer in background
      queryClient.prefetchQuery({
        queryKey: assignmentsQueryKeys.byPeriod(
          teamWithMembership.team.id,
          newBufferRange.start,
          newBufferRange.end,
          includeCampaign,
          undefined,
        ),
      });
    }
  };

  const handleChangeTimeFrame = async (newTimeFrame: 'week' | 'month') => {
    console.log('Changing time frame to:', newTimeFrame);

    // When switching time frames, we need an appropriate endDate range to
    // determine overlap with the current week/month. If switching TO week
    // from a month view, use the current month's end so the week-selection
    // logic can decide to show the current week when the month contains today.
    const endDateForComputation =
      newTimeFrame === 'week'
        ? computePeriodEndDate(scheduleViewSettings.periodStartDate, scheduleViewSettings.timeFrame)
        : computePeriodEndDate(scheduleViewSettings.periodStartDate, newTimeFrame);

    // Step 1: Get the new period dates using the NEW timeFrame
    const { firstDate: newPeriodStart, lastDate: newPeriodEnd } = getPeriodStartEndDates(
      newTimeFrame,
      scheduleViewSettings.periodStartDate,
      endDateForComputation,
    );

    // Step 2: Update schedule view settings with both new timeFrame and new start date
    updateScheduleViewSettings({
      timeFrame: newTimeFrame,
      periodStartDate: newPeriodStart,
    });
  };

  //////////////////////////
  // Export Actions
  //////////////////////////

  const handleExportSchedule = async (exportOptions: ExportOptionsT) => {
    try {
      await exportSchedule(teamWithMembership.team.id, exportOptions);
    } catch (error) {
      console.error('Failed to export schedule:', error);
      // Handle error appropriately
    }
  };

  //////////////////////////
  // SQS Solve Actions
  //////////////////////////

  const handleSqsSolveComplete = useCallback(
    (result: SolveTaskStatusResponseT) => {
      console.log('SQS Solve completed, updating schedule data...');

      if (result.result) {
        const {
          assignments: newAssignments,
          breaches: newBreaches,
          requests: newRequests,
        } = result.result;

        // Update schedule campaign (use existing scheduleCampaign as the schedule itself doesn't change structure)
        // The solve status will be reflected in the campaign state
        if (scheduleCampaign) {
          const updatedSchedule = {
            ...scheduleCampaign,
            // Update any schedule-level properties if needed
          };
          setScheduleCampaign(updatedSchedule);
        }

        // Update assignments for the scheduleCampaign period
        // React Query cache invalidation handles assignment updates automatically
        // Manually invalidate to refresh the assignments view
        if (newAssignments && scheduleCampaign) {
          queryClient.invalidateQueries({
            queryKey: assignmentsQueryKeys.teams(teamWithMembership.team.id),
          });
        }

        // Update breaches
        if (newBreaches) {
          setBreaches(newBreaches);
        }

        // Update requests
        if (newRequests) {
          setRequests((prev) =>
            prev.map((r) => newRequests.find((nr: RequestT) => nr.id === r.id) || r),
          );
        }
      }
    },
    [scheduleCampaign, teamWithMembership.team.id, queryClient],
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingSchedule(true);

      try {
        // Fetch entities (shifts and workers) - assignments now loaded via React Query
        const { workers: fetchedWorkers, shifts: fetchedShifts } = await getScheduleEntities(
          teamWithMembership.team.id,
        );
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);

        // Fetch requests (needed for both members and owners)
        const fetchedRequests = await getRequests(teamWithMembership.team.id);
        setRequests(fetchedRequests);

        // Fetch owner-only data (schedules, breaches, specialties) — not available to members
        if (teamWithMembership.membership.role !== TeamMembershipRole.MEMBER) {
          const [schedulesResult, breachesResult, specialtiesResult] = await Promise.allSettled([
            getSchedules(teamWithMembership.team.id),
            getBreaches(teamWithMembership.team.id),
            getSpecialties(teamWithMembership.team.id),
          ]);

          if (schedulesResult.status === 'fulfilled') {
            const fetchedSchedule = schedulesResult.value;
            setScheduleCampaign(
              fetchedSchedule.find((s: ScheduleT) => s.status === ScheduleStatus.CAMPAIGN) || null,
            );
            setSchedulesValidated(
              fetchedSchedule.filter((s: ScheduleT) => s.status === ScheduleStatus.VALIDATED),
            );
          } else {
            console.error('Failed to fetch schedules:', schedulesResult.reason);
          }

          if (breachesResult.status === 'fulfilled') {
            setBreaches(breachesResult.value);
          } else {
            console.error('Failed to fetch breaches:', breachesResult.reason);
          }

          if (specialtiesResult.status === 'fulfilled') {
            setSpecialties(specialtiesResult.value);
          } else {
            console.error('Failed to fetch specialties:', specialtiesResult.reason);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchData();
  }, [
    teamWithMembership,
    getSchedules,
    getScheduleEntities,
    getRequests,
    getBreaches,
    getSpecialties,
  ]);

  if (isMobile) {
    return <MobileScheduleTab lng={lng} teamWithMembership={teamWithMembership} />;
  }

  if (memberHasNoWorker) {
    return (
      <div className="tab-container-ultrawide" data-testid="schedule-page-heading">
        <NoWorkerAssigned message={t('error_no_worker_assigned')} />
      </div>
    );
  }

  return (
    <div className="tab-container-ultrawide" data-testid="schedule-page-heading">
      <div>
        {isLoadingSchedule ? (
          <div className="container-schedule-selector-skeleton">
            <ScheduleSelectorSkeleton />
          </div>
        ) : (
          <>
            <ScheduleNavBar
              lng={lng}
              teamWithMembership={teamWithMembership}
              currentPeriodStart={scheduleViewSettings.periodStartDate}
              currentPeriodEnd={computePeriodEndDate(
                scheduleViewSettings.periodStartDate,
                scheduleViewSettings.timeFrame,
              )}
              scheduleCampaign={scheduleCampaign}
              breaches={breaches}
              scheduleViewSettings={scheduleViewSettings}
              handleToday={handleToday}
              handlePreviousPeriod={handlePreviousPeriod}
              handleNextPeriod={handleNextPeriod}
              handleValidateSchedule={handleValidateSchedule}
              handleSendDuplicateRequest={handleSendDuplicateRequest}
              updateScheduleViewSettings={(newSettings) => {
                if (
                  newSettings.groupBy !== undefined &&
                  newSettings.groupBy !== scheduleViewSettings.groupBy
                ) {
                  setSelectionState((prev) => ({
                    ...prev,
                    selectedCells: [],
                  }));
                }
                updateScheduleViewSettings(newSettings);
              }}
              handleChangeTimeFrame={handleChangeTimeFrame}
              useSqsWorkflow={true}
              onSqsSolveComplete={handleSqsSolveComplete}
              onToggleSelectionMode={handleToggleSelectionMode}
              workers={workers.filter((w) => !w.deleted)}
              shifts={shifts.filter((s) => !s.deleted)}
              selectionState={selectionState}
              selectedSolveScope={selectedSolveScope}
              onSolveOptionChange={handleSolveOptionChange}
              workerSolveCells={workerSolveCells}
              shiftSolveCells={shiftSolveCells}
            />
            {selectionState.isActive &&
              teamWithMembership.membership.role === TeamMembershipRole.OWNER &&
              !isMobile && (
                <ScheduleActionToolbar
                  lng={lng}
                  selectionState={selectionState}
                  workers={workers.filter((w) => !w.deleted)}
                  shifts={shifts.filter((s) => !s.deleted)}
                  scheduleCampaign={scheduleCampaign}
                  groupBy={scheduleViewSettings.groupBy}
                  scope={selectionScope}
                  onScopeChange={handleScopeChange}
                  onBulkCreate={handleBulkCreateAssignments}
                  onBulkUpdate={handleBulkUpdateAssignments}
                  onBulkToggleFixed={handleBulkToggleFixed}
                  onBulkDelete={handleBulkDeleteAssignments}
                  onCancel={handleToggleSelectionMode}
                />
              )}
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {isLoadingAssignments || (teamWithMembership.team.useSolver && isLoadingShiftDemands) ? (
            <ScheduleTableSkeleton />
          ) : assignments.length === 0 && requests.length === 0 && shiftDemands.length === 0 ? (
            <NoAssignmentsDisplay
              lng={lng}
              teamWithMembership={teamWithMembership}
              scheduleId={null}
              workers={workers}
              shifts={shifts}
              handleCreateAssignment={handleCreateAssignment}
              handleCreateShiftDemand={handleCreateShiftDemand}
            />
          ) : (
            <ScheduleDisplay
              lng={lng}
              teamWithMembership={teamWithMembership}
              scheduleCampaign={scheduleCampaign as ScheduleT}
              periodDates={periodDates}
              assignments={assignments}
              shiftDemands={shiftDemands}
              recurrences={recurrences}
              breaches={breaches}
              workers={workers}
              shifts={shifts}
              requests={requests}
              scheduleViewSettings={scheduleViewSettings}
              selectionState={selectionState}
              selectionScope={selectionScope}
              handleAssignmentSelection={handleAssignmentSelection}
              handleDemandSelection={handleDemandSelection}
              handleRequestSelection={handleRequestSelection}
              handleExportSchedule={handleExportSchedule}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
              handleCellSelect={handleCellSelect}
              handleAssignmentSelect={handleAssignmentSelect}
              handleRowSelect={handleRowSelect}
              handleColumnSelect={handleColumnSelect}
              handleSelectAll={handleSelectAll}
              isCustomSolveModeActive={isCustomSolveModeActive}
              customSolveSelectedCells={
                scheduleViewSettings.groupBy === 'worker' ? workerSolveCells : shiftSolveCells
              }
              handleCustomRowSelect={handleCustomRowSelect}
              handleCustomColumnSelect={handleCustomColumnSelect}
              handleCustomCellSelect={handleCustomCellSelect}
              handleCustomSelectAll={handleCustomSelectAll}
            />
          )}
        </div>

        <ScheduleItemDialog
          lng={lng}
          open={dialogOpen}
          onClose={handleCloseDialog}
          mode={dialogMode}
          selectedType={dialogType}
          dialogData={dialogData}
          teamId={teamWithMembership.team.id}
          scheduleId={scheduleCampaign?.id ?? null}
          workers={workers.filter((w) => !w.deleted)}
          shifts={shifts.filter((s) => !s.deleted)}
          schedules={[...(scheduleCampaign ? [scheduleCampaign] : []), ...schedulesValidated]}
          specialties={specialties}
          shiftOptions={[]}
          userWorkerId={null}
          userTeamRole={teamWithMembership.membership.role}
          useSolver={teamWithMembership.team.useSolver}
          handleCreateAssignment={handleCreateAssignment}
          handleUpdateAssignment={handleUpdateAssignment}
          handleDeleteAssignment={handleDeleteAssignment}
          handleCreateShiftDemand={handleCreateShiftDemand}
          handleUpdateShiftDemand={handleUpdateShiftDemand}
          handleDeleteShiftDemand={handleDeleteShiftDemand}
          handleAddRequest={handleAddRequest}
          handleUpdateRequest={handleUpdateRequest}
          handleDeleteRequest={handleDeleteRequest}
          handleRescindRequest={handleRescindRequest}
          handleAcceptRequest={handleAcceptRequest}
          handleDenyRequest={handleDenyRequest}
        />
      </div>
    </div>
  );
}
