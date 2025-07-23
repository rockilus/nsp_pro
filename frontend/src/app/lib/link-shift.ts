/**
 * @deprecated This file contains legacy API functions.
 * Use LinkShiftApi class and useLinkShift hooks instead.
 *
 * Migrated functions:
 * - addLinkShift() -> LinkShiftApi.createLinkShift() or useCreateLinkShift()
 * - getLinkShifts() -> LinkShiftApi.getLinkShifts() or useGetLinkShifts()
 * - updateLinkShift() -> LinkShiftApi.updateLinkShift() or useUpdateLinkShift()
 * - deleteLinkShift() -> LinkShiftApi.deleteLinkShift() or useDeleteLinkShift()
 */

// Types
import { LinkShiftT } from "../../types/shift";
// New API
import { LinkShiftApi } from "./api/linkShiftApi";

//////////////////////////
// Legacy LinkShift Functions //
// (Backward compatibility only) //
//////////////////////////

/**
 * @deprecated Use LinkShiftApi.createLinkShift() or useCreateLinkShift() hook instead
 */
export async function addLinkShift(linkShift: LinkShiftT): Promise<LinkShiftT> {
  console.warn(
    "⚠️ addLinkShift() is deprecated. Use LinkShiftApi.createLinkShift() or useCreateLinkShift() hook instead."
  );
  return LinkShiftApi.createLinkShiftLegacy(linkShift);
}

/**
 * @deprecated Use LinkShiftApi.getLinkShifts() or useGetLinkShifts() hook instead
 */
export async function getLinkShifts(teamId: string): Promise<LinkShiftT[]> {
  console.warn(
    "⚠️ getLinkShifts() is deprecated. Use LinkShiftApi.getLinkShifts() or useGetLinkShifts() hook instead."
  );
  return LinkShiftApi.getLinkShiftsLegacy(teamId);
}

/**
 * @deprecated Use LinkShiftApi.updateLinkShift() or useUpdateLinkShift() hook instead
 */
export async function updateLinkShift(
  updatedLinkShift: LinkShiftT
): Promise<LinkShiftT> {
  console.warn(
    "⚠️ updateLinkShift() is deprecated. Use LinkShiftApi.updateLinkShift() or useUpdateLinkShift() hook instead."
  );
  return LinkShiftApi.updateLinkShiftLegacy(updatedLinkShift);
}

/**
 * @deprecated Use LinkShiftApi.deleteLinkShift() or useDeleteLinkShift() hook instead
 */
export async function deleteLinkShift(
  linkShiftId: string,
  teamId: string
): Promise<void> {
  console.warn(
    "⚠️ deleteLinkShift() is deprecated. Use LinkShiftApi.deleteLinkShift() or useDeleteLinkShift() hook instead."
  );
  await LinkShiftApi.deleteLinkShiftLegacy(linkShiftId, teamId);
}
