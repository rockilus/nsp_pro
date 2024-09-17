import { ShiftWorkerOptionT } from "../../../types/constraint";

export const getShiftWorkerOptionDisplayName = (
  option: ShiftWorkerOptionT
): string => {
  if (option.isBoolDim && option.name === true) {
    return option.categoryName;
  } else if (option.isBoolDim && option.name === false) {
    return `Not ${option.categoryName.toLocaleLowerCase()}`;
  }
  return option.name as string;
};
