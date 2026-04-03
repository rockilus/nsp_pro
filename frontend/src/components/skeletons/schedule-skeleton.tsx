import * as React from 'react';
// MUI
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
// Components
import BaseTableSkeleton from './base-table-skeleton';
import WeeklyCalendarSkeleton from './weekly-calendar-skeleton';
import ScheduleTableSkeleton from './schedule-table-skeleton';
import TablesSkeleton from './tables-skeleton';

export default function ScheduleSkeleton() {
  return (
    <Box
      sx={{
        margin: 2,
      }}
    >
      <Stack direction="row" spacing="16px">
        <Box sx={{ width: '200px' }}>
          <Stack spacing="16px">
            <BaseTableSkeleton numInternalRows={5} />
            <BaseTableSkeleton numInternalRows={2} />
          </Stack>
        </Box>
        <ScheduleTableSkeleton />
      </Stack>
    </Box>
  );
}
