/**
 * Types for in-app notifications
 */
import dayjs from 'dayjs';

export type NotificationTypeT =
  | 'user_published_schedule'
  | 'user_created_request'
  | 'user_accepted_request'
  | 'user_denied_request'
  | 'user_created_assignment'
  | 'user_updated_assignment'
  | 'user_deleted_assignment'
  | 'user_received_team_invite'
  | 'user_accepted_team_invite'
  | 'user_removed_from_team'
  | 'user_left_team'
  | 'user_created_direct_swap'
  | 'user_accepted_direct_swap'
  | 'user_refused_direct_swap'
  | 'user_created_open_swap'
  | 'user_bid_open_swap'
  | 'user_selected_bid_open_swap'
  | 'user_selected_other_bid_open_swap'
  | 'swap_ready_for_review'
  | 'user_validated_swap'
  | 'user_denied_swap'
  | 'user_reversed_swap'
  | 'campaign_request_deadline_set'
  | 'campaign_request_deadline_reminder'
  | 'campaign_request_deadline_extended';

export type NotificationT = {
  id: string;
  userId: string;
  teamId: string;
  type: NotificationTypeT;
  eventData: Record<string, string>;
  read: boolean;
  createdAt: dayjs.Dayjs;
  updatedAt: dayjs.Dayjs;
  readAt: dayjs.Dayjs | null;
  seenAt: dayjs.Dayjs | null;
};

export type NotificationKey =
  | 'user_published_schedule'
  | 'user_created_request'
  | 'user_accepted_request'
  | 'user_denied_request'
  | 'user_created_assignment'
  | 'user_updated_assignment'
  | 'user_deleted_assignment'
  | 'user_received_team_invite'
  | 'user_accepted_team_invite'
  | 'user_removed_from_team'
  | 'user_left_team'
  | 'user_created_direct_swap'
  | 'user_accepted_direct_swap'
  | 'user_refused_direct_swap'
  | 'user_created_open_swap'
  | 'user_bid_open_swap'
  | 'user_selected_bid_open_swap'
  | 'user_selected_other_bid_open_swap'
  | 'swap_ready_for_review'
  | 'user_validated_swap'
  | 'user_denied_swap'
  | 'user_reversed_swap'
  | 'campaign_request_deadline_set'
  | 'campaign_request_deadline_reminder'
  | 'campaign_request_deadline_extended';

export const NOTIFICATION_KEYS: NotificationKey[] = [
  'user_published_schedule',
  'user_created_request',
  'user_accepted_request',
  'user_denied_request',
  'user_created_assignment',
  'user_updated_assignment',
  'user_deleted_assignment',
  'user_received_team_invite',
  'user_accepted_team_invite',
  'user_removed_from_team',
  'user_left_team',
  'user_created_direct_swap',
  'user_accepted_direct_swap',
  'user_refused_direct_swap',
  'user_created_open_swap',
  'user_bid_open_swap',
  'user_selected_bid_open_swap',
  'user_selected_other_bid_open_swap',
  'swap_ready_for_review',
  'user_validated_swap',
  'user_denied_swap',
  'user_reversed_swap',
  'campaign_request_deadline_set',
  'campaign_request_deadline_reminder',
  'campaign_request_deadline_extended',
];

export type NotificationCategory = 'schedule' | 'requests' | 'assignments' | 'team' | 'swaps';

export type NotificationKeyMeta = {
  category: NotificationCategory;
};

export const NOTIFICATION_REGISTRY: Record<NotificationKey, NotificationKeyMeta> = {
  user_published_schedule: { category: 'schedule' },
  user_created_request: { category: 'requests' },
  user_accepted_request: { category: 'requests' },
  user_denied_request: { category: 'requests' },
  user_created_assignment: { category: 'assignments' },
  user_updated_assignment: { category: 'assignments' },
  user_deleted_assignment: { category: 'assignments' },
  user_received_team_invite: { category: 'team' },
  user_accepted_team_invite: { category: 'team' },
  user_removed_from_team: { category: 'team' },
  user_left_team: { category: 'team' },
  user_created_direct_swap: { category: 'swaps' },
  user_accepted_direct_swap: { category: 'swaps' },
  user_refused_direct_swap: { category: 'swaps' },
  user_created_open_swap: { category: 'swaps' },
  user_bid_open_swap: { category: 'swaps' },
  user_selected_bid_open_swap: { category: 'swaps' },
  user_selected_other_bid_open_swap: { category: 'swaps' },
  swap_ready_for_review: { category: 'swaps' },
  user_validated_swap: { category: 'swaps' },
  user_denied_swap: { category: 'swaps' },
  user_reversed_swap: { category: 'swaps' },
  campaign_request_deadline_set: { category: 'schedule' },
  campaign_request_deadline_reminder: { category: 'schedule' },
  campaign_request_deadline_extended: { category: 'schedule' },
};

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  'schedule',
  'requests',
  'assignments',
  'team',
  'swaps',
];

export type ChannelPreferences = { email: boolean; inApp: boolean };

export type NotificationPreferencesT = {
  userId: string;
  preferences: Record<NotificationKey, ChannelPreferences>;
};

export function toNotificationT(data: any): NotificationT {
  return {
    id: data.id,
    userId: data.userId,
    teamId: data.teamId,
    type: data.type as NotificationTypeT,
    eventData: data.eventData ?? {},
    read: data.read ?? false,
    createdAt: dayjs(data.createdAt),
    updatedAt: dayjs(data.updatedAt),
    readAt: data.readAt ? dayjs(data.readAt) : null,
    seenAt: data.seenAt ? dayjs(data.seenAt) : null,
  };
}

export function toNotificationPreferencesT(data: any): NotificationPreferencesT {
  const rawPrefs: Record<string, any> = data.preferences ?? {};
  const preferences = Object.fromEntries(
    NOTIFICATION_KEYS.map((key) => {
      const ch = rawPrefs[key];
      return [key, { email: ch?.email ?? true, inApp: ch?.inApp ?? true }];
    }),
  ) as Record<NotificationKey, ChannelPreferences>;
  return { userId: data.userId, preferences };
}

export function fromNotificationPreferencesT(prefs: NotificationPreferencesT): any {
  return {
    userId: prefs.userId,
    preferences: Object.fromEntries(
      NOTIFICATION_KEYS.map((key) => {
        const ch = prefs.preferences[key];
        return [key, { email: ch.email, inApp: ch.inApp }];
      }),
    ),
  };
}
