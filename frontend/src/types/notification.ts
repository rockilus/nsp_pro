/**
 * Types for in-app notifications
 */
import dayjs from "dayjs";

export type NotificationTypeT =
  | "schedule_published"
  | "user_created_request"
  | "new_swap_request"
  | "swap_status_changed"
  | "user_accepted_request"
  | "user_denied_request"
  | "assignment_changed"
  | "user_received_team_invite"
  | "user_accepted_team_invite"
  | "user_removed_from_team"
  | "user_left_team";

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
  | "schedule_published"
  | "user_created_request"
  | "swap_requests"
  | "user_accepted_request"
  | "user_denied_request"
  | "assignment_changes"
  | "user_received_team_invite"
  | "user_accepted_team_invite"
  | "user_removed_from_team"
  | "user_left_team";

export const NOTIFICATION_KEYS: NotificationKey[] = [
  "schedule_published",
  "user_created_request",
  "swap_requests",
  "user_accepted_request",
  "user_denied_request",
  "assignment_changes",
  "user_received_team_invite",
  "user_accepted_team_invite",
  "user_removed_from_team",
  "user_left_team",
];

export type NotificationCategory =
  | "schedule"
  | "requests"
  | "assignments"
  | "team";

export type NotificationKeyMeta = {
  category: NotificationCategory;
};

export const NOTIFICATION_REGISTRY: Record<
  NotificationKey,
  NotificationKeyMeta
> = {
  schedule_published: { category: "schedule" },
  user_created_request: { category: "requests" },
  swap_requests: { category: "requests" },
  user_accepted_request: { category: "requests" },
  user_denied_request: { category: "requests" },
  assignment_changes: { category: "assignments" },
  user_received_team_invite: { category: "team" },
  user_accepted_team_invite: { category: "team" },
  user_removed_from_team: { category: "team" },
  user_left_team: { category: "team" },
};

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  "schedule",
  "requests",
  "assignments",
  "team",
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

export function toNotificationPreferencesT(
  data: any,
): NotificationPreferencesT {
  const rawPrefs: Record<string, any> = data.preferences ?? {};
  const preferences = Object.fromEntries(
    NOTIFICATION_KEYS.map((key) => {
      const ch = rawPrefs[key];
      return [key, { email: ch?.email ?? true, inApp: ch?.inApp ?? true }];
    }),
  ) as Record<NotificationKey, ChannelPreferences>;
  return { userId: data.userId, preferences };
}

export function fromNotificationPreferencesT(
  prefs: NotificationPreferencesT,
): any {
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
