import { createStore } from "zustand/vanilla";

export type TeamState = {
  selectedTeamId: string | null;
};

export type TeamActions = {
  setSelectedTeamId: (teamId: string) => void;
};

export type TeamStore = TeamState & TeamActions;

export const initTeamStore = (): TeamState => {
  return { selectedTeamId: null };
};

export const defaultInitState: TeamState = {
  selectedTeamId: null,
};

export const createTeamStore = (initState: TeamState = defaultInitState) => {
  return createStore<TeamStore>()((set) => ({
    ...initState,
    setSelectedTeamId: (teamId) => set({ selectedTeamId: teamId }),
  }));
};

// export const defaultInitState: CounterState = {
//   count: 0,
// }

// export const createCounterStore = (
//   initState: CounterState = defaultInitState,
// ) => {
//   return createStore<CounterStore>()((set) => ({
//     ...initState,
//     decrementCount: () => set((state) => ({ count: state.count - 1 })),
//     incrementCount: () => set((state) => ({ count: state.count + 1 })),
//   }))
// }
