import { Block } from "@mui/icons-material";

export type ConstraintT = {
  id: string;
  constraintType: string;
  templateId: string;
  blocks: BlockT[];
  text: string;
  hard: boolean;
  priority: string;
  active: boolean;
};

export type BlockT = {
  name: string;
  type: string;
  value: string | number | string[] | Record<string, string>[];
};

export type TemplateBlockT = {
  name: string;
  type: string;
  options: string[] | Record<string, string>[];
  placeholder: string | number;
};

export type TemplateT = {
  id: string;
  constraintType: string;
  text: string;
  blocks: TemplateBlockT[];
};

// higher darker
export type ConstraintColorsT = {
  shade0: string;
  shade1: string;
  shade2: string;
  shade3: string;
};
