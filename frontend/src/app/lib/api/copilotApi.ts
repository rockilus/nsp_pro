/**
 * API client for the AI copilot chat feature.
 *
 * The backend (`POST /copilot/chat`) is intentionally stateless: conversation
 * history and page context are supplied by the client on every request and are
 * never persisted server-side. The frontend owns storage.
 */

import { BaseApi, AuthenticatedApiClient } from './baseApi';

export type CopilotRole = 'user' | 'assistant';

export interface CopilotChatTurn {
  role: CopilotRole;
  content: string;
}

export interface CopilotChatRequest {
  message: string;
  history?: CopilotChatTurn[];
  teamId?: string | null;
  scheduleId?: string | null;
}

export interface CopilotChatResponse {
  response: string;
}

export class CopilotApi extends BaseApi {
  /**
   * Send a chat message to the copilot (authenticated).
   *
   * `history` and the active `teamId`/`scheduleId` are forwarded so the agent
   * can answer follow-ups and target the right entities without the user
   * typing technical identifiers.
   */
  static async chat(
    apiClient: AuthenticatedApiClient,
    request: CopilotChatRequest,
  ): Promise<CopilotChatResponse> {
    if (!request.message || request.message.trim().length === 0) {
      throw new Error('Message is required');
    }

    return this.makeRequest<CopilotChatResponse>(apiClient, 'post', '/copilot/chat', {
      message: request.message,
      history: request.history ?? [],
      team_id: request.teamId ?? null,
      schedule_id: request.scheduleId ?? null,
    });
  }
}
