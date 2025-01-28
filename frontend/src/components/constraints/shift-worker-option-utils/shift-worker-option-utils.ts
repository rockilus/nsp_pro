import { ShiftWorkerOptionT } from "../../../types/constraint";

export const getShiftWorkerOptionDisplayName = (
  option: ShiftWorkerOptionT,
  negString: string
): string => {
  if (option.isBoolDim && option.name === true) {
    return option.categoryName;
  } else if (option.isBoolDim && option.name === false) {
    return `${negString} ${option.categoryName.toLocaleLowerCase()}`;
  }
  return option.name as string;
};

export const expandBoolDimOptions = (
  options: ShiftWorkerOptionT[]
): ShiftWorkerOptionT[] => {
  return options.flatMap((option) => {
    if (option.isBoolDim) {
      return [
        { ...option, name: true },
        { ...option, name: false },
      ];
    } else {
      return [option];
    }
  });
};

export const groupByCategoryName = (
  options: ShiftWorkerOptionT[]
): { [key: string]: ShiftWorkerOptionT[] } => {
  return options.reduce((acc, option) => {
    if (!acc[option.categoryName]) {
      acc[option.categoryName] = [];
    }
    acc[option.categoryName].push(option);
    return acc;
  }, {} as { [key: string]: ShiftWorkerOptionT[] });
};
