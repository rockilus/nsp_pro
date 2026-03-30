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
    case "user_created_request":
      return `${base}/requests`;
    case "new_swap_request":
    case "swap_status_changed":
      return `${base}/swaps`;
    case "user_accepted_request":
    case "user_denied_request":
      return `${base}/requests`;
    case "assignment_changed":
      return `${base}/schedule`;
    case "user_received_team_invite":
    case "user_accepted_team_invite":
    case "user_removed_from_team":
    case "user_left_team":
      return `${base}/settings/teams`;
    default:
      return `${base}/schedule`;
  }
}
