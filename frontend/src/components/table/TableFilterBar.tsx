import React from 'react';
import { ArrowUpDown, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../../app/i18n/client';
import { ColumnFilter, TableSort } from '../../types/filter';

interface TableFilterBarProps {
  filters: ColumnFilter[];
  sort: TableSort | null;
  onRemoveFilter: (filterId: string) => void;
  onRemoveSort: () => void;
  onResetAll: () => void;
  hideSort?: boolean;
  /** Render inline without the outer container div (for embedding in flex toolbars) */
  inline?: boolean;
  lng?: string;
}

export default function TableFilterBar({
  filters,
  sort,
  onRemoveFilter,
  onRemoveSort,
  onResetAll,
  hideSort = false,
  inline = false,
  lng,
}: TableFilterBarProps) {
  const { t } = useTranslation(lng || 'en', 'shift-demands');

  const hasActiveFilters = filters.length > 0 || (!hideSort && sort !== null);

  if (!hasActiveFilters) {
    return null;
  }

  const content = (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5',
        !inline && 'max-h-20 overflow-x-hidden overflow-y-auto',
      )}
    >
      {!hideSort && sort && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary"
          data-testid="sort-chip"
        >
          <ArrowUpDown className="size-3 shrink-0" />
          {sort.label} {sort.direction === 'asc' ? '↑' : '↓'}
          <button
            type="button"
            onClick={onRemoveSort}
            className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Remove sort"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
          data-testid={`filter-chip-${filter.id}`}
        >
          {filter.label}
          <button
            type="button"
            onClick={() => onRemoveFilter(filter.id)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Remove filter ${filter.label}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={onResetAll}
        className="ml-auto shrink-0 self-start text-muted-foreground"
        data-testid="reset-all-filters-button"
      >
        <RotateCcw className="size-3" />
        {t('reset')}
      </Button>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="rounded-md bg-muted/50 px-3 py-2" data-testid="table-filter-bar">
      {content}
    </div>
  );
}
