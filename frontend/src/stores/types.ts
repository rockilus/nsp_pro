export type ResponseStatusT = {
  statusOK: boolean;
  message: string;
};

export type SnackBarT = {
  open: boolean;
  message: string;
  type: string; // "success" | "error" | "warning" | "info";
};
