import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../app/i18n/client';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isoWeek from 'dayjs/plugin/isoWeek';
// Mobile
import { useIsMobile } from '../../hooks/useIsMobile';
import MobileShiftDemandTab from './mobile/mobile-shift-demand-tab';
// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
// Skeletons
import TablesSkeleton from '../skeletons/tables-skeleton';
// Providers
import ReactQueryProvider from '../providers/ReactQueryProvider';
// API Hooks
import {
  useShiftDemands,
  useShiftDemandMutations,
  shiftDemandKeys,
} from '../../app/lib/hooks/useShiftDemands';
import { useGetWorkShifts } from '../../hooks/useShift';
import {
  useGetMultitaskingGroups,
  useCreateMultitaskingGroup,
  useDeleteMultitaskingGroup,
  useGetShiftDemandConcurrency,
} from '../../hooks/useMultitasking';
import { useQueryClient } from '@tanstack/react-query';
// Types
import { ShiftT, ShiftType } from '../../types/shift';
import {
  ShiftDemandCreateDTO,
  ShiftDemandUpdateDTO,
  PeriodType,
  SHIFT_DEMAND_CONSTRAINTS,
} from '../../types/shiftDemand';
import {
  MultitaskingSelectionState,
  MultitaskingGroup,
  ShiftDemandConcurrency,
} from '../../types/multitasking';
import { usePeriodState } from '../../app/lib/hooks/usePeriodState';
// Components
import { ShiftDemandToolbar } from './ShiftDemandToolbar';
import { ShiftDemandActionToolbar } from './toolbar';
import ShiftDemandTable from './ShiftDemandTable';
import ErrorFeedback from './ErrorFeedback';
import TemplateManagementWindow from './templates/TemplateManagementWindow';
// Hooks
import { useTableState } from '../../hooks/useTableState';
// Utils
import { createShiftColumns } from './shiftColumns';
// Styles
import '../../styles/tab-container-styles.css';

// Extend dayjs with the required plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

