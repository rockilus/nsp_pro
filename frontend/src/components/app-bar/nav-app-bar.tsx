'use client';

import * as React from 'react';
// Components
import AccountMenu from './account-menu';
import NavLinks from './nav-links';
import NotificationBell from './notification-bell';
// Context
import { useTeam } from '@/context/TeamContext';

const logoWidthOriginal = 753;
const logoHeightOriginal = 98;
const logoAdjustFactor = 0.2;
const logoWidth = logoWidthOriginal * logoAdjustFactor;
const logoHeight = logoHeightOriginal * logoAdjustFactor;

const NavAppBar = ({ lng }: { lng: string }) => {
  const { selectedTeam } = useTeam();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <nav className="flex h-16 items-center justify-between px-3">
        {/* Left: Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/rockilus_logo_blue.jpg"
          alt="logo"
          width={logoWidth}
          height={logoHeight}
          className="shrink-0"
        />

        {/* Center: Navigation tabs */}
        <div className="flex flex-1 justify-center">
          <NavLinks lng={lng} selectedTeam={selectedTeam} />
        </div>

        {/* Right: Notification bell + Account menu */}
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell lng={lng} />
          <AccountMenu lng={lng} />
        </div>
      </nav>
    </header>
  );
};
export default NavAppBar;
