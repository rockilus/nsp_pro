import React, { useMemo } from 'react';
import { Sparkle } from 'lucide-react';
import { useTranslation } from '../../../../app/i18n/client';
// MUI
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import TableCell from '@mui/material/TableCell';
// Styles
import './export-cell.css';
import '../../../../styles/text-styles.css';
// Types
import { ScheduleT, periodDateT } from '../../../../types/schedule';
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
  SelectionScope,
} from '../../../../types/scheduleSelection';

export default function ExportCell({
  lng,
  periodDates,
  scheduleCampaign,
  isSelectionActive,
  selectionState,
  rowIds,
  selectionScope,
  handleSelectAll,
  isCustomSolveModeActive = false,
  customSolveSelectedCells = [],
  handleCustomSelectAll,
}: {
  lng: string;
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  isSelectionActive: boolean;
  selectionState: ScheduleSelectionState;
  rowIds: string[];
  selectionScope: SelectionScope;
  handleSelectAll: (rowIds: string[], scope: SelectionScope) => void;
  isCustomSolveModeActive?: boolean;
  customSolveSelectedCells?: SelectedScheduleCell[];
  handleCustomSelectAll?: (cells: SelectedScheduleCell[]) => void;
}) {
  const { t } = useTranslation(lng, 'schedule-page');

  const targetDates = useMemo(() => {
    if (!isSelectionActive) return [];
    if (selectionScope === 'campaign' && scheduleCampaign) {
      const dates: string[] = [];
      let current = scheduleCampaign.startDate.startOf('day');
      const end = scheduleCampaign.endDate.startOf('day');
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        dates.push(current.format('YYYY-MM-DD'));
        current = current.add(1, 'day');
      }
      return dates;
    }
    return periodDates.map((pd) => pd.date.format('YYYY-MM-DD'));
  }, [isSelectionActive, selectionScope, scheduleCampaign, periodDates]);

  const isAllSelected = useMemo(() => {
    if (!rowIds?.length) return false;
    // Campaign scope: derive from intent — all rows are selected when selectedRowIds is empty
    if (selectionScope === 'campaign' && selectionState?.campaignIntent) {
      return selectionState.campaignIntent.selectedRowIds.length === 0;
    }
    if (!targetDates.length) return false;
    return rowIds.every((rowId) =>
      targetDates.every((date) =>
        selectionState?.selectedCells.some((c) => c.rowId === rowId && c.date === date),
      ),
    );
  }, [rowIds, targetDates, selectionScope, selectionState]);

  const isSomeSelected = useMemo(() => {
    if (!rowIds?.length) return false;
    // Campaign scope: derive from intent
    if (selectionScope === 'campaign' && selectionState?.campaignIntent) {
      // Some rows selected but not all
      return selectionState.campaignIntent.selectedRowIds.length > 0;
    }
    if (!targetDates.length) return false;
    const hasSomeCell = rowIds.some((rowId) =>
      targetDates.some((date) =>
        selectionState?.selectedCells.some((c) => c.rowId === rowId && c.date === date),
      ),
    );
    const hasSomeAssignment = (selectionState?.selectedAssignmentIds.length ?? 0) > 0;
    return (hasSomeCell || hasSomeAssignment) && !isAllSelected;
  }, [rowIds, targetDates, selectionScope, selectionState, isAllSelected]);

  const handleSelectAllChange = () => {
    if (isAllSelected) {
      handleSelectAll?.([], selectionScope ?? 'view');
    } else {
      handleSelectAll?.(rowIds ?? [], selectionScope ?? 'view');
    }
  };

  const isCustomAllSelected = useMemo(() => {
    if (!isCustomSolveModeActive || !rowIds?.length || !scheduleCampaign) return false;
    let current = scheduleCampaign.startDate.startOf('day');
    const end = scheduleCampaign.endDate.startOf('day');
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const date = current.format('YYYY-MM-DD');
      if (
        !rowIds.every((rowId) =>
          customSolveSelectedCells.some((c) => c.rowId === rowId && c.date === date),
        )
      )
        return false;
      current = current.add(1, 'day');
    }
    return true;
  }, [isCustomSolveModeActive, rowIds, scheduleCampaign, customSolveSelectedCells]);

  const isCustomSomeSelected = useMemo(() => {
    if (!isCustomSolveModeActive || !rowIds?.length || !scheduleCampaign) return false;
    if (isCustomAllSelected) return false;
    return customSolveSelectedCells.some((c) => rowIds.includes(c.rowId));
  }, [
    isCustomSolveModeActive,
    rowIds,
    scheduleCampaign,
    customSolveSelectedCells,
    isCustomAllSelected,
  ]);

  const handleCustomSelectAllChange = () => {
    if (!scheduleCampaign) return;
    if (isCustomAllSelected) {
      // Remove all campaign cells from selection
      const campaignKeys = new Set<string>();
      let current = scheduleCampaign.startDate.startOf('day');
      const end = scheduleCampaign.endDate.startOf('day');
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const date = current.format('YYYY-MM-DD');
        rowIds.forEach((rowId) => campaignKeys.add(`${rowId}-${date}`));
        current = current.add(1, 'day');
      }
      handleCustomSelectAll?.(
        customSolveSelectedCells.filter((c) => !campaignKeys.has(`${c.rowId}-${c.date}`)),
      );
    } else {
      // Add all campaign cells not yet selected
      const existingKeys = new Set(customSolveSelectedCells.map((c) => `${c.rowId}-${c.date}`));
      const toAdd: SelectedScheduleCell[] = [];
      let current = scheduleCampaign.startDate.startOf('day');
      const end = scheduleCampaign.endDate.startOf('day');
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const date = current.format('YYYY-MM-DD');
        const pd = periodDates.find((p) => p.date.format('YYYY-MM-DD') === date);
        rowIds.forEach((rowId) => {
          if (!existingKeys.has(`${rowId}-${date}`)) {
            toAdd.push({ rowId, date, scheduleId: pd?.scheduleId ?? null });
          }
        });
        current = current.add(1, 'day');
      }
      handleCustomSelectAll?.([...customSolveSelectedCells, ...toAdd]);
    }
  };

  return (
    <TableCell
      sx={{
        position: 'sticky',
        left: 0,
        backgroundColor: '#FFFFFF',
        padding: 0,
      }}
    >
      <div className="export-cell-container">
        {isSelectionActive && (
          <Checkbox
            size="small"
            checked={isAllSelected}
            indeterminate={isSomeSelected}
            onChange={handleSelectAllChange}
            onClick={(e) => e.stopPropagation()}
            data-testid="export-cell-select-all-checkbox"
            sx={{ padding: '2px', display: 'block', margin: '0 auto' }}
          />
        )}
        {isCustomSolveModeActive && (
          <Tooltip title="Select/deselect entire campaign">
            <button
              data-testid="export-cell-custom-select-all"
              onClick={(e) => {
                e.stopPropagation();
                handleCustomSelectAllChange();
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'block',
                margin: '0 auto',
                padding: '2px',
                color: isCustomAllSelected
                  ? '#1976d2'
                  : isCustomSomeSelected
                    ? '#42a5f5'
                    : '#9e9e9e',
              }}
            >
              <Sparkle
                size={14}
                fill={isCustomAllSelected || isCustomSomeSelected ? 'currentColor' : 'none'}
              />
            </button>
          </Tooltip>
        )}
      </div>
    </TableCell>
  );
}
