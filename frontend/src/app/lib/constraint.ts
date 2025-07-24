// Actions
import { getWorkers } from "./worker";
import { getShifts } from "./shift";
// Types
import { ConstraintT, TemplateT } from "../../types/constraint";
// New API Client
import { ConstraintApi } from "./api/constraintApi";

//////////////////////////
// Legacy Constraint API (Deprecated) //
//////////////////////////
// These functions are deprecated and maintained for backward compatibility only.
// New code should use the authenticated ConstraintApi class and useConstraint hooks.

export async function addConstraint(constraint: ConstraintT) {
  console.warn(
    "⚠️ addConstraint is deprecated. Use useAddConstraint hook instead."
  );
  return ConstraintApi.addConstraintLegacy(constraint);
}

export async function getConstraints(teamId: string) {
  console.warn(
    "⚠️ getConstraints is deprecated. Use useGetConstraints hook instead."
  );
  return ConstraintApi.getConstraintsLegacy(teamId);
}

export async function updateConstraint(updatedConstraint: ConstraintT) {
  console.warn(
    "⚠️ updateConstraint is deprecated. Use useUpdateConstraint hook instead."
  );
  return ConstraintApi.updateConstraintLegacy(updatedConstraint);
}

export async function deleteConstraint(constraintId: string, teamId: string) {
  console.warn(
    "⚠️ deleteConstraint is deprecated. Use useDeleteConstraint hook instead."
  );
  return ConstraintApi.deleteConstraintLegacy(constraintId, teamId);
}

//////////////////////////
// Constraint Template (Deprecated) //
//////////////////////////

export async function getTemplates(teamId: string) {
  console.warn(
    "⚠️ getTemplates is deprecated. Use useGetTemplates hook instead."
  );
  return ConstraintApi.getTemplatesLegacy(teamId);
}

//////////////////////////
// Constraint Tab Data (Deprecated) //
//////////////////////////

export async function getConstraintsTabData(teamId: string) {
  console.warn(
    "⚠️ getConstraintsTabData is deprecated. Use useGetConstraintsTabData hook instead."
  );
  try {
    const constraintsTabData = await Promise.all([
      ConstraintApi.getTemplatesLegacy(teamId),
      ConstraintApi.getConstraintsLegacy(teamId),
      getWorkers(teamId),
      getShifts(teamId),
    ]);
    return {
      templates: constraintsTabData[0],
      constraints: constraintsTabData[1],
      workers: constraintsTabData[2],
      shifts: constraintsTabData[3],
    };
  } catch (error) {
    console.error("Failed to fetch constraints tab data:", error);
    throw new Error(
      "Failed to fetch constraints tab data, please try again later"
    );
  }
}
