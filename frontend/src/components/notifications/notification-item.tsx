"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/app/i18n/client";
import { NotificationT } from "@/types/notification";
import { getNotificationTargetPath } from "@/app/lib/utils/getNotificationTargetPath";
// MUI
import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

interface NotificationItemProps {
  notification: NotificationT;
  lng: string;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

function getMessageKey(type: NotificationT["type"]): string {
  switch (type) {
    case "schedule_published":
      return "schedule_published";
    case "new_swap_request":
      return "new_swap_request";
    case "swap_status_changed":
      return "swap_status_changed";
    case "request_status_changed":
      return "request_status_changed";
    case "assignment_changed":
      return "assignment_changed";
    case "user_received_team_invite":
      return "user_received_team_invite";
    case "user_accepted_team_invite":
      return "user_accepted_team_invite";
    case "user_removed_from_team":
      return "user_removed_from_team";
    case "user_left_team":
      return "user_left_team";
    default:
      return "schedule_published";
  }
}

export default function NotificationItem({
  notification,
  lng,
  onRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const { t } = useTranslation(lng, "notifications");
  const targetPath = getNotificationTargetPath(notification, lng);
  const messageKey = getMessageKey(notification.type);
  const message = t(messageKey, notification.eventData as any) as string;

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
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        px: compact ? 1 : 2,
        py: 1,
        backgroundColor: notification.read
          ? "transparent"
          : "rgba(25,118,210,0.05)",
        "&:hover": { backgroundColor: "rgba(0,0,0,0.03)" },
      }}
    >
      <Link
        href={targetPath}
        onClick={handleClick}
        style={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
      >
        <Typography
          data-testid="notification-message"
          variant={compact ? "body2" : "body1"}
          fontWeight={notification.read ? 400 : 600}
          sx={{ lineHeight: 1.4 }}
        >
          {message}
        </Typography>
        {!compact && (
          <Typography
            data-testid="notification-timestamp"
            variant="caption"
            color="text.secondary"
          >
            {notification.createdAt.format("DD MMM YYYY HH:mm")}
          </Typography>
        )}
      </Link>
      {!compact && onDelete && (
        <IconButton
          data-testid="notification-delete-button"
          size="small"
          onClick={(e) => {
            e.preventDefault();
            onDelete(notification.id);
          }}
          aria-label={t("delete")}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}
