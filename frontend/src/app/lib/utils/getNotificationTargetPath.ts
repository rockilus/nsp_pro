import { NotificationT } from '../../../types/notification';

/**
 * Derives the navigation target URL for a notification.
 * No URL is stored in the DB — this is purely frontend-derived.
 */
export function getNotificationTargetPath(notification: NotificationT, lng: string): string {
  const base = `/${lng}/plan`;
  switch (notification.type) {
    case 'user_published_schedule':
      return `${base}/schedule?scheduleId=${notification.eventData.schedule_id ?? ''}`;
    case 'user_created_request':
      return `${base}/requests`;
    case 'user_accepted_request':
    case 'user_denied_request':
      return `${base}/requests`;
    case 'user_created_assignment':
    case 'user_updated_assignment':
    case 'user_deleted_assignment':
      return `${base}/schedule`;
    case 'user_received_team_invite':
    case 'user_accepted_team_invite':
    case 'user_removed_from_team':
    case 'user_left_team':
      return `${base}/settings/teams`;
    case 'user_created_direct_swap':
    case 'user_accepted_direct_swap':
    case 'user_refused_direct_swap':
    case 'user_created_open_swap':
    case 'user_bid_open_swap':
    case 'user_selected_bid_open_swap':
    case 'user_selected_other_bid_open_swap':
    case 'swap_ready_for_review':
    case 'user_validated_swap':
    case 'user_denied_swap':
    case 'user_reversed_swap': {
      const swapId = notification.eventData.swap_id;
      return swapId ? `${base}/swaps?swapId=${swapId}` : `${base}/swaps`;
    }
    case 'campaign_request_deadline_set':
    case 'campaign_request_deadline_reminder':
    case 'campaign_request_deadline_extended':
      return `${base}/requests`;
    default:
      return `${base}/schedule`;
  }
}
