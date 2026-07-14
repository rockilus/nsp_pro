'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
// Components
import AccountMenu from './account-menu';
import { NavLinksMobile } from './nav-links';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CopilotLauncherButton } from '@/components/copilot/copilot-launcher-button';
import { env } from '@/config/env';
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <nav className="flex h-16 items-center px-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-65 p-0" showCloseButton={false}>
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="text-base">Navigation</SheetTitle>
            </SheetHeader>
            <NavLinksMobile lng={lng} selectedTeam={selectedTeam} />
          </SheetContent>
        </Sheet>

        {/* Center: mobileContent or logo */}
        <div className="mr-2 ml-2 flex flex-1 items-center">
          {mobileContent || (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/rockilus_logo_blue.jpg" alt="logo" width={logoWidth} height={logoHeight} />
          )}
        </div>

        {/* Right: Copilot + Account menu */}
        <div className="flex shrink-0 items-center gap-1">
          {env.copilotEnabled && <CopilotLauncherButton lng={lng} />}
          <AccountMenu lng={lng} />
        </div>
      </nav>
    </header>
  );
};

export default MobileNavAppBar;
