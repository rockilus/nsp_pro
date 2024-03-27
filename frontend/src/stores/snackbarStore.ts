import { create } from "zustand";
// Types
import { SnackBarT } from "./types";

type SnackBarStateT = {
  snackBar: SnackBarT;
  openSnackBar: () => void;
  closeSnackBar: () => void;
  updateSnackBar: (message: string, type: string) => void;
};

export const useSnackBarStore = create<SnackBarStateT>()((set) => ({
  snackBar: {
    open: false,
    message: "",
    type: "info",
  },

  openSnackBar: () => {
    set((state) => ({
      snackBar: {
        ...state.snackBar,
        open: true,
      },
    }));
  },

  closeSnackBar: () => {
    set((state) => ({
      snackBar: {
        ...state.snackBar,
        open: false,
      },
    }));
  },

  updateSnackBar: (message, type) => {
    set((state) => ({
      snackBar: {
        open: true,
        message,
        type,
      },
    }));
  },
}));
