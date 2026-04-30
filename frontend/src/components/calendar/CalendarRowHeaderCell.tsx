import React from 'react';
import { Sparkle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export interface CalendarRowHeaderCellProps {
  children: React.ReactNode;
  /** data-testid for the root element */
  'data-testid'?: string;
  /** When true, render a bulk-select shadcn Checkbox */
  isBulkMode?: boolean;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  onSelect?: () => void;
  /** data-testid for the bulk-select checkbox */
  checkboxTestId?: string;
  /** When true, render the custom-solve sparkle button */
  isCustomSolveMode?: boolean;
  isCustomSelected?: boolean;
  isCustomIndeterminate?: boolean;
  onCustomSelect?: () => void;
  /** data-testid for the sparkle button */
  customSelectTestId?: string;
  className?: string;
}

/**
 * Shared sticky-left row header shell used by the worker table, shift table,
 * request calendar, and shift-demand table.
 *
 * Renders a 180 px sticky-left div with:
 *   - an optional shadcn Checkbox for bulk selection
 *   - an optional Sparkle button for custom-solve column selection
 *   - arbitrary children (the row-specific content)
 */
export default function CalendarRowHeaderCell({
  children,
  'data-testid': testId,
  isBulkMode = false,
  isSelected = false,
  isIndeterminate = false,
  onSelect,
  checkboxTestId,
  isCustomSolveMode = false,
  isCustomSelected = false,
  isCustomIndeterminate = false,
  onCustomSelect,
  customSelectTestId,
  className,
}: CalendarRowHeaderCellProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'sticky left-0 z-[2] flex w-[180px] max-w-[220px] min-w-[180px] shrink-0 items-center gap-1 border-r border-border/50 bg-card px-2',
        className,
      )}
    >
      {isBulkMode && onSelect && (
        <Checkbox
          data-testid={checkboxTestId}
          checked={isIndeterminate ? 'indeterminate' : isSelected}
          onCheckedChange={onSelect}
          className="h-3.5 w-3.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {isCustomSolveMode && onCustomSelect && (
        <button
          data-testid={customSelectTestId}
          onClick={(e) => {
            e.stopPropagation();
            onCustomSelect();
          }}
          className="shrink-0 cursor-pointer border-none bg-transparent p-0"
          style={{
            color: isCustomSelected ? '#1976d2' : isCustomIndeterminate ? '#42a5f5' : '#9e9e9e',
          }}
        >
          <Sparkle
            size={12}
            fill={isCustomSelected || isCustomIndeterminate ? 'currentColor' : 'none'}
          />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
