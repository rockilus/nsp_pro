export type ConstraintT = {
  id: string;
  name: string;
  type: string;
  hard: boolean;
  priority: string;
  active: boolean;
};

export type ConstraintParamsT = {
  quantity: number;
  quantified_variable: string;
  var_value: string;
  timing: string;
  operator: string;
  reference_variable: string;
  ref_var_value: string;
  other_variable: string;
  other_var_value: string;
};

export type TreeNodeT = {
  name: string;
  parentOptions: string[];
  options: string[];
  children: TreeNodeT[];
};

export type ConstraintBlockT = Record<string, string | number>;
