'use client';

import * as React from 'react';
import { useTranslation } from '@/app/i18n/client';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { CircleUser, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Theme selection deactivated during development — Re-enable: uncomment import and JSX below
// import ThemeSelector from '@/components/theme-toggle';
import { useGetUser } from '@/hooks/useUser';
import { useUser } from '@/context/UserContext';
import { env } from '@/config/env';

export default function AccountMenu({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'app-bar');
  const { signOutRedirect } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [initials, setInitials] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const getUser = useGetUser();
  const { user } = useUser();
  const isSuperAdmin = env.isDevelopment || user?.systemRole === 'super_admin';

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
      } catch {
        // ignore — fall back to icon
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getUser]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setOpen(false);
      // Use the existing signOutRedirect method from your auth context
      signOutRedirect(lng);
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="account of current user"
          className="size-9 rounded-full"
        >
          {initials ? (
            <Avatar size="default" className="size-9">
              <AvatarFallback className="bg-amber-300 text-sm text-amber-900 dark:bg-amber-700 dark:text-amber-100">
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <CircleUser className="size-5 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/${lng}/plan/settings/`}>{t('settings')}</Link>
        </DropdownMenuItem>
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${lng}/admin/users`}>Admin</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('signing_out')}
            </>
          ) : (
            t('sign_out')
          )}
        </DropdownMenuItem>
        {/* <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <ThemeSelector lng={lng} variant="compact" />
        </div> */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
