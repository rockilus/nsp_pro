import React, { useState } from 'react';
// MUI
import AbcIcon from '@mui/icons-material/Abc';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ListIcon from '@mui/icons-material/List';
import NumbersIcon from '@mui/icons-material/Numbers';
import TableCell from '@mui/material/TableCell';
import Tooltip from '@mui/material/Tooltip';
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
    str: <AbcIcon color="disabled" fontSize="small" />,
    int: <NumbersIcon color="disabled" fontSize="small" />,
    bool: <CheckBoxIcon color="disabled" fontSize="small" />,
    list: <ListIcon color="disabled" fontSize="small" />,
  };

  const cellContent = () => (
    <div
      className="table-header-default flex items-center justify-between"
      data-testid={`dimension-cell-content-${dimension.id}`}
    >
      <div className="flex items-center gap-1">
        <Tooltip title={dimension.name} placement="top">
          <span data-testid={`dimension-name-${dimension.id}`}>{dimension.name}</span>
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
    <TableCell
      key={dimension.id}
      component="th"
      scope="row"
      className={`worker-table-header ${className}`.trim()}
      data-testid={`worker-dimension-${dimension.id}-header-cell`}
      sx={{
        paddingY: 0,
        padding: '6px 8px',
        height: '36px',
        fontSize: '0.8rem',
        fontWeight: 500,
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #e0e0e0',
      }}
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
    </TableCell>
  );
}
