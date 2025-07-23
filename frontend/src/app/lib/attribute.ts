// Types
import { AttributeT } from "@/types/attribute";
// New API
import { AttributeApi } from "./api/attributeApi";

//////////////////////////
// Legacy Attribute Functions //
// These are kept for backward compatibility but should be migrated to hooks
//////////////////////////

/**
 * @deprecated Use useUpdateAttribute hook instead
 * Legacy function for updating attributes
 */
export async function updateAttribute(
  attribute: AttributeT,
  teamId: string
): Promise<AttributeT> {
  console.warn(
    "⚠️ updateAttribute is deprecated. Use useUpdateAttribute hook instead."
  );
  return AttributeApi.updateAttributeLegacy(attribute, teamId);
}

/**
 * @deprecated Use useGetAttributesByOwner hook instead
 * Legacy function for getting attributes by owner
 */
export async function getAttributesByOwner(
  ownerId: string,
  teamId: string
): Promise<AttributeT[]> {
  console.warn(
    "⚠️ getAttributesByOwner is deprecated. Use useGetAttributesByOwner hook instead."
  );
  return AttributeApi.getAttributesByOwnerLegacy(ownerId, teamId);
}

/**
 * @deprecated Use useCreateAttribute hook instead
 * Legacy function for creating attributes
 */
export async function createAttribute(
  attribute: Omit<AttributeT, "id">,
  teamId: string
): Promise<AttributeT> {
  console.warn(
    "⚠️ createAttribute is deprecated. Use useCreateAttribute hook instead."
  );
  return AttributeApi.createAttributeLegacy(attribute, teamId);
}

/**
 * @deprecated Use useDeleteAttribute hook instead
 * Legacy function for deleting attributes
 */
export async function deleteAttribute(
  attributeId: string,
  teamId: string
): Promise<boolean> {
  console.warn(
    "⚠️ deleteAttribute is deprecated. Use useDeleteAttribute hook instead."
  );
  return AttributeApi.deleteAttributeLegacy(attributeId, teamId);
}
