"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/app/i18n/client";
import {
  useUnreadNotificationCount,
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/app/lib/hooks/useNotifications";
import NotificationItem from "@/components/notifications/notification-item";
// MUI
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";

const POPOVER_LIMIT = 5;

export default function NotificationBell({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "notifications");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data, refetch } = useNotifications(POPOVER_LIMIT, 0);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const displayCount = unreadCount > 99 ? 99 : unreadCount;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    refetch();
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkAll = () => {
    markAllRead.mutate();
  };

  const handleRead = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        aria-label={t("title")}
        data-testid="notification-bell-button"
      >
        <Badge
          badgeContent={displayCount}
          color="error"
          invisible={unreadCount === 0}
          max={99}
          slotProps={{
            badge: { "data-testid": "notification-badge-count" } as any,
          }}
        >
          <NotificationsIcon sx={{ color: "text.secondary" }} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: { width: 360, maxHeight: 480 },
            "data-testid": "notification-bell-popover",
          } as any,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {t("title")}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAll}
              data-testid="notification-bell-mark-all-read"
            >
              {t("mark_all_read")}
            </Button>
          )}
        </Box>
        <Divider />

        {/* Notification list */}
        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography
              variant="body2"
              color="text.secondary"
              data-testid="notification-bell-empty"
            >
              {t("no_notifications")}
            </Typography>
          </Box>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              lng={lng}
              onRead={handleRead}
              compact
            />
          ))
        )}

        <Divider />
        {/* See all link */}
        <Box
          sx={{ px: 2, py: 1, textAlign: "center" }}
          data-testid="notification-bell-see-all"
        >
          <Link
            href={`/${lng}/plan/notifications`}
            onClick={handleClose}
            style={{ textDecoration: "none" }}
          >
            <Typography variant="body2" color="primary">
              {t("see_all")}
            </Typography>
          </Link>
        </Box>
      </Popover>
    </>
  );
}
