// Actions
import { getSchedules } from "./schedule";
import { getConstraints } from "./constraint";
// Types
import { ScheduleStatus } from "../../types/schedule";
// New API Client
import { CampaignApi } from "./api/campaignApi";

//////////////////////////
// Legacy Campaign API (Deprecated) //
//////////////////////////
// These functions are deprecated and maintained for backward compatibility only.
// New code should use the authenticated CampaignApi class and useCampaign hooks.

export async function getCampaignTabData(teamId: string) {
  console.warn(
    "⚠️ getCampaignTabData is deprecated. Use useGetCampaignTabData hook instead."
  );
  return CampaignApi.getCampaignTabDataLegacy(teamId);
}

export async function getCampaignTabDataNoSolver(teamId: string) {
  console.warn(
    "⚠️ getCampaignTabDataNoSolver is deprecated. Use useGetCampaignTabDataNoSolver hook instead."
  );
  return CampaignApi.getCampaignTabDataNoSolverLegacy(teamId);
}