// Hook for dynamic height calculation
const useTableHeight = (isFilterToolbarActive: boolean) => {
  const [tableHeight, setTableHeight] = React.useState('70vh');

  React.useEffect(() => {
    const calculateHeight = () => {
      // Calculate available height based on viewport and other elements
      const viewportHeight = window.innerHeight;
      const headerHeight = 65; // Header height (64px + 1px border)
      const toolbarHeight = 46; // Toolbar height (40px + 6px of padding)
      const filterToolbarHeight = isFilterToolbarActive ? 42 : 0; // Filter toolbar height (35px + 6px padding + 1px border)
      const paddingAndMargins = 29; // Padding and margins (29px padding)

      const availableHeight =
        viewportHeight - headerHeight - toolbarHeight - filterToolbarHeight - paddingAndMargins;
      const maxHeight = Math.max(300, Math.min(availableHeight, viewportHeight));

      setTableHeight(`${maxHeight}px`);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => window.removeEventListener('resize', calculateHeight);
  }, [isFilterToolbarActive]);

  return tableHeight;
};

interface SelectedCell {
  shiftId: string;
  date: string;
}

interface BulkChangeState {
  isActive: boolean;
  selectedCells: SelectedCell[];
  bulkValue: string;
}

// Internal component that uses React Query hooks
function ShiftDemandTabInternal({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, 'shift-demands');

  // Bulk change state
  const [bulkChangeState, setBulkChangeState] = useState<BulkChangeState>({
    isActive: false,
    selectedCells: [],
    bulkValue: '1',
  });

  // Multitasking state
  const [multitaskingState, setMultitaskingState] = useState<MultitaskingSelectionState>({
    isActive: false,
    selectedShiftDemandIds: [],
    availableShiftDemandIds: [],
    mode: 'selecting',
  });

  const [multitaskingGroups, setMultitaskingGroups] = useState<MultitaskingGroup[]>([]);
  const [concurrencyData, setConcurrencyData] = useState<Record<string, string[]>>({});

  // Centralized period state (with localStorage persistence)
  const { currentDate, periodType, setCurrentDate, setPeriodType, isHydrated } = usePeriodState();

  // Query client for data invalidation
  const queryClient = useQueryClient();

  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Template management state
  const [templateManagementOpen, setTemplateManagementOpen] = useState(false);

  // Shift column definitions for filtering/sorting
  const shiftColumns = useMemo(() => createShiftColumns(t, shifts), [t, shifts]);

  // Table state for shift filtering and sorting
  const {
    tableState: shiftTableState,
    filteredAndSortedData: filteredShifts,
    addFilter: addShiftFilter,
    removeFilter: removeShiftFilter,
    updateSort: updateShiftSort,
    resetAll: resetShiftFilters,
  } = useTableState(shifts, shiftColumns, 'nsp-pro-shift-demand-table-state');

  // Show filter toolbar when bulk mode, multitasking mode is active, OR filters/sorting is applied
  const showFilterToolbar =
    bulkChangeState.isActive ||
    multitaskingState.isActive ||
    shiftTableState.filters.length > 0 ||
    shiftTableState.sort !== null;

  // Dynamic table height now accounts for filter toolbar
  const tableHeight = useTableHeight(showFilterToolbar);

  // Bulk selection helpers
  const toggleBulkMode = () => {
    setBulkChangeState((prev) => ({
      ...prev,
      isActive: !prev.isActive,
      selectedCells: [],
      bulkValue: '1',
    }));
  };

  const isCellSelected = (shiftId: string, date: Dayjs): boolean => {
    const dateStr = date.format('YYYY-MM-DD');
    return bulkChangeState.selectedCells.some(
      (cell) => cell.shiftId === shiftId && cell.date === dateStr,
    );
  };

  const toggleCellSelection = (shiftId: string, date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    setBulkChangeState((prev) => {
      const isSelected = prev.selectedCells.some(
        (cell) => cell.shiftId === shiftId && cell.date === dateStr,
      );
      if (isSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (cell) => !(cell.shiftId === shiftId && cell.date === dateStr),
          ),
        };
      } else {
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, { shiftId, date: dateStr }],
        };
      }
    });
  };

  const selectAllRowCells = (shiftId: string) => {
    const rowCells = dates.map((date) => ({
      shiftId,
      date: date.format('YYYY-MM-DD'),
    }));
    setBulkChangeState((prev) => {
      const allSelected = rowCells.every((cell) =>
        prev.selectedCells.some(
          (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date,
        ),
      );
      if (allSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !rowCells.some(
                (cell) => selected.shiftId === cell.shiftId && selected.date === cell.date,
              ),
          ),
        };
      } else {
        const newCells = rowCells.filter(
          (cell) =>
            !prev.selectedCells.some(
              (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date,
            ),
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...newCells],
        };
      }
    });
  };

  const selectAllColumnCells = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const columnCells = filteredShifts.map((shift) => ({
      shiftId: shift.id,
      date: dateStr,
    }));
    setBulkChangeState((prev) => {
      const allSelected = columnCells.every((cell) =>
        prev.selectedCells.some(
          (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date,
        ),
      );
      if (allSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !columnCells.some(
                (cell) => selected.shiftId === cell.shiftId && selected.date === cell.date,
              ),
          ),
        };
      } else {
        const newCells = columnCells.filter(
          (cell) =>
            !prev.selectedCells.some(
              (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date,
            ),
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...newCells],
        };
      }
    });
  };

  const selectAllCells = () => {
    const allCells = filteredShifts.flatMap((shift) =>
      dates.map((date) => ({
        shiftId: shift.id,
        date: date.format('YYYY-MM-DD'),
      })),
    );
    setBulkChangeState((prev) => {
      const allSelected = allCells.length === prev.selectedCells.length && allCells.length > 0;
      return {
        ...prev,
        selectedCells: allSelected ? [] : allCells,
      };
    });
  };

  // Enhanced bulk operations with better error handling
  const applyBulkChange = async () => {
    if (bulkChangeState.selectedCells.length === 0) return;

    const value = parseInt(bulkChangeState.bulkValue) || 0;

    // Validate bulk value
    if (value > SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT) {
      setError(`Count cannot exceed ${SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT}`);
      return;
    }

    try {
      const demands: Omit<ShiftDemandCreateDTO, 'teamId'>[] = bulkChangeState.selectedCells.map(
        (cell) => ({
          shiftId: cell.shiftId,
          date: Math.floor(new Date(cell.date).getTime() / 1000),
          count: Math.max(0, value),
          source: 'manual' as const,
          sourceId: null,
          notes: null,
        }),
      );

      await bulkUpsert.mutateAsync(demands);

      setBulkChangeState({
        isActive: false,
        selectedCells: [],
        bulkValue: '1',
      });

      setError(null);
    } catch (error) {
      console.error('Failed to apply bulk changes:', error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to apply bulk changes. Please try again.');
      }
    }
  };

  const deleteBulkSelection = async () => {
    if (bulkChangeState.selectedCells.length === 0) return;

    try {
      const demands: Omit<ShiftDemandCreateDTO, 'teamId'>[] = bulkChangeState.selectedCells.map(
        (cell) => ({
          shiftId: cell.shiftId,
          date: Math.floor(new Date(cell.date).getTime() / 1000),
          count: 0,
          source: 'manual' as const,
          sourceId: null,
          notes: null,
        }),
      );

      await bulkUpsert.mutateAsync(demands);

      setBulkChangeState({
        isActive: false,
        selectedCells: [],
        bulkValue: '1',
      });

      setError(null);
    } catch (error) {
      console.error('Failed to delete bulk selection:', error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to delete bulk selection. Please try again.');
      }
    }
  };

  const isRowSelected = (shiftId: string): boolean => {
    const rowCells = dates.map((date) => ({
      shiftId,
      date: date.format('YYYY-MM-DD'),
    }));
    return rowCells.every((cell) =>
      bulkChangeState.selectedCells.some(
        (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date,
      ),
    );
  };

  const isColumnSelected = (date: Dayjs): boolean => {
    const dateStr = date.format('YYYY-MM-DD');
    const columnCells = filteredShifts.map((shift) => ({
      shiftId: shift.id,
      date: dateStr,
    }));
    return columnCells.every((cell) =>
      bulkChangeState.selectedCells.some(
        (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date,
      ),
    );
  };

  const isAllSelected = (): boolean => {
    const totalCells = filteredShifts.length * dates.length;
    return bulkChangeState.selectedCells.length === totalCells && totalCells > 0;
  };

  // Multitasking mode functions
  const toggleMultitaskingMode = async () => {
    if (!selectedTeamId) return;

    if (!multitaskingState.isActive) {
      // Entering multitasking mode - fetch concurrency data and multitasking groups
      try {
        const [concurrencyList, groups] = await Promise.all([
          getShiftDemandConcurrency(selectedTeamId, startDate, endDate),
          getMultitaskingGroups(selectedTeamId),
        ]);

        console.log('Multitasking concurrency data:', concurrencyList);
        console.log('Multitasking groups:', groups);

        // Convert array to lookup object
        const concurrencyMap: Record<string, string[]> = {};
        concurrencyList.forEach((item: ShiftDemandConcurrency) => {
          concurrencyMap[item.shiftDemandId] = item.concurrentShiftDemandIds;
        });
        setConcurrencyData(concurrencyMap);
        setMultitaskingGroups(groups);

        // Update available shift demands based on concurrency
        const availableIds = Object.keys(concurrencyMap).filter(
          (id) => concurrencyMap[id].length > 0,
        );

        setMultitaskingState({
          isActive: true,
          selectedShiftDemandIds: [],
          availableShiftDemandIds: availableIds,
          mode: 'selecting',
        });
      } catch (error) {
        console.error('Failed to load multitasking data:', error);
        setError('Failed to load multitasking data. Please try again.');
      }
    } else {
      // Exiting multitasking mode
      setMultitaskingState({
        isActive: false,
        selectedShiftDemandIds: [],
        availableShiftDemandIds: [],
        mode: 'selecting',
      });
      setMultitaskingGroups([]);
      setConcurrencyData({});
    }
  };

  const toggleShiftDemandSelection = (shiftDemandId: string) => {
    if (!multitaskingState.isActive) return;

    setMultitaskingState((prev) => {
      const isSelected = prev.selectedShiftDemandIds.includes(shiftDemandId);
      let newSelectedIds: string[];
      let newAvailableIds = prev.availableShiftDemandIds;

      if (isSelected) {
        // Deselecting - remove from selection
        newSelectedIds = prev.selectedShiftDemandIds.filter((id) => id !== shiftDemandId);

        // If no selections left, reset available to all concurrent shift demands
        if (newSelectedIds.length === 0) {
          newAvailableIds = Object.keys(concurrencyData).filter(
            (id) => concurrencyData[id].length > 0,
          );
        }
      } else {
        // Selecting - add to selection
        newSelectedIds = [...prev.selectedShiftDemandIds, shiftDemandId];

        // Progressive selection: limit available to concurrent shift demands
        if (newSelectedIds.length === 1) {
          // First selection - limit to its concurrent partners
          newAvailableIds = [shiftDemandId, ...(concurrencyData[shiftDemandId] || [])];
        } else {
          // Multiple selections - intersection of all concurrent partners
          newAvailableIds = newAvailableIds.filter((id) =>
            newSelectedIds.every(
              (selectedId: string) =>
                id === selectedId || concurrencyData[selectedId]?.includes(id),
            ),
          );
        }
      }

      return {
        ...prev,
        selectedShiftDemandIds: newSelectedIds,
        availableShiftDemandIds: newAvailableIds,
      };
    });
  };

  const confirmMultitasking = async () => {
    if (!selectedTeamId || multitaskingState.selectedShiftDemandIds.length === 0) return;

    try {
      const newGroup = await createMultitaskingGroup({
        type: 'shift_demand',
        teamId: selectedTeamId,
        relatedIds: multitaskingState.selectedShiftDemandIds,
      });
      setMultitaskingGroups((prev) => [...prev, newGroup]);
      // Reset selection but stay in multitasking mode
      setMultitaskingState((prev) => ({
        ...prev,
        selectedShiftDemandIds: [],
        availableShiftDemandIds: Object.keys(concurrencyData).filter(
          (id) => concurrencyData[id].length > 0,
        ),
      }));
    } catch (error) {
      console.error('Failed to create multitasking group:', error);
      setError('Failed to create multitasking group. Please try again.');
    }
  };

  const editMultitasking = () => {
    // Placeholder for edit functionality
    console.log('Edit multitasking groups (placeholder)');
  };

  const handleDeleteMultitaskingGroup = async (groupId: string) => {
    if (!selectedTeamId) return;

    try {
      await deleteMultitaskingGroup(selectedTeamId, groupId);
      // Remove the deleted group from the local state
      setMultitaskingGroups((prev) => prev.filter((group) => group.id !== groupId));
    } catch (error) {
      console.error('Failed to delete multitasking group:', error);
      setError('Failed to delete multitasking group. Please try again.');
    }
  };

  const isShiftDemandSelectable = (shiftId: string, date: Dayjs): boolean => {
    if (!multitaskingState.isActive) return true;

    const shiftDemandId = `${shiftId}-${date.format('YYYY-MM-DD')}`;
    return multitaskingState.availableShiftDemandIds.includes(shiftDemandId);
  };

  const isShiftDemandSelected = (shiftId: string, date: Dayjs): boolean => {
    if (!multitaskingState.isActive) return false;

    const shiftDemandId = `${shiftId}-${date.format('YYYY-MM-DD')}`;
    return multitaskingState.selectedShiftDemandIds.includes(shiftDemandId);
  };

  const { startDate, endDate } = useMemo(() => {
    if (periodType === 'month') {
      return {
        startDate: currentDate.startOf('month'),
        endDate: currentDate.endOf('month'),
      };
    } else if (periodType === 'week') {
      // For week view, calculate week boundaries (Monday to Sunday, ISO week)
      return {
        startDate: currentDate.startOf('isoWeek'),
        endDate: currentDate.endOf('isoWeek'),
      };
    } else {
      // Custom period - use current date as center, show 2 weeks around it
      const start = currentDate.subtract(7, 'day');
      const end = currentDate.add(7, 'day');
      return {
        startDate: start,
        endDate: end,
      };
    }
  }, [currentDate, periodType]);

  // Generate array of dates for the period
  const dates = useMemo(() => {
    const dateArray: Dayjs[] = [];
    let current = startDate;
    const end = endDate;
    while (current.isSameOrBefore(end, 'day')) {
      dateArray.push(current);
      current = current.add(1, 'day');
    }
    return dateArray;
  }, [startDate, endDate]);

  // Fetch shift demands using the React Query hook
  const {
    demands,
    demandsById,
    matrix,
    isLoading: isLoadingDemands,
    error: demandsError,
  } = useShiftDemands(selectedTeamId || '', startDate, endDate, {
    enabled: !!selectedTeamId,
  });

  // Shift demand mutations
  const {
    create,
    update,
    delete: deleteDemand,
    bulkUpsert,
  } = useShiftDemandMutations(selectedTeamId || '');

  // Template application callback - invalidates shift demand queries to refresh data
  const handleTemplateApplied = React.useCallback(() => {
    if (selectedTeamId) {
      queryClient.invalidateQueries({
        queryKey: shiftDemandKeys.teams(selectedTeamId),
      });
    }
  }, [queryClient, selectedTeamId]);

  // Get work shifts using authenticated hook
  const getWorkShifts = useGetWorkShifts();

  // Multitasking hooks
  const getMultitaskingGroups = useGetMultitaskingGroups();
  const createMultitaskingGroup = useCreateMultitaskingGroup();
  const deleteMultitaskingGroup = useDeleteMultitaskingGroup();
  const getShiftDemandConcurrency = useGetShiftDemandConcurrency();

  // Load shifts when team changes
  React.useEffect(() => {
    const loadShifts = async () => {
      if (!selectedTeamId) {
        setShifts([]);
        return;
      }

      setIsLoadingShifts(true);
      setShiftError(null);

      try {
        const fetchedShifts = await getWorkShifts(selectedTeamId);
        // Filter to only normal and duty shifts for demand planning
        const workShifts = fetchedShifts.filter(
          (shift: ShiftT) =>
            shift.shiftType === ShiftType.NORMAL || shift.shiftType === ShiftType.DUTY,
        );
        setShifts(workShifts);
      } catch (error) {
        console.error('Error fetching shifts:', error);
        setShiftError('Failed to load shifts. Please try again.');
      } finally {
        setIsLoadingShifts(false);
      }
    };

    loadShifts();
  }, [selectedTeamId, getWorkShifts]);

  // Navigation functions for PeriodNavigation component
  const handlePeriodChange = (start: Dayjs, end: Dayjs) => {
    // Calculate the center date of the new period
    const centerDate = dayjs(start.valueOf() + (end.valueOf() - start.valueOf()) / 2);
    setCurrentDate(centerDate);
  };

  const handlePeriodTypeChange = (newType: PeriodType) => {
    setPeriodType(newType);
  };

  // Get demand value for a specific shift and date
  const getDemandValue = (shiftId: string, date: Dayjs): number => {
    const dateStr = date.format('YYYY-MM-DD');
    // Only use matrix data since changes are saved immediately
    return matrix[shiftId]?.[dateStr] || 0;
  };

  // Enhanced handleCellChange with better validation and error handling
  const handleCellChange = async (shiftId: string, date: Dayjs, value: string) => {
    const dateStr = date.format('YYYY-MM-DD');
    const numValue = Math.max(0, parseInt(value) || 0);
    const cellKey = `${shiftId}-${dateStr}`;

    // Don't save if already saving this cell
    if (savingCells.has(cellKey)) return;

    // Input validation
    if (!selectedTeamId) {
      console.error('No team selected');
      return;
    }

    if (numValue > SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT) {
      // Show user-friendly error
      setError(`Count cannot exceed ${SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT}`);
      return;
    }

    // Mark cell as saving
    setSavingCells((prev) => new Set(prev).add(cellKey));
    setError(null); // Clear any previous errors

    try {
      const existingDemand = demandsById.get(cellKey);
      const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);

      if (existingDemand) {
        if (numValue === 0) {
          // Delete demand if count is zero
          await deleteDemand.mutateAsync(existingDemand.id);
        } else {
          // Update existing demand
          const updateData: ShiftDemandUpdateDTO = {
            count: numValue,
            source: 'manual' as const,
            notes: null,
          };

          await update.mutateAsync({
            demandId: existingDemand.id,
            demand: updateData,
          });
        }
      } else if (numValue > 0) {
        // Only create new demand if count is greater than zero
        const createData: Omit<ShiftDemandCreateDTO, 'teamId'> = {
          shiftId,
          date: timestamp,
          count: numValue,
          source: 'manual' as const,
          sourceId: null,
          notes: null,
        };

        await create.mutateAsync({
          demand: createData,
        });
      }
    } catch (error) {
      console.error('Failed to save cell change:', error);

      // Show user-friendly error message
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to save changes. Please try again.');
      }
    } finally {
      // Remove from saving set
      setSavingCells((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  // Wait for hydration of period state before rendering (prevents SSR mismatch)
  if (!isHydrated || isLoadingShifts || isLoadingDemands) {
    return (
      <div className="tab-container-ultrawide">
        <TablesSkeleton numTables={1} numInternalRows={5} />
      </div>
    );
  }

  // No team selected
  if (!selectedTeamId) {
    return (
      <div className="tab-container-ultrawide">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="h6" color="textSecondary">
            {t('select_team_message')}
          </Typography>
        </Box>
      </div>
    );
  }

  // Error states
  if (shiftError || demandsError) {
    return (
      <div className="tab-container-ultrawide">
        <Alert severity="error" sx={{ mb: 2 }}>
          {shiftError || demandsError?.message || t('error_loading_data')}
        </Alert>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => {
            window.location.reload(); // Reload to retry data loading
          }}
        >
          {t('retry')}
        </Button>
      </div>
    );
  }

  // No shifts available
  if (shifts.length === 0) {
    return (
      <div className="tab-container-ultrawide" data-testid="shift-demand-tab">
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('no_shifts_title')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('no_shifts_message')}
          </Typography>
        </Paper>
      </div>
    );
  }

  return (
    <div className="tab-container-ultrawide" data-testid="shift-demand-tab">
      {/* Main Toolbar */}
      <ShiftDemandToolbar
        lng={lng}
        currentPeriod={{ start: startDate, end: endDate }}
        onPeriodChange={handlePeriodChange}
        periodType={periodType}
        onPeriodTypeChange={handlePeriodTypeChange}
        isLoading={isLoadingDemands || create.isLoading || update.isLoading || bulkUpsert.isLoading}
        bulkModeActive={bulkChangeState.isActive}
        onToggleBulkMode={toggleBulkMode}
        multitaskingModeActive={multitaskingState.isActive}
        onToggleMultitaskingMode={toggleMultitaskingMode}
        onOpenTemplates={() => setTemplateManagementOpen(true)}
      />

      {/* Action Toolbar - Filter/Sort and Bulk Selection */}
      {showFilterToolbar && (
        <ShiftDemandActionToolbar
          lng={lng}
          showBulkMode={bulkChangeState.isActive}
          showFilters={shiftTableState.filters.length > 0 || shiftTableState.sort !== null}
          showMultitaskingMode={multitaskingState.isActive}
          multitaskingProps={{
            lng,
            selectedShiftDemandsCount: multitaskingState.selectedShiftDemandIds.length,
            multitaskingGroups,
            shifts,
            onConfirmMultitasking: confirmMultitasking,
            onEditMultitasking: editMultitasking,
            onCancelMultitaskingMode: toggleMultitaskingMode,
            onDeleteGroup: handleDeleteMultitaskingGroup,
          }}
          // Filter/Sort props
          filters={shiftTableState.filters}
          sort={shiftTableState.sort}
          onRemoveFilter={removeShiftFilter}
          onRemoveSort={() => updateShiftSort(null)}
          onResetAll={resetShiftFilters}
          // Bulk selection props
          selectedCellsCount={bulkChangeState.selectedCells.length}
          bulkValue={bulkChangeState.bulkValue}
          onBulkValueChange={(value) =>
            setBulkChangeState((prev) => ({ ...prev, bulkValue: value }))
          }
          onApplyBulkChange={applyBulkChange}
          onDeleteBulkSelection={deleteBulkSelection}
          onCancelBulkMode={toggleBulkMode}
        />
      )}

      <Paper elevation={1} sx={{ p: 3, mb: 2, padding: '5px 24px 24px 24px' }}>
        {/* Save operation error */}
        {(bulkUpsert.error || create.error || update.error) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('save_error_message')}:{' '}
            {(bulkUpsert.error || create.error || update.error)?.message || 'Unknown error'}
          </Alert>
        )}

        {/* Loading indicator during save */}
        {/* {(bulkUpsert.isLoading || create.isLoading || update.isLoading) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Saving changes...
          </Alert>
        )} */}

        {/* Shift Demand Grid */}
        <ShiftDemandTable
          lng={lng}
          shifts={filteredShifts}
          dates={dates}
          bulkChangeState={bulkChangeState}
          // Multitasking props
          multitaskingState={multitaskingState}
          onToggleShiftDemandSelection={toggleShiftDemandSelection}
          isShiftDemandSelectable={isShiftDemandSelectable}
          isShiftDemandSelected={isShiftDemandSelected}
          // Regular props
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          selectAllColumnCells={selectAllColumnCells}
          selectAllCells={selectAllCells}
          isRowSelected={isRowSelected}
          isColumnSelected={isColumnSelected}
          isAllSelected={isAllSelected}
          savingCells={savingCells}
          maxHeight={tableHeight}
          // Filter/Sort props
          currentSort={shiftTableState.sort || undefined}
          currentFilter={shiftTableState.filters[0]} // Pass first filter if any
          onSort={updateShiftSort}
          onFilter={addShiftFilter}
          shiftColumn={shiftColumns[0]} // Pass first column definition
        />
      </Paper>

      {/* Template Management Window */}
      <TemplateManagementWindow
        lng={lng}
        open={templateManagementOpen}
        onClose={() => setTemplateManagementOpen(false)}
        teamId={selectedTeamId || ''}
        shifts={shifts}
        currentPeriod={{ start: startDate, end: endDate }}
        onTemplateApplied={handleTemplateApplied}
      />

      {/* Error Feedback */}
      <ErrorFeedback error={error} onClose={() => setError(null)} />
    </div>
  );
}

// Main export component with React Query provider
export default function ShiftDemandTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileShiftDemandTab lng={lng} selectedTeamId={selectedTeamId} />;
  }

  return (
    <ReactQueryProvider>
      <ShiftDemandTabInternal lng={lng} selectedTeamId={selectedTeamId} />
    </ReactQueryProvider>
  );
}
