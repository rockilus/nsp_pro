import React from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemandCellContentProps {
  value: number;
  isSaving: boolean;
  isHovered: boolean;
  isMultitaskingMode?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function DemandCellContent({
  value,
  isSaving,
  isHovered,
  isMultitaskingMode = false,
  onIncrement,
  onDecrement,
}: DemandCellContentProps) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center rounded shadow-sm transition-all duration-200',
        isSaving ? 'opacity-70' : isHovered && !isMultitaskingMode && 'scale-[1.02] shadow-md',
      )}
      style={{
        backgroundColor: isSaving ? '#ffb74d' : 'var(--shift-bg-color)',
        color: 'var(--shift-text-color)',
      }}
    >
      {isSaving && (
        <Loader2
          className="absolute h-4 w-4 animate-spin"
          style={{ color: 'var(--shift-text-color)' }}
        />
      )}

      {isHovered && !isSaving && !isMultitaskingMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDecrement();
          }}
          className="absolute top-1/2 left-0.5 flex h-3.5 w-3.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/15 hover:bg-black/25"
        >
          <Minus className="h-2 w-2" style={{ color: 'var(--shift-text-color)' }} />
        </button>
      )}

      <span
        className={cn('text-sm font-bold', isSaving && 'opacity-30')}
        style={{ color: 'var(--shift-text-color)' }}
      >
        {value}
      </span>

      {isHovered && !isSaving && !isMultitaskingMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIncrement();
          }}
          className="absolute top-1/2 right-0.5 flex h-3.5 w-3.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/15 hover:bg-black/25"
        >
          <Plus className="h-2 w-2" style={{ color: 'var(--shift-text-color)' }} />
        </button>
      )}
    </div>
  );
}
