'use client';

import * as React from 'react';
import { useTranslation } from '@/app/i18n/client';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
// MUI
import AccountCircle from '@mui/icons-material/AccountCircle';
import Avatar from '@mui/material/Avatar';
import { useGetUser } from '@/hooks/useUser';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import { brown } from '@mui/material/colors';

export default function AccountMenu({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'app-bar');
  const { signOutRedirect } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [initials, setInitials] = React.useState<string | null>(null);

  const getUser = useGetUser();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await getUser();
        if (!mounted) return;
        const parts = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        if (parts) {
          const names = parts.split(' ');
          const first = names[0]?.[0] ?? '';
          const last = names.length > 1 ? names[names.length - 1][0] : '';
          setInitials((first + last).toUpperCase());
        } else if (u.email) {
          setInitials(u.email[0].toUpperCase());
        }
      } catch (err) {
        // ignore — fall back to icon
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getUser]);

  const links: { name: string; label: string; href: string }[] = [
    {
      name: 'settings',
      label: t('settings'),
      href: `/${lng}/plan/settings/`,
    },
  ];

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setAnchorEl(null);

      // Use the existing signOutRedirect method from your auth context
      signOutRedirect(lng);
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <IconButton
        size="large"
        aria-label="account of current user"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        onClick={handleMenu}
        // sx={{ color: "grey.700" }}
      >
        {initials ? (
          <Avatar
            sx={{
              width: 35,
              height: 35,
              bgcolor: brown[300],
              fontSize: 16,
            }}
          >
            {initials}
          </Avatar>
        ) : (
          <AccountCircle />
        )}
      </IconButton>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {links.map((link) => {
          return (
            <MenuItem key={link.name} component={Link} href={link.href} onClick={handleClose}>
              {link.label}
            </MenuItem>
          );
        })}
        <MenuItem onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              {t('signing_out')}
            </>
          ) : (
            t('sign_out')
          )}
        </MenuItem>
      </Menu>
    </div>
  );
}
