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

export interface PlanStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  assignOutputTo: string | null;
  extractKey: string | null;
  description: string;
}

export interface CopilotPlan {
  complexity: string;
  summary: string;
  plan: PlanStep[];
}

export interface CompletedStep {
  step: number;
  status: 'completed' | 'pending_confirmation' | 'waiting';
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
  step?: number;
  applied?: boolean;
  cancelled?: boolean;
}

export interface CopilotChatResponse {
  response: string;
  pendingAction: PendingAction | null;
  executionMode: 'react' | 'plan_and_execute';
  plan: CopilotPlan | null;
  completedSteps: CompletedStep[];
  pendingActions: PendingAction[];
}

export interface CopilotConfirmResponse {
  status: string;
  message: string;
  executionMode?: 'react' | 'plan_and_execute';
  plan?: CopilotPlan | null;
  completedSteps?: CompletedStep[];
  pendingActions?: PendingAction[];
  pendingAction?: PendingAction | null;
}

/** Extra fields sent when confirming a plan step (Pure Replay protocol). */
export interface PlanConfirmContext {
  userMessage: string;
  history: CopilotChatTurn[];
  teamId?: string | null;
  scheduleId?: string | null;
}

export class CopilotApi extends BaseApi {
  static async chat(
    apiClient: AuthenticatedApiClient,
    request: CopilotChatRequest,
  ): Promise<CopilotChatResponse> {
    if (!request.message || request.message.trim().length === 0) {
      throw new Error('Message is required');
    }

    const raw = await this.makeRequest<{
      response: string;
      execution_mode: string;
      plan: {
        complexity: string;
        summary: string;
        plan: Array<{
          step: number;
          tool: string;
          args: Record<string, unknown>;
          assign_output_to: string | null;
          extract_key: string | null;
          description: string;
        }>;
      } | null;
      completed_steps: Array<{ step: number; status: string }>;
      pending_action: {
        action_token: string;
        tier: 'update' | 'delete';
        tool_name: string;
        tool_args: Record<string, unknown>;
        preview: PendingActionPreview;
        step?: number;
      } | null;
      pending_actions: Array<{
        action_token: string;
        tier: 'update' | 'delete';
        tool_name: string;
        tool_args: Record<string, unknown>;
        preview: PendingActionPreview;
        step?: number;
      }>;
    }>(apiClient, 'post', '/copilot/chat', {
      message: request.message,
      history: request.history ?? [],
      team_id: request.teamId ?? null,
      schedule_id: request.scheduleId ?? null,
    });

    return this._mapResponse(raw);
  }

  static async confirmAction(
    apiClient: AuthenticatedApiClient,
    pendingAction: PendingAction,
    planContext?: PlanConfirmContext,
  ): Promise<CopilotConfirmResponse> {
    const body: Record<string, unknown> = {
      action_token: pendingAction.actionToken,
      tool_name: pendingAction.toolName,
      tool_args: pendingAction.toolArgs,
    };
    if (pendingAction.step !== undefined) {
      body.step = pendingAction.step;
    }

    if (planContext?.userMessage) {
      body.user_message = planContext.userMessage;
      body.history = planContext.history;
      body.team_id = planContext.teamId ?? null;
      body.schedule_id = planContext.scheduleId ?? null;
    }

    const raw = await this.makeRequest<{
      status: string;
      message: string;
      execution_mode?: string;
      plan?: {
        complexity: string;
        summary: string;
        plan: Array<{
          step: number;
          tool: string;
          args: Record<string, unknown>;
          assign_output_to: string | null;
          extract_key: string | null;
          description: string;
        }>;
      } | null;
      completed_steps?: Array<{ step: number; status: string }>;
      pending_actions?: Array<{
        action_token: string;
        tier: 'update' | 'delete';
        tool_name: string;
        tool_args: Record<string, unknown>;
        preview: PendingActionPreview;
        step?: number;
      }>;
      pending_action?: {
        action_token: string;
        tier: 'update' | 'delete';
        tool_name: string;
        tool_args: Record<string, unknown>;
        preview: PendingActionPreview;
        step?: number;
      } | null;
    }>(apiClient, 'post', '/copilot/actions/confirm', body);

    return this._mapConfirmResponse(raw);
  }

