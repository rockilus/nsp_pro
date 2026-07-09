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

/** A single field-level change proposed by a Tier-2 update. */
export interface PendingActionChange {
  field: string;
  label: string;
  old: unknown;
  new: unknown;
}

export interface PendingActionPreview {
  entity: string;
  entity_id: string;
  entity_name?: string;
  changes?: PendingActionChange[];
}

/**
 * A prepared write awaiting the user's explicit confirmation.
 *
 * `actionToken` is a short-lived signed token binding the approving user, the
 * tool, and a hash of `toolArgs`. It must be sent back verbatim to confirm.
 */
export interface PendingAction {
  actionToken: string;
  tier: 'update' | 'delete';
  toolName: string;
  toolArgs: Record<string, unknown>;
  preview: PendingActionPreview;
}

export interface CopilotChatResponse {
  response: string;
  pendingAction: PendingAction | null;
}

export interface CopilotConfirmResponse {
  status: string;
  message: string;
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

    const raw = await this.makeRequest<{
      response: string;
      pending_action: {
        action_token: string;
        tier: 'update' | 'delete';
        tool_name: string;
        tool_args: Record<string, unknown>;
        preview: PendingActionPreview;
      } | null;
    }>(apiClient, 'post', '/copilot/chat', {
      message: request.message,
      history: request.history ?? [],
      team_id: request.teamId ?? null,
      schedule_id: request.scheduleId ?? null,
    });

    const pa = raw.pending_action;
    return {
      response: raw.response,
      pendingAction: pa
        ? {
            actionToken: pa.action_token,
            tier: pa.tier,
            toolName: pa.tool_name,
            toolArgs: pa.tool_args,
            preview: pa.preview,
          }
        : null,
    };
  }

  /**
   * Confirm and execute a previously previewed write action.
   *
   * The signed `actionToken` is the authority to run these exact arguments;
   * the backend rejects the request if the arguments were altered in flight.
   */
  static async confirmAction(
    apiClient: AuthenticatedApiClient,
    pendingAction: PendingAction,
  ): Promise<CopilotConfirmResponse> {
    return this.makeRequest<CopilotConfirmResponse>(apiClient, 'post', '/copilot/actions/confirm', {
      action_token: pendingAction.actionToken,
      tool_name: pendingAction.toolName,
      tool_args: pendingAction.toolArgs,
    });
  }
}
