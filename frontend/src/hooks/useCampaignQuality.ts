import { useCallback } from 'react';
import { CampaignQualityApi } from '../app/lib/api/campaignQualityApi';
import { useApiClient } from '../app/lib/api-client';
import { useAuth } from '../contexts/auth-context';
import { CampaignQualityT } from '../types/campaignQuality';

export function useGetCampaignQuality() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getCampaignQuality = useCallback(
    async (teamId: string): Promise<CampaignQualityT | null> => {
      if (loading) throw new Error('Authentication still loading — please wait');
      if (!isAuthenticated) throw new Error('User not authenticated — please sign in');
      try {
        return await CampaignQualityApi.getCampaignQuality(apiClient, teamId);
      } catch (error) {
        console.error('Failed to get campaign quality:', error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return getCampaignQuality;
}
