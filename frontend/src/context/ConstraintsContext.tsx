import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverPostCreateConstraint,
  serverGetConstraints,
  serverPostUpdateConstraint,
  serverPostUpdateConstraintStatus,
  serverDeleteConstraint,
} from "../api/constraint";
import { ConstraintsState } from "../types/index";

const initialConstraintsState: ConstraintsState = {
  currentConstraints: null,
  error: "",
  postCreateConstraint: async () => {},
  getConstraints: async () => {},
  postUpdateConstraint: async () => {},
  postUpdateConstraintStatus: async () => {},
  deleteConstraint: async () => {},
};

export const ConstraintsContext = createContext<ConstraintsState>(
  initialConstraintsState
);

interface ConstraintsProviderProps {
  children: ReactNode;
}

export const ConstraintsProvider = (props: ConstraintsProviderProps) => {
  const [constraintsState, setConstraintsState] = useState<ConstraintsState>(
    initialConstraintsState
  );

  const postCreateConstraint = useCallback(
    async (constraint: Record<string, any>) => {
      console.log("createConstraint called");

      const response = await serverPostCreateConstraint(constraint);

      setConstraintsState((prevState) => {
        if (!prevState.currentConstraints) {
          return prevState;
        }
        return {
          ...prevState,
          currentConstraints: [
            ...prevState.currentConstraints,
            response.constraint,
          ],
        };
      });
    },
    []
  );

  const getConstraints = useCallback(async () => {
    const response = await serverGetConstraints();
    setConstraintsState((oldValues) => {
      return { ...oldValues, currentConstraints: response.constraints };
    });
  }, []);

  const postUpdateConstraint = useCallback(
    async (constraintId: string, constraint: Record<string, any>) => {
      console.log("postUpdateConstraint called");

      const response = await serverPostUpdateConstraint(
        constraintId,
        constraint
      );

      setConstraintsState((prevState) => {
        if (!prevState.currentConstraints) {
          return prevState;
        }

        const updatedConstraints = prevState.currentConstraints.map(
          (constraint) => {
            if (constraint._id !== constraintId) {
              return constraint;
            } else {
              return response.constraint;
            }
          }
        );

        return {
          ...prevState,
          currentConstraints: updatedConstraints,
        };
      });
    },
    []
  );

  const postUpdateConstraintStatus = useCallback(
    async (constraintId: string, active: boolean) => {
      const response = await serverPostUpdateConstraintStatus(
        constraintId,
        active
      );

      setConstraintsState((prevState) => {
        if (!prevState.currentConstraints) {
          return prevState;
        }

        const updatedConstraints = prevState.currentConstraints.map(
          (constraint) => {
            if (constraint._id !== constraintId) {
              return constraint;
            } else {
              return response.constraint;
            }
          }
        );

        return {
          ...prevState,
          currentConstraints: updatedConstraints,
        };
      });
    },
    []
  );

  const deleteConstraint = useCallback(async (constraintId: string) => {
    console.log("deleteConstraint called");
    const response = await serverDeleteConstraint(constraintId);

    setConstraintsState((prevState) => {
      if (!prevState.currentConstraints) {
        return prevState;
      }
      return {
        ...prevState,
        currentConstraints: prevState.currentConstraints.filter(
          (constraint) => constraint._id !== constraintId
        ),
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...constraintsState,
      postCreateConstraint,
      getConstraints,
      postUpdateConstraint,
      postUpdateConstraintStatus,
      deleteConstraint,
    }),
    [
      constraintsState,
      postCreateConstraint,
      getConstraints,
      postUpdateConstraint,
      postUpdateConstraintStatus,
      deleteConstraint,
    ]
  );

  return (
    <ConstraintsContext.Provider value={contextValue}>
      {props.children}
    </ConstraintsContext.Provider>
  );
};
