'use client';

import * as React from 'react';
import { useState } from 'react';
// MUI
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MenuIcon from '@mui/icons-material/Menu';
// Components
import AccountMenu from './account-menu';
import { NavLinksMobile } from './nav-links';
// Context
import { useTeam } from '@/context/TeamContext';

const logoWidthOriginal = 753;
const logoHeightOriginal = 98;
const logoAdjustFactor = 0.2;
const logoWidth = logoWidthOriginal * logoAdjustFactor;
const logoHeight = logoHeightOriginal * logoAdjustFactor;

const MobileNavAppBar = ({
  lng,
  mobileContent,
}: {
  lng: string;
  mobileContent?: React.ReactNode;
}) => {
  const { selectedTeam } = useTeam();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: 'white',
        boxShadow: 'none',
        borderBottom: '1px solid lightgray',
      }}
    >
      <Toolbar sx={{ height: '64px', padding: '0 12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <IconButton onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              ml: 1,
              mr: 1,
            }}
          >
            {mobileContent || (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/rockilus_logo_blue.jpg" alt="logo" width={logoWidth} height={logoHeight} />
            )}
          </Box>

          <AccountMenu lng={lng} />

          <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <Box sx={{ width: 260, p: 2 }} role="presentation" onClick={() => setDrawerOpen(false)}>
              <NavLinksMobile
                lng={lng}
                selectedTeam={selectedTeam}
                onClick={() => setDrawerOpen(false)}
              />
            </Box>
          </Drawer>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default MobileNavAppBar;
