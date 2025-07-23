/**
 * Legacy dimension API functions
 *
 * @deprecated These functions are deprecated and will be removed in a future version.
 * Please use the new DimensionApi class and useDimension hooks instead.
 *
 * Migration guide:
 * - Replace direct function calls with appropriate hooks from useDimension.ts
 * - Use DimensionApi class for non-React contexts
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { DimensionT, DimensionType } from "../../types/dimension";
import { DimEntryT } from "@/types/dim-entry";
import { AttributeT } from "@/types/attribute";
// New API Client
import {
  DimensionApi,
  AddDimensionResponse,
  GetDimensionsResponse,
} from "./api/dimensionApi";

dayjs.extend(utc);

//////////////////////////
// Legacy Dimension Functions //
//////////////////////////

/**
 * @deprecated Use DimensionApi.addDimension() or useAddDimension() hook instead
 */
export async function addDimension(
  dimension: DimensionT,
  dimEntries: DimEntryT[]
): Promise<AddDimensionResponse> {
  console.warn(
    "⚠️ addDimension is deprecated. Use DimensionApi.addDimension() or useAddDimension() hook instead"
  );
  return DimensionApi.addDimensionLegacy(dimension, dimEntries);
}

/**
 * @deprecated Use DimensionApi.getDimensions() or useGetDimensions() hook instead
 */
export async function getDimensions(
  teamId: string,
  dimTypes?: DimensionType[]
): Promise<GetDimensionsResponse> {
  console.warn(
    "⚠️ getDimensions is deprecated. Use DimensionApi.getDimensions() or useGetDimensions() hook instead"
  );
  return DimensionApi.getDimensionsLegacy(teamId, dimTypes);
}

/**
 * @deprecated Use DimensionApi.updateDimension() or useUpdateDimension() hook instead
 */
export async function updateDimension(
  updatedDimension: DimensionT
): Promise<DimensionT> {
  console.warn(
    "⚠️ updateDimension is deprecated. Use DimensionApi.updateDimension() or useUpdateDimension() hook instead"
  );
  return DimensionApi.updateDimensionLegacy(updatedDimension);
}

/**
 * @deprecated Use DimensionApi.deleteDimension() or useDeleteDimension() hook instead
 */
export async function deleteDimension(
  dimensionId: string,
  teamId: string
): Promise<void> {
  console.warn(
    "⚠️ deleteDimension is deprecated. Use DimensionApi.deleteDimension() or useDeleteDimension() hook instead"
  );
  const success = await DimensionApi.deleteDimensionLegacy(dimensionId, teamId);
  if (!success) {
    throw new Error("Failed to delete dimension");
  }
}
