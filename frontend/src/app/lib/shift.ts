import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { getDimensions } from "./dimension";
import { getSpecialties } from "./specialty";
import { LinkShiftApi } from "./api/linkShiftApi";
// Types
import { ShiftT, LinkShiftT } from "../../types/shift";
// New API
import {
  ShiftApi,
  toShiftT,
  fromShiftT,
  ShiftUpdateResponse,
  ShiftDeleteResponse,
  ShiftsTabDataResponse,
} from "./api/shiftApi";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlShifts = API_URL + "/shifts";

// Re-export transformation functions for backward compatibility
export { toShiftT, fromShiftT };

// Re-export types for backward compatibility
export type { ShiftUpdateResponse, ShiftDeleteResponse, ShiftsTabDataResponse };

//////////////////////////
// Shift - DEPRECATED //
//////////////////////////
// ⚠️ These functions are deprecated. Use ShiftApi and useShift hooks instead.

/**
 * @deprecated Use ShiftApi.addShift with useAddShift hook instead
 */
export async function addShift(shift: ShiftT) {
  console.warn(
    "⚠️ addShift is deprecated. Use ShiftApi.addShift with useAddShift hook instead"
  );
  return ShiftApi.addShiftLegacy(shift);
}

/**
 * @deprecated Use ShiftApi.getShifts with useGetShifts hook instead
 */
export async function getShifts(teamId: string) {
  console.warn(
    "⚠️ getShifts is deprecated. Use ShiftApi.getShifts with useGetShifts hook instead"
  );
  return ShiftApi.getShiftsLegacy(teamId);
}

/**
 * @deprecated Use ShiftApi.getWorkShifts with useGetWorkShifts hook instead
 */
export async function getWorkShifts(teamId: string) {
  console.warn(
    "⚠️ getWorkShifts is deprecated. Use ShiftApi.getWorkShifts with useGetWorkShifts hook instead"
  );
  return ShiftApi.getWorkShiftsLegacy(teamId);
}

/**
 * @deprecated Use ShiftApi.getAllShifts with useGetAllShifts hook instead
 */
export async function getAllShifts(teamId: string) {
  console.warn(
    "⚠️ getAllShifts is deprecated. Use ShiftApi.getAllShifts with useGetAllShifts hook instead"
  );
  return ShiftApi.getAllShiftsLegacy(teamId);
}

/**
 * @deprecated Use ShiftApi.updateShift with useUpdateShift hook instead
 */
export async function updateShift(updatedShift: ShiftT) {
  console.warn(
    "⚠️ updateShift is deprecated. Use ShiftApi.updateShift with useUpdateShift hook instead"
  );
  return ShiftApi.updateShiftLegacy(updatedShift);
}

/**
 * @deprecated Use ShiftApi.deleteShift with useDeleteShift hook instead
 */
export async function deleteShift(shiftId: string, teamId: string) {
  console.warn(
    "⚠️ deleteShift is deprecated. Use ShiftApi.deleteShift with useDeleteShift hook instead"
  );
  return ShiftApi.deleteShiftLegacy(shiftId, teamId);
}

//////////////////////////
// Shifts Tab Data - DEPRECATED //
//////////////////////////

/**
 * @deprecated Use ShiftApi.getShiftsTabData with useGetShiftsTabData hook instead
 */
export async function getShiftsTabData(teamId: string) {
  console.warn(
    "⚠️ getShiftsTabData is deprecated. Use ShiftApi.getShiftsTabData with useGetShiftsTabData hook instead"
  );
  try {
    const shiftsTabData = await Promise.all([
      getShifts(teamId),
      getDimensions(teamId),
      getSpecialties(teamId),
      LinkShiftApi.getLinkShiftsLegacy(teamId),
    ]);
    return {
      shifts: shiftsTabData[0],
      dimensions: shiftsTabData[1].dimensions,
      dimEntries: shiftsTabData[1].dimEntries,
      specialties: shiftsTabData[2],
      linkShifts: shiftsTabData[3],
    };
  } catch (error) {
    console.error("Failed to fetch shifts tab data:", error);
    throw new Error("Failed to fetch shifts tab data, please try again later");
  }
}
