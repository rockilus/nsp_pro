export type FilterType = 'text' | 'select' | 'date' | 'boolean';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnFilter {
  id: string;
  type: FilterType;
  value: any;
  label: string;
}

export interface TableSort {
  columnId: string;
  direction: SortDirection;
  label: string;
}

export interface TableState {
  filters: ColumnFilter[];
  sort: TableSort | null;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  type: FilterType;
  getValue: (item: any) => any;
  getDisplayValue?: (item: any) => string;
  getOptions?: () => Array<{ value: any; label: string }>;
}
