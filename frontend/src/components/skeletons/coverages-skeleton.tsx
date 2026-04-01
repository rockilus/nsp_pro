import * as React from 'react';
// MUI
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
// Components
import BaseTableSkeleton from './base-table-skeleton';
import WeeklyCalendarSkeleton from './weekly-calendar-skeleton';

export default function CoveragesSkeleton() {
  return (
    <Box
      sx={{
        margin: 2,
      }}
    >
      <Stack direction="row" spacing="16px">
        <Box sx={{ width: '200px' }}>
          <BaseTableSkeleton numInternalRows={5} />
        </Box>
        <WeeklyCalendarSkeleton />
      </Stack>
    </Box>
  );
}