  private static _mapPendingAction(pa: {
    action_token: string;
    tier: 'update' | 'delete';
    tool_name: string;
    tool_args: Record<string, unknown>;
    preview: PendingActionPreview;
    step?: number;
  }): PendingAction {
    return {
      actionToken: pa.action_token,
      tier: pa.tier,
      toolName: pa.tool_name,
      toolArgs: pa.tool_args,
      preview: pa.preview,
      step: pa.step,
    };
  }

  private static _mapResponse(raw: {
    response: string;
    execution_mode: string;
    plan: {
      complexity: string;
      summary: string;
      plan: Array<{
        step: number;
        tool: string;
        args: Record<string, unknown>;
        assign_output_to: string | null;
        extract_key: string | null;
        description: string;
      }>;
    } | null;
    completed_steps: Array<{ step: number; status: string }>;
    pending_action: {
      action_token: string;
      tier: 'update' | 'delete';
      tool_name: string;
      tool_args: Record<string, unknown>;
      preview: PendingActionPreview;
      step?: number;
    } | null;
    pending_actions: Array<{
      action_token: string;
      tier: 'update' | 'delete';
      tool_name: string;
      tool_args: Record<string, unknown>;
      preview: PendingActionPreview;
      step?: number;
    }>;
  }): CopilotChatResponse {
    return {
      response: raw.response,
      pendingAction: raw.pending_action ? this._mapPendingAction(raw.pending_action) : null,
      executionMode: (raw.execution_mode as 'react' | 'plan_and_execute') || 'react',
      plan: raw.plan
        ? {
            complexity: raw.plan.complexity,
            summary: raw.plan.summary,
            plan: raw.plan.plan.map((s) => ({
              step: s.step,
              tool: s.tool,
              args: s.args,
              assignOutputTo: s.assign_output_to,
              extractKey: s.extract_key,
              description: s.description,
            })),
          }
        : null,
      completedSteps: (raw.completed_steps ?? []).map((s) => ({
        step: s.step,
        status: s.status as 'completed' | 'pending_confirmation' | 'waiting',
      })),
      pendingActions: (raw.pending_actions ?? []).map((pa) => this._mapPendingAction(pa)),
    };
  }

  private static _mapConfirmResponse(raw: {
    status: string;
    message: string;
    execution_mode?: string;
    plan?: {
      complexity: string;
      summary: string;
      plan: Array<{
        step: number;
        tool: string;
        args: Record<string, unknown>;
        assign_output_to: string | null;
        extract_key: string | null;
        description: string;
      }>;
    } | null;
    completed_steps?: Array<{ step: number; status: string }>;
    pending_actions?: Array<{
      action_token: string;
      tier: 'update' | 'delete';
      tool_name: string;
      tool_args: Record<string, unknown>;
      preview: PendingActionPreview;
      step?: number;
    }>;
    pending_action?: {
      action_token: string;
      tier: 'update' | 'delete';
      tool_name: string;
      tool_args: Record<string, unknown>;
      preview: PendingActionPreview;
      step?: number;
    } | null;
  }): CopilotConfirmResponse {
    return {
      status: raw.status,
      message: raw.message,
      executionMode: (raw.execution_mode as 'react' | 'plan_and_execute') || 'react',
      plan: raw.plan
        ? {
            complexity: raw.plan.complexity,
            summary: raw.plan.summary,
            plan: raw.plan.plan.map((s) => ({
              step: s.step,
              tool: s.tool,
              args: s.args,
              assignOutputTo: s.assign_output_to,
              extractKey: s.extract_key,
              description: s.description,
            })),
          }
        : null,
      completedSteps: (raw.completed_steps ?? []).map((s) => ({
        step: s.step,
        status: s.status as 'completed' | 'pending_confirmation' | 'waiting',
      })),
      pendingActions: (raw.pending_actions ?? []).map((pa) => this._mapPendingAction(pa)),
      pendingAction: raw.pending_action ? this._mapPendingAction(raw.pending_action) : null,
    };
  }
}
