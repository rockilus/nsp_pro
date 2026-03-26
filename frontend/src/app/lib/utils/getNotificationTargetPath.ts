import { NotificationT } from "../../../types/notification";

/**
 * Derives the navigation target URL for a notification.
 * No URL is stored in the DB — this is purely frontend-derived.
 */
export function getNotificationTargetPath(
  notification: NotificationT,
  lng: string,
): string {
  const base = `/${lng}/plan`;
  switch (notification.type) {
    case "schedule_published":
      return `${base}/schedule?scheduleId=${notification.eventData.schedule_id ?? ""}`;
    case "new_swap_request":
    case "swap_status_changed":
      return `${base}/swaps`;
    case "request_status_changed":
      return `${base}/requests`;
    case "assignment_changed":
      return `${base}/schedule`;
    case "team_invite_received":
    case "team_invite_accepted":
    case "member_removed":
    case "member_left":
      return `${base}/settings/team`;
    default:
      return `${base}/schedule`;
  }
}
