type DimensionType = 'text' | 'select' | 'number';
// Operator will change
type Operator = 'equal' | 'not equal' | 'less than' | 'greater than';

interface Row {
  name: string;
  [dimensionKey: string]: string; // This allows for dynamic properties based on dimensions.
}

interface Dimension {
  name: string;
  type: DimensionType;
}

interface QueryFilter {
  column: string,
  operator: Operator,
  value: string | number | string[],
};

interface Config {
  rows: Row[];
  columns: Dimension[];
}

type DayIdT = 'any' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface DayFilter {
  day: DayIdT | number; // 'day ID' or specific relative day (0 for the same day, 1 for next day, etc.)
  filters: QueryFilter[];
};

interface Constraint {
  name: string;
  when: DayFilter[]; 
  then: DayFilter[];
}
  