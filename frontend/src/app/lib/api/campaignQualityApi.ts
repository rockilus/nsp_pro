import { BaseApi, AuthenticatedApiClient } from './baseApi';
import { CampaignQualityT } from '@/types/campaignQuality';

export class CampaignQualityApi extends BaseApi {
  static async getCampaignQuality(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<CampaignQualityT | null> {
    if (!teamId) throw new Error('Team ID is required');
    return this.makeRequest<CampaignQualityT | null>(
      apiClient,
      'get',
      `/campaign-quality/teams/${teamId}`,
    );
  }
}
