import { create } from "zustand";

import { RoleT } from "../components/Admin/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlRole = baseApiUrl + "/roles";

type RoleStateT = {
  roles: RoleT[];
  fetchRoles: () => void;
  addRole: (role: RoleT) => void;
  updateRole: (updatedRole: RoleT) => void;
  deleteRole: (id: string) => void;
};

export const useRoleStore = create<RoleStateT>()((set) => ({
  roles: [],

  fetchRoles: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlRole, options);
      const roles: RoleT[] = await response.json();
      set({ roles });
    } catch (error) {
      console.error("Failed to fetch role:", error);
    }
  },

  addRole: async (role) => {
    try {
      const response = await fetch(apiUrlRole, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(role),
      });
      const newRole: RoleT = await response.json();
      set((state) => ({
        roles: [...state.roles, newRole],
      }));
    } catch (error) {
      throw Error(`Failed to add role: ${error}`);
    }
  },

  updateRole: async (updatedRole) => {
    try {
      const response = await fetch(`${apiUrlRole}/${updatedRole.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedRole),
      });
      const newRole: RoleT = await response.json();
      set((state) => ({
        roles: state.roles.map((s) => (s.id === newRole.id ? newRole : s)),
      }));
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  },

  deleteRole: async (id) => {
    try {
      await fetch(`${apiUrlRole}/${id}`, {
        method: "DELETE",
      });
      set((state) => ({
        roles: state.roles.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete role:", error);
    }
  },
}));
