"use client";

import React, { useState } from "react";
import Link from "next/link";
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
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Typography from "@mui/material/Typography";

const PAGE_LIMIT = 50;

export default function NotificationsPage({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "notifications");
  const { data, isLoading } = useNotifications(PAGE_LIMIT, 0);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setMenuAnchorEl(event.currentTarget);
  const handleMenuClose = () => setMenuAnchorEl(null);

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
        pt: "20px",
        px: 2,
        maxHeight: "calc(100vh - 64px)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {t("title")}
        </Typography>
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label="notification options"
          data-testid="notifications-page-menu-button"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              markAllRead.mutate();
              handleMenuClose();
            }}
            disabled={unread.length === 0}
            data-testid="notifications-page-mark-all-read"
          >
            <ListItemText>{t("mark_all_read")}</ListItemText>
          </MenuItem>
          <MenuItem
            component={Link}
            href={`/${lng}/plan/settings/notifications`}
            onClick={handleMenuClose}
            data-testid="notifications-page-open-settings"
          >
            <ListItemText>{t("notification_settings")}</ListItemText>
          </MenuItem>
        </Menu>
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
