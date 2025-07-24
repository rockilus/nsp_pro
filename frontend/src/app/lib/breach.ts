/**
 * LEGACY BREACH API - DEPRECATED
 *
 * This file has been deprecated in favor of the new authenticated API pattern.
 * Please use BreachApi and useBreach hook instead.
 *
 * New API: frontend/src/app/lib/api/breachApi.ts
 * New Hook: frontend/src/hooks/useBreach.ts
 */

// Types
import { BreachT } from "@/types/breach";
// New API
import { BreachApi } from "./api/breachApi";

//////////////////////////
// LEGACY Breach API //
//////////////////////////

/**
 * @deprecated Use BreachApi.getBreachesLegacy() or useBreach hook instead
 * Legacy function for getting breaches by team ID
 */
export async function getBreaches(teamId: string): Promise<BreachT[]> {
  console.warn(
    "⚠️ DEPRECATED: getBreaches() is deprecated. Use BreachApi.getBreaches() with authentication or useBreach hook instead."
  );
  return BreachApi.getBreachesLegacy(teamId);
}
