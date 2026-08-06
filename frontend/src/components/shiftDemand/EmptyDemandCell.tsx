import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyDemandCellProps {
  isSaving: boolean;
  isHovered: boolean;
  isMultitaskingMode?: boolean;
  onAddDemand: () => void;
}

export function EmptyDemandCell({
  isSaving,
  isHovered,
  isMultitaskingMode = false,
  onAddDemand,
}: EmptyDemandCellProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded border border-dashed border-transparent transition-all duration-200',
        !isMultitaskingMode &&
          isHovered &&
          'border-[var(--shift-sample-color)] bg-[var(--shift-bg-color)]',
      )}
      onClick={!isMultitaskingMode ? onAddDemand : undefined}
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        isHovered &&
        !isMultitaskingMode && (
          <Plus className="h-4 w-4 opacity-70" style={{ color: 'var(--shift-sample-color)' }} />
        )
      )}
    </div>
  );
}
