import { ColumnFilter, TableSort } from "../../../types/filter";
import { MultitaskingGroup } from "../../../types/multitasking";
import { ShiftT } from "../../../types/shift";

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

export interface MultitaskingSelectionProps {
  lng: string;
  selectedShiftDemandsCount: number;
  multitaskingGroups: MultitaskingGroup[];
  shifts: ShiftT[];
  onConfirmMultitasking: () => void;
  onEditMultitasking: () => void;
  onCancelMultitaskingMode: () => void;
  onDeleteGroup?: (groupId: string) => Promise<void>;
}

export interface ShiftDemandActionToolbarProps
  extends FilterSortProps, BulkSelectionProps {
  showBulkMode: boolean;
  showFilters: boolean;
  // Multitasking props
  showMultitaskingMode?: boolean;
  multitaskingProps?: MultitaskingSelectionProps;
}
