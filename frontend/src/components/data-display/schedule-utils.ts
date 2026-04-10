// Types
import { BreachT } from '@/types/breach';

export const getBreachType = (breaches: BreachT[]): string => {
  if (breaches.length === 0) {
    return 'noBreach';
  }
  if (breaches.some((breach) => breach.hardToSoft)) {
    return 'hardBreach';
  }
  return 'softBreach';
};
