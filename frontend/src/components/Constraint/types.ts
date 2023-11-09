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

export type BuildBlockNameT = 'type' | 'operator' | 'quantity' | 'shift_id' | 'timing' | 'worker_id';

export type BuildBlockT = {
  name: BuildBlockNameT;
  value: string | number | string[];
};
