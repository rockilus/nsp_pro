import { useCallback } from 'react';
// API Client
import { CopilotApi, CopilotChatRequest, CopilotChatResponse } from '../app/lib/api/copilotApi';
import { useApiClient } from '../app/lib/api-client';
// Auth Context
import { useAuth } from '../contexts/auth-context';

/**
 * Hook returning a guarded sender for copilot chat messages.
 *
 * Mirrors the auth-validation pattern used by the schedule/team hooks.
 */
export function useCopilotChat() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  return useCallback(
    async (request: CopilotChatRequest): Promise<CopilotChatResponse> => {
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }
      return CopilotApi.chat(apiClient, request);
    },
    [apiClient, isAuthenticated, loading],
  );
}
