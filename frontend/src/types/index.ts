//==============================================================================
// State
//==============================================================================

export interface ConstraintParamsState {
  currentConstraintParams: Record<string, any>[] | null;
  error?: string;
  getConstraintParams: () => Promise<void>;
}

export interface ConstraintsState {
  currentConstraints: Record<string, any>[] | null;
  error?: string;
  postCreateConstraint: (constraint: Record<string, any>) => Promise<void>;
  getConstraints: () => Promise<void>;
  postUpdateConstraint: (
    constraintId: string,
    constraint: Record<string, any>
  ) => Promise<void>;
  postUpdateConstraintStatus: (
    constraintId: string,
    newStatus: boolean
  ) => Promise<void>;
  deleteConstraint: (constraintId: string) => Promise<void>;
}
