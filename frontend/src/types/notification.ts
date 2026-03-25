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

export type NotificationPreferencesT = {
  userId: string;
  emailEnabled: boolean;
  emailSchedulePublished: boolean;
  emailSwapRequests: boolean;
  emailRequestDecisions: boolean;
  emailAssignmentChanges: boolean;
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
  return {
    userId: data.userId,
    emailEnabled: data.emailEnabled ?? true,
    emailSchedulePublished: data.emailSchedulePublished ?? true,
    emailSwapRequests: data.emailSwapRequests ?? true,
    emailRequestDecisions: data.emailRequestDecisions ?? true,
    emailAssignmentChanges: data.emailAssignmentChanges ?? true,
  };
}

export function fromNotificationPreferencesT(
  prefs: NotificationPreferencesT,
): any {
  return {
    userId: prefs.userId,
    emailEnabled: prefs.emailEnabled,
    emailSchedulePublished: prefs.emailSchedulePublished,
    emailSwapRequests: prefs.emailSwapRequests,
    emailRequestDecisions: prefs.emailRequestDecisions,
    emailAssignmentChanges: prefs.emailAssignmentChanges,
  };
}
