import { useCallback } from 'react';
import { TeamGenerationSettingsT } from '../types/team-generation-settings';
import { BaseApi, AuthenticatedApiClient } from '../app/lib/api/baseApi';
import { useApiClient } from '../app/lib/api-client';
import { useAuth } from '../contexts/auth-context';

class TeamGenerationSettingsApi extends BaseApi {
  static async getSettings(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<TeamGenerationSettingsT> {
    return this.makeRequest<TeamGenerationSettingsT>(
      apiClient,
      'get',
      `/teams/${teamId}/generation-settings`,
    );
  }

  static async updateSettings(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    settings: TeamGenerationSettingsT,
  ): Promise<TeamGenerationSettingsT> {
    return this.makeRequest<TeamGenerationSettingsT>(
      apiClient,
      'put',
      `/teams/${teamId}/generation-settings`,
      settings,
    );
  }
}

export function useGetTeamGenerationSettings() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  return useCallback(
    async (teamId: string): Promise<TeamGenerationSettingsT> => {
      if (loading) throw new Error('Authentication still loading');
      if (!isAuthenticated) throw new Error('User not authenticated');
      return TeamGenerationSettingsApi.getSettings(apiClient, teamId);
    },
    [apiClient, isAuthenticated, loading],
  );
}

export function useUpdateTeamGenerationSettings() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();

  return useCallback(
    async (teamId: string, settings: TeamGenerationSettingsT): Promise<TeamGenerationSettingsT> => {
      if (loading) throw new Error('Authentication still loading');
      if (!isAuthenticated) throw new Error('User not authenticated');
      return TeamGenerationSettingsApi.updateSettings(apiClient, teamId, settings);
    },
    [apiClient, isAuthenticated, loading],
  );
}
