export type ConstraintT = {
  id: string;
  constraintType: string;
  blocks: BlockT[];
  hard: boolean;
  priority: string;
  active: boolean;
};

export type BlockT = {
  name: string;
  type: string;
  value: string | number | string[];
};

export type ConstraintTemplateBlockT = {
  name: string;
  type: string;
  options: string[];
  placeholder: string | number;
  multiple: boolean;
};

export type ConstraintTemplateT = {
  id: string;
  constraintType: string;
  text: string;
  blocks: ConstraintTemplateBlockT[];
};
