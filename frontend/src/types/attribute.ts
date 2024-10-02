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
