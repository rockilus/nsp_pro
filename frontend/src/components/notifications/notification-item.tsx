'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/app/i18n/client';
import { NotificationT } from '@/types/notification';
import { getNotificationTargetPath } from '@/app/lib/utils/getNotificationTargetPath';
import dayjs, { Dayjs } from 'dayjs';
// MUI
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface NotificationItemProps {
  notification: NotificationT;
  lng: string;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

function getMessageKey(type: NotificationT['type']): string {
  switch (type) {
    case 'user_published_schedule':
      return 'user_published_schedule';
    case 'user_accepted_request':
      return 'user_accepted_request';
    case 'user_denied_request':
      return 'user_denied_request';
    case 'user_created_request':
      return 'user_created_request';
    case 'user_created_assignment':
      return 'user_created_assignment';
    case 'user_updated_assignment':
      return 'user_updated_assignment';
    case 'user_deleted_assignment':
      return 'user_deleted_assignment';
    case 'user_received_team_invite':
      return 'user_received_team_invite';
    case 'user_accepted_team_invite':
      return 'user_accepted_team_invite';
    case 'user_removed_from_team':
      return 'user_removed_from_team';
    case 'user_left_team':
      return 'user_left_team';
    case 'user_created_direct_swap':
      return 'user_created_direct_swap';
    case 'user_accepted_direct_swap':
      return 'user_accepted_direct_swap';
    case 'user_refused_direct_swap':
      return 'user_refused_direct_swap';
    case 'user_created_open_swap':
      return 'user_created_open_swap';
    case 'user_bid_open_swap':
      return 'user_bid_open_swap';
    case 'user_selected_bid_open_swap':
      return 'user_selected_bid_open_swap';
    case 'user_selected_other_bid_open_swap':
      return 'user_selected_other_bid_open_swap';
    case 'swap_ready_for_review':
      return 'swap_ready_for_review';
    case 'user_validated_swap':
      return 'user_validated_swap';
    case 'user_denied_swap':
      return 'user_denied_swap';
    case 'user_reversed_swap':
      return 'user_reversed_swap';
    case 'campaign_request_deadline_set':
      return 'campaign_request_deadline_set';
    case 'campaign_request_deadline_reminder':
      return 'campaign_request_deadline_reminder';
    case 'campaign_request_deadline_updated':
      return 'campaign_request_deadline_updated';
    default:
      return 'user_published_schedule';
  }
}

function getRelativeTime(createdAt: Dayjs): string {
  const now = dayjs();
  const minutes = now.diff(createdAt, 'minute');
  if (minutes < 60) return `${minutes}m`;
  const hours = now.diff(createdAt, 'hour');
  if (hours < 24) return `${hours}h`;
  const days = now.diff(createdAt, 'day');
  if (days < 7) return `${days}d`;
  const weeks = now.diff(createdAt, 'week');
  if (weeks < 4) return `${weeks}w`;
  return createdAt.format('DD MMM YYYY');
}

export default function NotificationItem({
  notification,
  lng,
  onRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const { t } = useTranslation(lng, 'notifications');
  const targetPath = getNotificationTargetPath(notification, lng);
  const messageKey = getMessageKey(notification.type);
  let eventData: Record<string, string> = notification.eventData;
  if (notification.type === 'user_published_schedule') {
    eventData = { ...eventData };
    if (eventData.startDate) eventData.startDate = dayjs(eventData.startDate).format('DD/MM/YYYY');
    if (eventData.endDate) eventData.endDate = dayjs(eventData.endDate).format('DD/MM/YYYY');
  }
  // Format campaign request deadline fields for display
  if (
    notification.type === 'campaign_request_deadline_set' ||
    notification.type === 'campaign_request_deadline_reminder' ||
    notification.type === 'campaign_request_deadline_updated'
  ) {
    eventData = { ...eventData };
    // camelCased keys arrive at the frontend (scheduleStartDate, scheduleEndDate)
    if (eventData.scheduleStartDate)
      eventData.scheduleStartDate = dayjs(eventData.scheduleStartDate).format('DD/MM/YYYY');
    if (eventData.scheduleEndDate)
      eventData.scheduleEndDate = dayjs(eventData.scheduleEndDate).format('DD/MM/YYYY');
    // periodName for human-friendly period label
    if (eventData.scheduleStartDate && eventData.scheduleEndDate)
      eventData.periodName = `${eventData.scheduleStartDate} - ${eventData.scheduleEndDate}`;
    // deadline date/time
    if (eventData.deadlineDate) {
      const d = dayjs(eventData.deadlineDate);
      eventData.deadlineDate = d.format('DD/MM/YYYY');
      eventData.deadlineTime = d.format('HH:mm');
    }
    // updated deadlines
    if (eventData.newDeadlineDate) {
      const nd = dayjs(eventData.newDeadlineDate);
      eventData.newDeadlineDate = nd.format('DD/MM/YYYY');
      eventData.newDeadlineTime = nd.format('HH:mm');
    }
    if (eventData.oldDeadlineDate) {
      const od = dayjs(eventData.oldDeadlineDate);
      eventData.oldDeadlineDate = od.format('DD/MM/YYYY');
      eventData.oldDeadlineTime = od.format('HH:mm');
    }
  }
  const message = t(messageKey, eventData as any) as string;
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setMenuAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchorEl(null);

  const handleClick = () => {
    if (!notification.read && onRead) {
      onRead(notification.id);
    }
  };

  return (
    <Box
      data-testid="notification-item"
      data-read={String(notification.read)}
      data-notification-type={notification.type}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        px: compact ? 1 : 2,
        py: 1,
        backgroundColor: notification.read ? 'transparent' : 'rgba(25,118,210,0.05)',
        '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' },
      }}
    >
      <Link
        href={targetPath}
        onClick={handleClick}
        style={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
      >
        <Typography
          data-testid="notification-message"
          variant={compact ? 'body2' : 'body1'}
          fontWeight={notification.read ? 400 : 600}
          sx={{ lineHeight: 1.4 }}
        >
          {message}
        </Typography>
      </Link>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          ml: 1,
        }}
      >
        <Typography data-testid="notification-time-since" variant="caption" color="text.secondary">
          {getRelativeTime(notification.createdAt)}
        </Typography>
        {!compact && (onRead || onDelete) && (
          <>
            <IconButton
              data-testid="notification-item-menu-button"
              size="small"
              onClick={handleMenuOpen}
              aria-label="notification actions"
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {onRead && (
                <MenuItem
                  data-testid="notification-mark-read-button"
                  onClick={() => {
                    onRead(notification.id);
                    handleMenuClose();
                  }}
                >
                  <ListItemText>{t('mark_as_read')}</ListItemText>
                </MenuItem>
              )}
              {onDelete && (
                <MenuItem
                  data-testid="notification-delete-button"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(notification.id);
                    handleMenuClose();
                  }}
                >
                  <ListItemText>{t('delete')}</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>
    </Box>
  );
}
