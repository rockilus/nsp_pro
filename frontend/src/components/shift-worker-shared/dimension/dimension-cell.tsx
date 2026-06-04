import React, { useState } from 'react';
import { CaseSensitive, CheckSquare, List, Hash } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
// Components
import PopoverAnchorElBelow from '../../inputs/popover-anchor-el-below';
import UpdateDimensionForm from './update-dimension-form';
import ColumnSortFilterMenu from '../../table/ColumnSortFilterMenu';
// Styles
import '../../../styles/table-styles.css';
//Types
import { DimensionT, DimensionType } from '../../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { ColumnDefinition, ColumnFilter, TableSort } from '../../../types/filter';

interface DimensionCellProps {
  lng: string;
  selectedTeamId: string;
  dimensionTypeTable: DimensionType;
  dimension: DimensionT;
  dimEntries: DimEntryT[];
  // New props for sorting/filtering
  column?: ColumnDefinition;
  currentSort?: TableSort;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
  className?: string;
}

export default function DimensionCell({
  lng,
  selectedTeamId,
  dimensionTypeTable,
  dimension,
  dimEntries,
  column,
  currentSort,
  onSort,
  onFilter,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
  className = '',
}: DimensionCellProps) {
  const [popoverAnchorOpen, setPopoverAnchorOpen] = useState(false);

  const iconsPrefix: Record<string, React.ReactNode> = {
    str: <CaseSensitive className="size-4 text-muted-foreground" />,
    int: <Hash className="size-4 text-muted-foreground" />,
    bool: <CheckSquare className="size-4 text-muted-foreground" />,
    list: <List className="size-4 text-muted-foreground" />,
  };

  const cellContent = () => (
    <div
      className="table-header-default flex items-center justify-between"
      data-testid={`dimension-cell-content-${dimension.id}`}
    >
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span data-testid={`dimension-name-${dimension.id}`}>{dimension.name}</span>
          </TooltipTrigger>
          <TooltipContent>{dimension.name}</TooltipContent>
        </Tooltip>
        {iconsPrefix[dimension.entryType]}
      </div>
      {onSort && onFilter && column && (
        <div onClick={(e) => e.stopPropagation()}>
          <ColumnSortFilterMenu
            column={column}
            currentSort={currentSort}
            currentFilter={undefined}
            onSort={onSort}
            onFilter={onFilter}
          />
        </div>
      )}
    </div>
  );

  return (
    <td
      className={`worker-table-header h-9 border-b border-border bg-muted px-2 py-0 text-xs font-medium ${className}`.trim()}
      data-testid={`worker-dimension-${dimension.id}-header-cell`}
    >
      <PopoverAnchorElBelow
        buttonContent={cellContent()}
        content={
          <UpdateDimensionForm
            lng={lng}
            selectedTeamId={selectedTeamId}
            dimensionTypeTable={dimensionTypeTable}
            dimension={dimension}
            dimEntries={dimEntries}
            setOpenParent={setPopoverAnchorOpen}
            handleUpdateDimension={handleUpdateDimension}
            handleDeleteDimension={handleDeleteDimension}
            handleAddDimEntry={handleAddDimEntry}
            handleUpdateDimEntry={handleUpdateDimEntry}
            handleDeleteDimEntry={handleDeleteDimEntry}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
        testId={`dimension-popup-${dimension.id}`}
      />
    </td>
  );
}
