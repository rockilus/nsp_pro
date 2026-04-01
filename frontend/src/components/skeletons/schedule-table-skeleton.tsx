import * as React from 'react';
// MUI
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function ScheduleTableSkeleton() {
  const scheduleSkeletonRow = (position: 'top' | 'middle' | 'bottom', key?: React.Key) => {
    return (
      <Stack key={key} direction="row" spacing="2px" sx={{ height: '60px', width: '100%' }}>
        <Skeleton
          variant="rectangular"
          sx={{
            borderTopLeftRadius: position === 'top' ? '8px' : '0px',
            borderTopRightRadius: '0px',
            borderBottomLeftRadius: position === 'bottom' ? '8px' : '0px',
            borderBottomRightRadius: '0px',
            height: '100%',
            flex: 1,
          }}
        />
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            sx={{
              height: '100%',
              flex: 1,
            }}
          />
        ))}
        <Skeleton
          variant="rectangular"
          sx={{
            borderTopLeftRadius: '0px',
            borderTopRightRadius: position === 'top' ? '8px' : '0px',
            borderBottomLeftRadius: '0px',
            borderBottomRightRadius: position === 'bottom' ? '8px' : '0px',
            height: '100%',
            flex: 1,
          }}
        />
      </Stack>
    );
  };

  return (
    <Stack spacing="2px" sx={{ height: '600px', width: '100%' }}>
      {scheduleSkeletonRow('top', 'top')}
      {Array.from({ length: 7 }).map((_, index) => scheduleSkeletonRow('middle', index))}
      {scheduleSkeletonRow('bottom', 'bottom')}
    </Stack>
  );
}
