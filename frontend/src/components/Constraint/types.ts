export type ConstraintT = {
  id: string;
  buildBlocks: BuildBlockT[];
  hard: boolean;
  priority: string;
  active: boolean;
};

export type TreeNodeT = {
  name: string;
  parentOptions: Array<string | number>;
  options: string[];
  children: TreeNodeT[];
};

export type BuildBlockT = {
  name: string;
  value: string | number;
};
