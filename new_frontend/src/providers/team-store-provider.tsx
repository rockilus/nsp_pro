"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";

import {
  type TeamStore,
  createTeamStore,
  initTeamStore,
} from "@/stores/team-store";

export type TeamStoreApi = ReturnType<typeof createTeamStore>;

export const TeamStoreContext = createContext<TeamStoreApi | undefined>(
  undefined
);

export interface TeamStoreProviderProps {
  children: ReactNode;
}

export const TeamStoreProvider = ({ children }: TeamStoreProviderProps) => {
  const storeRef = useRef<TeamStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createTeamStore(initTeamStore());
  }

  return (
    <TeamStoreContext.Provider value={storeRef.current}>
      {children}
    </TeamStoreContext.Provider>
  );
};

export const useTeamStore = <T,>(selector: (store: TeamStore) => T): T => {
  const teamStoreContext = useContext(TeamStoreContext);

  if (!teamStoreContext) {
    throw new Error(`useTeamStore must be used within TeamStoreProvider`);
  }

  return useStore(teamStoreContext, selector);
};
