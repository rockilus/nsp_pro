export type ConstraintT = {
  id: string;
  teamId: string;
  constraintType: string;
  templateId: string;
  language: string;
  blocks: BlockT[];
  text: string;
  hard: boolean;
  priority: string;
  active: boolean;
  missingProperties: MissingProperty[];
};
export type TemplateOptionValueT = {
  name: string;
  id: string;
  idType: string;
};

export type BlockT = {
  name: string;
  type: string;
  value: string | number | string[] | TemplateOptionValueT[];
};

export type MissingProperty = {
  dimension_id: string;
  propertyValues: string[];
};

export type ShiftWorkerOptionMessage = {
  name: string;
  id: string;
  idType: string;
  isBoolDim: boolean;
  categoryName: string;
};

export type TemplateBlockT = {
  name: string;
  type: string;
  // options: string[] | Record<string, TemplateOptionValueT[]>;
  options: string[] | ShiftWorkerOptionMessage[];
  placeholder: string | number;
};

export type TemplateT = {
  id: string;
  constraintType: string;
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
