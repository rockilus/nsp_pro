/**
 * Types for in-app notifications
 */
import dayjs from "dayjs";

export type NotificationTypeT =
  | "schedule_published"
  | "new_swap_request"
  | "swap_status_changed"
  | "request_status_changed"
  | "assignment_changed";

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
};

export type NotificationKey =
  | "schedule_published"
  | "swap_requests"
  | "request_decisions"
  | "assignment_changes";

export const NOTIFICATION_KEYS: NotificationKey[] = [
  "schedule_published",
  "swap_requests",
  "request_decisions",
  "assignment_changes",
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
