import { ObjectiveBreachT } from "../components/Schedule/types";

export const getBreachType = (breaches: ObjectiveBreachT[]): string => {
  if (breaches.length === 0) {
    return "noBreach";
  }
  if (breaches.some((breach) => breach.hardToSoft)) {
    return "hardBreach";
  }
  return "softBreach";
};
