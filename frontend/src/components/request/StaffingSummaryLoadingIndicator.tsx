import React from 'react';
import { Dayjs } from 'dayjs';
import { Skeleton } from '@/components/ui/skeleton';
import { calendarGridTemplate } from '@/constants/constants';

export const StaffingSummaryLoadingIndicator: React.FC<{ days: Dayjs[] }> = ({ days }) => (
  <>
    {[0, 1, 2].map((rowIndex) => (
      <div
        key={`loading-row-${rowIndex}`}
        className="min-h-[40px] border-b border-border/50"
        style={{
          display: 'grid',
          gridTemplateColumns: calendarGridTemplate(days.length),
        }}
      >
        {/* Row label skeleton */}
        <div className="sticky left-0 z-[2] flex items-center border-r border-border/50 bg-card px-3 py-2">
          <Skeleton className="h-4 w-3/4" />
        </div>
        {/* Cell skeletons — direct grid children */}
        {days.map((_, i) => (
          <div
            key={`loading-cell-${rowIndex}-${i}`}
            className="flex min-h-[40px] items-center justify-center border-r border-border/50 p-1"
          >
            <Skeleton className="h-4 w-6" />
          </div>
        ))}
      </div>
    ))}
  </>
);
