import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../app/i18n/client';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
// Components
import DimensionCell from '../shift-worker-shared/dimension/dimension-cell';
import ShiftFieldCell from './shift-field-cell/shift-field-cell';
import AttributeCell from '../shift-worker-shared/attribute/attribute-cell';
import ColumnSortFilterMenu from '../table/ColumnSortFilterMenu';
import {
  filterWorkShifts,
  filterRestShifts,
  filterRestShiftsNonDefault,
} from './shift-utils/shift-utils';
// Styles
import '../../styles/tab-container-styles.css';
import '../../styles/text-styles.css';
import '../../styles/table-styles.css';
import './shift-table.css';
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from '../../types/shift';
import { DimensionType } from '../../types/dimension';
import { DimensionEntryType } from '../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { DimensionT } from '../../types/dimension';
import { AttributeOwnerType } from '../../types/attribute';
import { AttributeT } from '../../types/attribute';
import { SpecialtyT } from '@/types/specialty';
import { ColumnDefinition, ColumnFilter, TableSort } from '../../types/filter';

dayjs.extend(utc);

export default function ShiftTable({
  lng,
  selectedTeamId,
  isRest,
  dimensions,
  dimEntries,
  shifts,
  specialties,
  linkShifts,
  defaultShiftFields,
  tableHeight = '70vh',
  shiftColumns,
  currentSort,
  onSort,
  onFilter,
  handleUpdateShift,
  handleDeleteShift,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
  handleUpdateAttribute,
}: ShiftTableProps) {
  const { t } = useTranslation(lng, 'shift-page');

  const [showDefaults, setShowDefaults] = useState(false);
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});

  const displayedShifts: ShiftT[] = isRest
    ? showDefaults
      ? filterRestShifts(shifts)
      : filterRestShiftsNonDefault(shifts)
    : filterWorkShifts(shifts);

  const displayedDimensions = useMemo(
    () =>
      dimensions.filter((dim: DimensionT) =>
        isRest
          ? dim.dimTypes.includes(DimensionType.REST_SHIFT)
          : dim.dimTypes.includes(DimensionType.SHIFT),
      ),
    [dimensions, isRest],
  );

  const isLeaveOrOff = (shift: ShiftT) =>
    shift.leaveType !== ShiftLeaveType.NONE || shift.restType === ShiftRestType.OFF;

  return (
    <div>
      <div className="shared-table-container" style={{ height: tableHeight, overflow: 'auto' }}>
        <Table
          className="shared-table min-w-[650px]"
          aria-label="shift table"
          data-testid="shift-table"
        >
          <TableHeader className="shared-table-header">
            <TableRow>
              {defaultShiftFields.map((field: Record<string, string>, index: number) => (
                <TableCell
                  key={index}
                  className={`py-0 font-bold ${
                    ['acronym', 'duty', 'recuperation', 'start_time', 'end_time'].includes(
                      field.name,
                    )
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="table-header-default">{field.label}</span>
                      </TooltipTrigger>
                      <TooltipContent>{field.tooltip}</TooltipContent>
                    </Tooltip>
                    {onSort &&
                      onFilter &&
                      shiftColumns &&
                      (() => {
                        const column = shiftColumns.find((col) => col.id === field.name);
                        return column ? (
                          <ColumnSortFilterMenu
                            column={column}
                            currentSort={
                              currentSort?.columnId === field.name ? currentSort : undefined
                            }
                            currentFilter={undefined}
                            onSort={onSort}
                            onFilter={onFilter}
                          />
                        ) : null;
                      })()}
                  </div>
                </TableCell>
              ))}
              {displayedDimensions.map((dim: DimensionT, dIndex: number) => (
                <DimensionCell
                  key={dIndex}
                  lng={lng}
                  selectedTeamId={selectedTeamId}
                  dimensionTypeTable={isRest ? DimensionType.REST_SHIFT : DimensionType.SHIFT}
                  dimension={dim}
                  dimEntries={dimEntries.filter((de: DimEntryT) => de.dimensionId === dim.id)}
                  column={shiftColumns?.find((col) => col.id === `dimension_${dim.id}`)}
                  currentSort={
                    currentSort?.columnId === `dimension_${dim.id}` ? currentSort : undefined
                  }
                  onSort={onSort}
                  onFilter={onFilter}
                  handleUpdateDimension={handleUpdateDimension}
                  handleDeleteDimension={handleDeleteDimension}
                  handleAddDimEntry={handleAddDimEntry}
                  handleUpdateDimEntry={handleUpdateDimEntry}
                  handleDeleteDimEntry={handleDeleteDimEntry}
                  className={`custom-column ${
                    dIndex === 0 && displayedDimensions.length > 0 ? 'first-custom-column' : ''
                  }`.trim()}
                />
              ))}
              <TableCell className="shared-table-actions-header p-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedShifts.map((shift: ShiftT, shiftIndex: number) => (
              <TableRow
                key={shiftIndex}
                className={`shared-table-row ${isLeaveOrOff(shift) ? 'bg-muted/30' : ''}`}
                data-testid={`shift-row-${shift.id}`}
              >
                {defaultShiftFields.map((field: Record<string, string>, index: number) => (
                  <ShiftFieldCell
                    key={index}
                    lng={lng}
                    shift={shift}
                    specialties={specialties}
                    shiftField={field.name}
                    editing={bodyEditing}
                    setEditing={setBodyEditing}
                    handleUpdateShift={handleUpdateShift}
                  />
                ))}
                {displayedDimensions.map((dim: DimensionT, dIndex: number) => {
                  const attribute = shift.attributes.find(
                    (a: AttributeT) => a.dimensionId === dim.id,
                  );
                  return (
                    <AttributeCell
                      key={dIndex}
                      selectedTeamId={selectedTeamId}
                      attribute={
                        attribute
                          ? attribute
                          : {
                              id: '',
                              ownerType: AttributeOwnerType.SHIFT,
                              ownerId: shift.id,
                              dimensionId: dim.id,
                              value: dim.entryType === DimensionEntryType.BOOL ? false : '',
                              dimEntryIds: [],
                            }
                      }
                      dimension={dim}
                      dimEntries={dimEntries.filter((de: DimEntryT) => de.dimensionId === dim.id)}
                      editing={bodyEditing[shift.id] === dim.id}
                      setEditing={setBodyEditing}
                      handleUpdateAttribute={handleUpdateAttribute}
                      className={
                        dIndex === 0 && displayedDimensions.length > 0 ? 'first-custom-column' : ''
                      }
                    />
                  );
                })}
                <TableCell className="shared-table-actions py-0">
                  <div className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={isLeaveOrOff(shift)}
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteShift(shift.id)}
                          data-testid={`shift-delete-button-${shift.id}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('delete_shift_tooltip')}</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayedShifts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={defaultShiftFields.length + displayedDimensions.length + 1}
                  className="py-4 text-center text-muted-foreground"
                  data-testid="shift-table-empty-state"
                >
                  {t(isRest ? 'no_rest_shifts_found' : 'no_shifts_found')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Types
interface ShiftTableProps {
  lng: string;
  selectedTeamId: string;
  isRest: boolean;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  shifts: ShiftT[];
  specialties: SpecialtyT[];
  linkShifts: any[];
  defaultShiftFields: Record<string, string>[];
  tableHeight?: string;
  shiftColumns?: ColumnDefinition[];
  currentSort?: TableSort | null;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleUpdateShift: (updatedShift: ShiftT) => void;
  handleDeleteShift: (shiftId: string) => void;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}
