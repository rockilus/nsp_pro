import React, { useState } from 'react';
import { EllipsisVertical, ArrowUp, ArrowDown, Filter, ArrowLeft } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ColumnDefinition, ColumnFilter, TableSort, SortDirection } from '../../types/filter';
import TextFilter from './filters/TextFilter';
import SelectFilter from './filters/SelectFilter';
import DateFilter from './filters/DateFilter';

interface ColumnSortFilterMenuProps {
  column: ColumnDefinition;
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort: (sort: TableSort | null) => void;
  onFilter: (filter: ColumnFilter) => void;
}

export default function ColumnSortFilterMenu({
  column,
  currentSort,
  currentFilter,
  onSort,
  onFilter,
}: ColumnSortFilterMenuProps) {
  const [open, setOpen] = useState(false);
  // When true, the popover shows the filter form instead of the sort menu
  const [showFilter, setShowFilter] = useState(false);

  const handleSort = (direction: SortDirection | null) => {
    if (direction) {
      onSort({ columnId: column.id, direction, label: column.label });
    } else {
      onSort(null);
    }
    setOpen(false);
  };

  const handleOpenFilter = () => {
    setShowFilter(true);
  };

  const handleFilterClose = () => {
    setOpen(false);
    setShowFilter(false);
  };

  const handleFilterApply = (filter: ColumnFilter) => {
    onFilter(filter);
    setOpen(false);
    setShowFilter(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setShowFilter(false);
  };

  const isCurrentlySorted = currentSort?.columnId === column.id;
  const sortDirection = isCurrentlySorted ? currentSort.direction : null;

  const renderFilterComponent = () => {
    switch (column.type) {
      case 'text':
        return (
          <TextFilter
            onApply={handleFilterApply}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            currentValue={currentFilter?.value}
          />
        );
      case 'select':
        return (
          <SelectFilter
            onApply={handleFilterApply}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            options={column.getOptions?.() || []}
            currentValue={currentFilter?.value}
          />
        );
      case 'boolean':
        return (
          <SelectFilter
            onApply={handleFilterApply}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            options={column.getOptions?.() || []}
            currentValue={currentFilter?.value}
          />
        );
      case 'date':
        return (
          <DateFilter
            onApply={handleFilterApply}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            currentValue={currentFilter?.value}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center rounded border-none bg-transparent p-1 opacity-70 hover:opacity-100"
          data-testid={`column-menu-${column.id}`}
        >
          <EllipsisVertical className="size-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" side="bottom" className="w-48 p-0">
        {showFilter ? (
          // ── Filter view ──────────────────────────────
          <div>
            <button
              onClick={() => setShowFilter(false)}
              className="flex w-full items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
            {renderFilterComponent()}
          </div>
        ) : (
          // ── Sort / Filter menu ──────────────────────
          <div className="flex flex-col py-1">
            <button
              type="button"
              onClick={() => handleSort('asc')}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              data-testid={`sort-asc-${column.id}`}
            >
              <ArrowUp className="size-4" />
              Sort Ascending
            </button>
            <button
              type="button"
              onClick={() => handleSort('desc')}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              data-testid={`sort-desc-${column.id}`}
            >
              <ArrowDown className="size-4" />
              Sort Descending
            </button>

            {sortDirection && (
              <button
                type="button"
                onClick={() => handleSort(null)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                data-testid={`remove-sort-${column.id}`}
              >
                Remove Sort
              </button>
            )}

            <div className="my-1 border-t border-border" />

            <button
              type="button"
              onClick={handleOpenFilter}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              data-testid={`filter-menu-${column.id}`}
            >
              <Filter className="size-4" />
              Filter
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
