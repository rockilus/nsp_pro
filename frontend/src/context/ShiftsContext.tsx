import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  serverPostCreateShift,
  serverGetShifts,
  serverPostUpdateShiftProperty,
  serverDeleteShift,
} from "../api/configuration";
import { ShiftsState } from "../types/index";

const initialShiftsState: ShiftsState = {
  currentShifts: null,
  error: "",
  postCreateShift: async () => {},
  getShifts: async () => {},
  postUpdateShiftProperty: async () => {},
  deleteShift: async () => {},
};

export const ShiftsContext = createContext<ShiftsState>(initialShiftsState);

interface ShiftsProviderProps {
  children: ReactNode;
}

export const ShiftsProvider = (props: ShiftsProviderProps) => {
  const [shiftsState, setShiftsState] =
    useState<ShiftsState>(initialShiftsState);

  const postCreateShift = useCallback(async () => {
    console.log("createShift called");

    const response = await serverPostCreateShift();

    setShiftsState((prevState) => {
      if (!prevState.currentShifts) {
        return prevState;
      }
      return {
        ...prevState,
        currentShifts: [...prevState.currentShifts, response.shift],
      };
    });
  }, []);

  const getShifts = useCallback(async () => {
    const response = await serverGetShifts();
    setShiftsState((oldValues) => {
      return { ...oldValues, currentShifts: response.shifts };
    });
  }, []);

  const postUpdateShiftProperty = useCallback(
    async (shiftId: string, shiftParamId: string, value: any) => {
      console.log("postUpdateShiftProperty called");

      const response = await serverPostUpdateShiftProperty(
        shiftId,
        shiftParamId,
        value
      );

      setShiftsState((prevState) => {
        if (!prevState.currentShifts) {
          return prevState;
        }

        const updatedShifts = prevState.currentShifts.map((shift) => {
          if (shift.shift._id !== shiftId) {
            return shift;
          }

          let found = false;
          const updatedShiftProperties = shift.shift_properties.map(
            (shiftProperty: Record<string, any>) => {
              if (shiftProperty._id !== response.updated_shift_property._id) {
                return shiftProperty;
              } else if (
                shiftProperty._id === response.updated_shift_property._id
              ) {
                console.log("shiftProperty: ", shiftProperty);
                console.log(
                  "response.updated_shift_property: ",
                  response.updated_shift_property
                );
                found = true;
                return response.updated_shift_property;
              }
            }
          );
          if (!found) {
            updatedShiftProperties.push(response.updated_shift_property);
          }

          const updatedShift = {
            ...shift,
            shift_properties: updatedShiftProperties,
          };
          return updatedShift;
        });

        console.log("prevState: ", prevState);
        console.log("updatedShifts: ", updatedShifts);

        return {
          ...prevState,
          currentShifts: updatedShifts,
        };
      });
    },
    []
  );

  const deleteShift = useCallback(async (shiftId: string) => {
    console.log("deleteShift called");
    const response = await serverDeleteShift(shiftId);

    setShiftsState((prevState) => {
      if (!prevState.currentShifts) {
        return prevState;
      }
      return {
        ...prevState,
        currentShifts: prevState.currentShifts.filter(
          (shift) => shift.shift._id !== shiftId
        ),
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...shiftsState,
      postCreateShift,
      getShifts,
      postUpdateShiftProperty,
      deleteShift,
    }),
    [
      shiftsState,
      postCreateShift,
      getShifts,
      postUpdateShiftProperty,
      deleteShift,
    ]
  );

  return (
    <ShiftsContext.Provider value={contextValue}>
      {props.children}
    </ShiftsContext.Provider>
  );
};
