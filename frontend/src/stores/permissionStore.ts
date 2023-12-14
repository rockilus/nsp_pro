import { create } from "zustand";

import { PermissionT } from "../components/Admin/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlPermission = baseApiUrl + "/permissions";

type PermissionStateT = {
  permissions: PermissionT[];
  fetchPermissions: () => void;
  addPermission: (permission: PermissionT) => void;
  updatePermission: (updatedPermission: PermissionT) => void;
  deletePermission: (id: string) => void;
};

export const usePermissionStore = create<PermissionStateT>()((set) => ({
  permissions: [],

  fetchPermissions: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlPermission, options);
      const permissions: PermissionT[] = await response.json();
      set({ permissions });
    } catch (error) {
      console.error("Failed to fetch permission:", error);
    }
  },

  addPermission: async (permission) => {
    try {
      const response = await fetch(apiUrlPermission, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permission),
      });
      const newPermission: PermissionT = await response.json();
      set((state) => ({
        permissions: [...state.permissions, newPermission],
      }));
    } catch (error) {
      throw Error(`Failed to add permission: ${error}`);
    }
  },

  updatePermission: async (updatedPermission) => {
    try {
      const response = await fetch(
        `${apiUrlPermission}/${updatedPermission.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedPermission),
        }
      );
      const newPermission: PermissionT = await response.json();
      set((state) => ({
        permissions: state.permissions.map((s) =>
          s.id === newPermission.id ? newPermission : s
        ),
      }));
    } catch (error) {
      console.error("Failed to update permission:", error);
    }
  },

  deletePermission: async (id) => {
    try {
      await fetch(`${apiUrlPermission}/${id}`, {
        method: "DELETE",
      });
      set((state) => ({
        permissions: state.permissions.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete permission:", error);
    }
  },
}));
