export enum AttributeOwnerType {
  SHIFT = 0,
  WORKER = 1,
}

export type AttributeT = {
  id: string;
  value: string | number | boolean;
  ownerType: AttributeOwnerType;
  ownerId: string;
  dimensionId: string;
  dimEntryIds: string[];
};

/**
 * Convert API response to AttributeT
 */
export function toAttributeT(data: any): AttributeT {
  return {
    id: data.id,
    value: data.value,
    ownerType: data.owner_type ?? data.ownerType,
    ownerId: data.owner_id ?? data.ownerId,
    dimensionId: data.dimension_id ?? data.dimensionId,
    dimEntryIds: data.dim_entry_ids ?? data.dimEntryIds ?? [],
  };
}
