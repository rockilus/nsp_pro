import React from 'react';
import { Dayjs } from 'dayjs';
import { Skeleton } from '@/components/ui/skeleton';

export const StaffingSummaryLoadingIndicator: React.FC<{ days: Dayjs[] }> = ({ days }) => (
  <>
    {[0, 1, 2].map((rowIndex) => (
      <div
        key={`loading-row-${rowIndex}`}
        className="flex min-h-[40px] items-stretch border-b border-border/50"
      >
        {/* Row label skeleton */}
        <div className="sticky left-0 z-[2] flex w-[180px] min-w-[180px] shrink-0 items-center border-r border-border/50 bg-card px-3 py-2">
          <Skeleton className="h-4 w-3/4" />
        </div>
        {/* Cell skeletons */}
        <div className="flex flex-1">
          {days.map((_, i) => (
            <div
              key={`loading-cell-${rowIndex}-${i}`}
              className="flex min-h-[40px] min-w-[60px] flex-1 items-center justify-center border-r border-border/50 p-1"
            >
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </>
);
