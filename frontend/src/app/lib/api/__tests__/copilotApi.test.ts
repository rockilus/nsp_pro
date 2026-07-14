import { CopilotApi } from '../copilotApi';
import type { AuthenticatedApiClient } from '../baseApi';

function mockClient(postImpl: (endpoint: string, data?: unknown) => Promise<unknown>) {
  return {
    get: async () => ({}),
    post: postImpl as AuthenticatedApiClient['post'],
    put: async () => ({}),
    delete: async () => ({}),
  } as AuthenticatedApiClient;
}

describe('CopilotApi.chat', () => {
  it('maps a snake_case pending_action into a camelCase PendingAction', async () => {
    const client = mockClient(async () => ({
      response: 'I have prepared the change.',
      pending_action: {
        action_token: 'tok-123',
        tier: 'update',
        tool_name: 'update_worker_fields',
        tool_args: { worker_id: 'w1', weekly_hours_desired: 30 },
        preview: {
          entity: 'worker',
          entity_id: 'w1',
          entity_name: 'Alice',
          changes: [{ field: 'weekly_hours_desired', label: 'Desired', old: 35, new: 30 }],
        },
      },
    }));

    const res = await CopilotApi.chat(client, { message: 'set Alice to 30' });

    expect(res.response).toBe('I have prepared the change.');
    expect(res.pendingAction).not.toBeNull();
    expect(res.pendingAction?.actionToken).toBe('tok-123');
    expect(res.pendingAction?.toolName).toBe('update_worker_fields');
    expect(res.pendingAction?.toolArgs).toEqual({ worker_id: 'w1', weekly_hours_desired: 30 });
    expect(res.pendingAction?.preview.entity_name).toBe('Alice');
  });

  it('returns null pendingAction when none is present', async () => {
    const client = mockClient(async () => ({ response: 'hi', pending_action: null }));
    const res = await CopilotApi.chat(client, { message: 'hello' });
    expect(res.pendingAction).toBeNull();
  });

  it('rejects empty messages', async () => {
    const client = mockClient(async () => ({}));
    await expect(CopilotApi.chat(client, { message: '  ' })).rejects.toThrow('Message is required');
  });
});

describe('CopilotApi.confirmAction', () => {
  it('sends the signed token and args verbatim in snake_case', async () => {
    let captured: { endpoint: string; data: unknown } | null = null;
    const client = mockClient(async (endpoint, data) => {
      captured = { endpoint, data };
      return { status: 'success', message: 'done' };
    });

    const res = await CopilotApi.confirmAction(client, {
      actionToken: 'tok-abc',
      tier: 'delete',
      toolName: 'soft_delete_worker',
      toolArgs: { worker_id: 'w9' },
      preview: { entity: 'worker', entity_id: 'w9', entity_name: 'Bob' },
    });

    expect(res.status).toBe('success');
    expect(captured!.endpoint).toBe('/copilot/actions/confirm');
    expect(captured!.data).toEqual({
      action_token: 'tok-abc',
      tool_name: 'soft_delete_worker',
      tool_args: { worker_id: 'w9' },
    });
  });
});
