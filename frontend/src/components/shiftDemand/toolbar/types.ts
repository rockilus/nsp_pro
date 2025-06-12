import { ColumnFilter, TableSort } from "../../../types/filter";

export interface FilterSortProps {
  lng: string;
  filters: ColumnFilter[];
  sort: TableSort | null;
  onRemoveFilter: (filterId: string) => void;
  onRemoveSort: () => void;
  onResetAll: () => void;
}

export interface BulkSelectionProps {
  lng: string;
  selectedCellsCount: number;
  bulkValue: string;
  onBulkValueChange: (value: string) => void;
  onApplyBulkChange: () => void;
  onDeleteBulkSelection: () => void;
  onCancelBulkMode: () => void;
}

export interface ShiftDemandActionToolbarProps
  extends FilterSortProps,
    BulkSelectionProps {
  showBulkMode: boolean;
  showFilters: boolean;
}
