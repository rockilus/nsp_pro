import React, { useState } from 'react';
import { EllipsisVertical, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent } from '@/components/ui/popover';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const handleSort = (direction: SortDirection | null) => {
    if (direction) {
      onSort({
        columnId: column.id,
        direction,
        label: column.label,
      });
    } else {
      onSort(null);
    }
    setDropdownOpen(false);
  };

  const handleFilterOpen = () => {
    setFilterOpen(true);
    setDropdownOpen(false);
  };

  const handleFilterClose = () => {
    setFilterOpen(false);
  };

  const handleFilterApply = (filter: ColumnFilter) => {
    onFilter(filter);
    setFilterOpen(false);
  };

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

  const isCurrentlySorted = currentSort?.columnId === column.id;
  const sortDirection = isCurrentlySorted ? currentSort.direction : null;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex cursor-pointer items-center rounded border-none bg-transparent p-1 opacity-70 hover:opacity-100"
            data-testid={`column-menu-${column.id}`}
          >
            <EllipsisVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[180px]">
          <DropdownMenuItem onClick={() => handleSort('asc')} data-testid={`sort-asc-${column.id}`}>
            <ArrowUp className="size-4" />
            <span>Sort Ascending</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSort('desc')}
            data-testid={`sort-desc-${column.id}`}
          >
            <ArrowDown className="size-4" />
            <span>Sort Descending</span>
          </DropdownMenuItem>

          {sortDirection && (
            <DropdownMenuItem
              onClick={() => handleSort(null)}
              data-testid={`remove-sort-${column.id}`}
            >
              <span>Remove Sort</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleFilterOpen} data-testid={`filter-menu-${column.id}`}>
            <Filter className="size-4" />
            <span>Filter</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverContent align="start" side="bottom" className="p-0">
          {renderFilterComponent()}
        </PopoverContent>
      </Popover>
    </>
  );
}
