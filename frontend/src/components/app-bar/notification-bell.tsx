'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/app/i18n/client';
import { Bell, Ellipsis } from 'lucide-react';
import {
  useUnseenNotificationCount,
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkAllNotificationsSeen,
  useReadSeenBefore,
  SEEN_GRACE_PERIOD_HOURS,
} from '@/app/lib/hooks/useNotifications';
import NotificationItem from '@/components/notifications/notification-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

const POPOVER_LIMIT = 5;

export default function NotificationBell({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'notifications');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnseenNotificationCount();
  const { data, refetch } = useNotifications(POPOVER_LIMIT, 0);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const markAllSeen = useMarkAllNotificationsSeen();
  const readSeenBefore = useReadSeenBefore();

  const notifications = data?.notifications ?? [];
  const displayCount = unreadCount > 99 ? 99 : unreadCount;

  // Auto-read notifications that were seen more than SEEN_GRACE_PERIOD_HOURS ago
  useEffect(() => {
    if (!data?.notifications?.length) return;
    const graceCutoff = new Date(
      Date.now() - SEEN_GRACE_PERIOD_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const hasOldSeen = data.notifications.some(
      (n) => n.seenAt !== null && !n.read && n.seenAt.toDate() <= new Date(graceCutoff),
    );
    if (hasOldSeen) {
      readSeenBefore.mutate(graceCutoff);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (open) {
      refetch();
      markAllSeen.mutate();
    }
  };

  const handleMarkAll = () => {
    markAllRead.mutate();
  };

  const handleRead = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('title')}
          data-testid="notification-bell-button"
          className="relative"
        >
          <Bell className="size-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              data-testid="notification-badge-count"
              className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] leading-none"
            >
              {displayCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="max-h-120 w-90 p-0"
        data-testid="notification-bell-popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">{t('title')}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="notification options"
                data-testid="notification-bell-menu-button"
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem
                onClick={handleMarkAll}
                data-testid="notification-bell-mark-all-read"
              >
                {t('mark_all_read')}
              </DropdownMenuItem>
              <DropdownMenuItem asChild data-testid="notification-bell-open-settings">
                <Link
                  href={`/${lng}/plan/settings/notifications`}
                  onClick={() => setPopoverOpen(false)}
                >
                  {t('notification_settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild data-testid="notification-bell-open-notifications">
                <Link href={`/${lng}/plan/notifications`} onClick={() => setPopoverOpen(false)}>
                  {t('open_notifications')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator />

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <span className="text-sm text-muted-foreground" data-testid="notification-bell-empty">
              {t('no_notifications')}
            </span>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} lng={lng} onRead={handleRead} compact />
          ))
        )}

        <Separator />
        {/* See all link */}
        <div className="px-4 py-2.5 text-center" data-testid="notification-bell-see-all">
          <Link
            href={`/${lng}/plan/notifications`}
            onClick={() => setPopoverOpen(false)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('see_all')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
