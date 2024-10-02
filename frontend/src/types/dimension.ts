// Types
import { AttributeT } from "./attribute";

export enum DimensionType {
  WORKER = 0,
  SHIFT = 1,
  REST_SHIFT = 2,
}

export enum DimensionEntryType {
  STR = 0,
  INT = 1,
  BOOL = 2,
  DIM_ENTRIES = 3,
}

export type DimensionT = {
  id: string;
  teamId: string;
  dimTypes: DimensionType[];
  name: string;
  entryType: DimensionEntryType;
  deleted: boolean;
};

export type DimEntryT = {
  id: string;
  dimensionId: string;
  name: string;
  deleted: boolean;
};

export type NewDimensionT = {
  newDimension: DimensionT;
  newDimEntries: DimEntryT[];
  newAttributes: AttributeT[];
};
