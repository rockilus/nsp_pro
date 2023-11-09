export type ConstraintT = {
  id: string;
  buildBlocks: BuildBlockT[];
  hard: boolean;
  priority: string;
  active: boolean;
};

export type TreeNodeT = {
  name: BuildBlockNameT;
  parentOptions: Array<string | number>;
  options: string[];
  children: TreeNodeT[];
};

export type BuildBlockNameT = 'type' | 'operator' | 'quantity' | 'shift_id' | 'day' | 'worker_id' | 'shift_id_reference' | 'shift_id_relative';

export type BuildBlockT = {
  name: BuildBlockNameT;
  value: string | number | string[];
};
