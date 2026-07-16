// Types
import { AttributeOwnerType } from './attribute';

export enum SWOIdTypes {
  NONE = 0,
  WORKER = 1,
  SHIFT = 2,
  DIMENSION = 3,
  SPECIALTY = 4,
  DUTY = 5,
  ON_CALL = 6,
}

export type ShiftWorkerOptionT = {
  name: string | boolean;
  id: string;
  idType: SWOIdTypes;
  isBoolDim: boolean;
  categoryName: string;
};

export enum BlockNameOptions {
  OPERATOR = 0,
  NUMBER = 1,
  TIMING = 2,
  SHIFT = 3,
  WORKER = 4,
  TEXT = 5,
  SHIFT_REFERENCE = 6,
  SHIFT_RELATIVE = 7,
  WEEKDAY = 8,
}

export enum BlockTypeOptions {
  STRING = 0,
  NUMBER = 1,
  LIST = 2,
  SHIFT_WORKER_OPTION = 3,
}

export type BlockT = {
  name: BlockNameOptions;
  type: BlockTypeOptions;
  value: string | number | string[] | ShiftWorkerOptionT[];
};

export type MissingAttribute = {
  dimension_id: string;
  isBool: boolean;
  dimName: string;
  category: AttributeOwnerType;
  attributeValues: string[] | number[] | boolean[];
};

export enum ConstraintType {
  SUM = 0,
  SEQ = 1,
  ORD = 2,
  FIL = 3,
  FAI = 4,
  EVE = 5,
}

export type ConstraintT = {
  id: string;
  teamId: string;
  constraintType: ConstraintType;
  templateId: string;
  language: string;
  blocks: BlockT[];
  text: string;
  hard: boolean;
  priority: string;
  active: boolean;
  missingAttributes: MissingAttribute[];
};

export type TemplateBlockT = {
  name: BlockNameOptions;
  type: BlockTypeOptions;
  options: string[] | ShiftWorkerOptionT[];
  placeholder: string | number;
};

export type TemplateT = {
  id: string;
  constraintType: ConstraintType;
  text: string;
  language: string;
  blocks: TemplateBlockT[];
};

// higher darker
export type ConstraintColorsT = {
  shade0: string;
  shade1: string;
  shade2: string;
  shade3: string;
};
