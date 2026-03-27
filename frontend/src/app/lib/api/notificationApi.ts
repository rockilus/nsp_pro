/**
 * API client for notification management
 */

import {
  NotificationT,
  NotificationPreferencesT,
  toNotificationT,
  toNotificationPreferencesT,
} from "../../../types/notification";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export interface NotificationsResponse {
  notifications: NotificationT[];
  unreadCount: number;
}

export class NotificationApi extends BaseApi {
  static async getMyNotifications(
    apiClient: AuthenticatedApiClient,
    limit = 20,
    skip = 0,
  ): Promise<NotificationsResponse> {
    const data = await this.makeRequest<any>(
      apiClient,
      "get",
      `/notifications/me?limit=${limit}&skip=${skip}`,
    );
    return {
      notifications: (data.notifications ?? []).map(toNotificationT),
      unreadCount: data.unreadCount ?? 0,
    };
  }

  static async getUnseenCount(
    apiClient: AuthenticatedApiClient,
  ): Promise<number> {
    const data = await this.makeRequest<any>(
      apiClient,
      "get",
      "/notifications/me/unseen-count",
    );
    return data.count ?? 0;
  }

  static async getUnreadCount(
    apiClient: AuthenticatedApiClient,
  ): Promise<number> {
    const data = await this.makeRequest<any>(
      apiClient,
      "get",
      "/notifications/me/unread-count",
    );
    return data.count ?? 0;
  }

  static async markRead(
    apiClient: AuthenticatedApiClient,
    id: string,
  ): Promise<NotificationT> {
    const data = await this.makeRequest<any>(
      apiClient,
      "put",
      `/notifications/${id}/read`,
    );
    return toNotificationT(data);
  }

  static async markAllRead(apiClient: AuthenticatedApiClient): Promise<void> {
    await this.makeRequest<any>(
      apiClient,
      "post",
      "/notifications/me/read-all",
    );
  }

  static async deleteNotification(
    apiClient: AuthenticatedApiClient,
    id: string,
  ): Promise<void> {
    await this.makeRequest<any>(apiClient, "delete", `/notifications/${id}`);
  }

  static async markAllSeen(apiClient: AuthenticatedApiClient): Promise<void> {
    await this.makeRequest<any>(
      apiClient,
      "post",
      "/notifications/me/mark-all-seen",
    );
  }

  static async readSeenBefore(
    apiClient: AuthenticatedApiClient,
    before: string,
  ): Promise<number> {
    const data = await this.makeRequest<any>(
      apiClient,
      "post",
      "/notifications/me/read-seen-before",
      { before },
    );
    return data.updated ?? 0;
  }

  static async getNotificationPreferences(
    apiClient: AuthenticatedApiClient,
  ): Promise<NotificationPreferencesT> {
    const data = await this.makeRequest<any>(
      apiClient,
      "get",
      "/users/me/notification-preferences",
    );
    return toNotificationPreferencesT(data);
  }

  static async updateNotificationPreferences(
    apiClient: AuthenticatedApiClient,
    prefs: NotificationPreferencesT,
  ): Promise<NotificationPreferencesT> {
    const data = await this.makeRequest<any>(
      apiClient,
      "put",
      "/users/me/notification-preferences",
      prefs,
    );
    return toNotificationPreferencesT(data);
  }
}
