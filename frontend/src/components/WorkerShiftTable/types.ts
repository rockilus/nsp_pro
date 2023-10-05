export type ColumnT = {
  id: string;
  name: string;
  entryType: string;
  entryOptions: string[];
  defaultColumn: boolean;
};

export type RowT = CellT[];

export type CellT = {
  id: string;
  value: string | number | boolean;
  columnId: string;
  rowId: string;
};
