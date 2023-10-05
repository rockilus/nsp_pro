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

interface Constraint {
  name: string;
  when: QueryFilter[]; // list connected by "and", "or" not supported
  on: string;
  then: QueryFilter[]; // list connected by "and", "or" not supported
  daysAfter: string;
}
  