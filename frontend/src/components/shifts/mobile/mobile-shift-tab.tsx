'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MobileNavAppBar from '@/components/app-bar/mobile-nav-app-bar';

export default function MobileShiftTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  return (
    <>
      <MobileNavAppBar lng={lng} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 64px)',
          padding: 3,
        }}
      >
        <Typography variant="h5" color="text.secondary">
          Coming soon
        </Typography>
      </Box>
    </>
  );
}
