// Types
import { SpecialtyT } from "@/types/specialty";
import { WorkerT } from "../../types/worker";
// Modern API
import { SpecialtyApi } from "./api/specialtyApi";

//////////////////////////
// Legacy Specialty Functions //
// These are deprecated - use SpecialtyApi and useSpecialty hooks instead //
//////////////////////////

/**
 * @deprecated Use SpecialtyApi.addSpecialty with authentication instead
 */
export async function addSpecialty(specialty: SpecialtyT, teamId: string) {
  console.warn(
    "⚠️ addSpecialty is deprecated. Use SpecialtyApi.addSpecialty with authentication instead."
  );
  return await SpecialtyApi.addSpecialtyLegacy(specialty, teamId);
}

/**
 * @deprecated Use SpecialtyApi.getSpecialties with authentication instead
 */
export async function getSpecialties(teamId: string) {
  console.warn(
    "⚠️ getSpecialties is deprecated. Use SpecialtyApi.getSpecialties with authentication instead."
  );
  return await SpecialtyApi.getSpecialtiesLegacy(teamId);
}

/**
 * @deprecated Use SpecialtyApi.updateSpecialty with authentication instead
 */
export async function updateSpecialty(
  updatedSpecialty: SpecialtyT,
  teamId: string
) {
  console.warn(
    "⚠️ updateSpecialty is deprecated. Use SpecialtyApi.updateSpecialty with authentication instead."
  );
  return await SpecialtyApi.updateSpecialtyLegacy(updatedSpecialty, teamId);
}

/**
 * @deprecated Use SpecialtyApi.deleteSpecialty with authentication instead
 */
export async function deleteSpecialty(specialtyId: string, teamId: string) {
  console.warn(
    "⚠️ deleteSpecialty is deprecated. Use SpecialtyApi.deleteSpecialty with authentication instead."
  );
  return await SpecialtyApi.deleteSpecialtyLegacy(specialtyId, teamId);
}
