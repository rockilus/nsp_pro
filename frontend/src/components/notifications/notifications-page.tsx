"use client";

import React from "react";
import { useTranslation } from "@/app/i18n/client";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/app/lib/hooks/useNotifications";
import NotificationItem from "./notification-item";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

const PAGE_LIMIT = 50;

export default function NotificationsPage({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "notifications");
  const { data, isLoading } = useNotifications(PAGE_LIMIT, 0);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      data-testid="notifications-page"
      sx={{
        maxWidth: 680,
        mx: "auto",
        mt: 3,
        px: 2,
        maxHeight: "calc(100vh - 64px)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {t("title")}
        </Typography>
      </Box>

      {notifications.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          {t("no_notifications")}
        </Typography>
      )}

      {/* Unread section */}
      {unread.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {unread.map((n) => (
            <React.Fragment key={n.id}>
              <NotificationItem
                notification={n}
                lng={lng}
                onRead={(id) => markRead.mutate(id)}
                onDelete={(id) => deleteNotification.mutate(id)}
              />
              <Divider />
            </React.Fragment>
          ))}
        </Box>
      )}

      {/* Read section */}
      {read.length > 0 && (
        <Box>
          {read.map((n) => (
            <React.Fragment key={n.id}>
              <NotificationItem
                notification={n}
                lng={lng}
                onDelete={(id) => deleteNotification.mutate(id)}
              />
              <Divider />
            </React.Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
}
