import React, { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
// Components
import DimensionCell from '../shift-worker-shared/dimension/dimension-cell';
import AttributeCell from '../shift-worker-shared/attribute/attribute-cell';
import WorkerFieldCell from './worker-field-cell/worker-field-cell';
import WorkerSpecialtyHeaderCell from './worker-field-cell/specialties/worker-specialty-header-cell';
import ColumnSortFilterMenu from '../table/ColumnSortFilterMenu';
// Styles
import '../../styles/text-styles.css';
import '../../styles/table-styles.css';
// Types
import { WorkerT } from '../../types/worker';
import { DimensionT, DimensionType, DimensionEntryType } from '../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { AttributeT, AttributeOwnerType } from '../../types/attribute';
import { SpecialtyT } from '@/types/specialty';
import { ColumnDefinition, ColumnFilter, TableSort } from '../../types/filter';

export default function WorkerTable({
  lng,
  selectedTeamId,
  dimensions,
  dimEntries,
  workers,
  specialties,
  defaultWorkerFields,
  tableHeight = '70vh',
  workerColumns,
  currentSort,
  onSort,
  onFilter,
  handleAddWorker,
  handleUpdateWorker,
  handleDeleteWorker,
  handleAddDimension,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
  handleUpdateAttribute,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
}: WorkerTableProps) {
  const { t } = useTranslation(lng, 'worker-page');

  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});

  const dimensionsDisplayed = useMemo(
    () => dimensions.filter((dim) => dim.dimTypes.includes(DimensionType.WORKER)),
    [dimensions],
  );

  return (
    <div>
      <div className="worker-table-container" style={{ height: tableHeight, overflow: 'auto' }}>
        <Table className="worker-table" aria-label="worker table" data-testid="worker-table">
          <WorkerTableHeader
            lng={lng}
            selectedTeamId={selectedTeamId}
            specialties={specialties}
            defaultWorkerFields={defaultWorkerFields}
            dimensionsDisplayed={dimensionsDisplayed}
            dimEntries={dimEntries}
            workerColumns={workerColumns}
            currentSort={currentSort}
            onSort={onSort}
            onFilter={onFilter}
            handleAddSpecialty={handleAddSpecialty}
            handleUpdateSpecialty={handleUpdateSpecialty}
            handleDeleteSpecialty={handleDeleteSpecialty}
            handleUpdateDimension={handleUpdateDimension}
            handleDeleteDimension={handleDeleteDimension}
            handleAddDimEntry={handleAddDimEntry}
            handleUpdateDimEntry={handleUpdateDimEntry}
            handleDeleteDimEntry={handleDeleteDimEntry}
          />
          <TableBody>
            {workers.map((worker, workerIndex) => (
              <WorkerTableRow
                key={worker.id || workerIndex}
                lng={lng}
                selectedTeamId={selectedTeamId}
                worker={worker}
                specialties={specialties}
                defaultWorkerFields={defaultWorkerFields}
                dimensionsDisplayed={dimensionsDisplayed}
                dimEntries={dimEntries}
                bodyEditing={bodyEditing}
                setBodyEditing={setBodyEditing}
                handleUpdateWorker={handleUpdateWorker}
                handleDeleteWorker={handleDeleteWorker}
                handleUpdateAttribute={handleUpdateAttribute}
              />
            ))}
            {workers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={defaultWorkerFields.length + dimensionsDisplayed.length + 1}
                  className="py-4 text-center text-muted-foreground"
                  data-testid="worker-table-empty-state"
                >
                  {t('no_workers_found')}
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
interface WorkerTableProps {
  lng: string;
  selectedTeamId: string;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  workers: WorkerT[];
  specialties: SpecialtyT[];
  defaultWorkerFields: Record<string, string>[];
  tableHeight?: string;
  workerColumns: ColumnDefinition[];
  currentSort?: TableSort | null;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleAddWorker: () => void;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
  handleDeleteWorker: (workerId: string) => void;
  handleAddDimension: (newDimension: DimensionT, dimEntries: DimEntryT[]) => Promise<boolean>;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
}

interface WorkerTableHeaderProps {
  lng: string;
  selectedTeamId: string;
  specialties: SpecialtyT[];
  defaultWorkerFields: Record<string, string>[];
  dimensionsDisplayed: DimensionT[];
  dimEntries: DimEntryT[];
  workerColumns: ColumnDefinition[];
  currentSort?: TableSort | null;
  onSort?: (sort: TableSort | null) => void;
  onFilter?: (filter: ColumnFilter) => void;
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
}

interface WorkerTableRowProps {
  lng: string;
  selectedTeamId: string;
  worker: WorkerT;
  specialties: SpecialtyT[];
  defaultWorkerFields: Record<string, string>[];
  dimensionsDisplayed: DimensionT[];
  dimEntries: DimEntryT[];
  bodyEditing: { [key: string]: string };
  setBodyEditing: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
  handleDeleteWorker: (workerId: string) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}

interface WorkerNameCellProps {
  worker: WorkerT;
  bodyEditing: { [key: string]: string };
  setBodyEditing: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}

// Worker Name Cell Component
function WorkerNameCell({
  worker,
  bodyEditing,
  setBodyEditing,
  handleUpdateWorker,
}: WorkerNameCellProps) {
  const [valueState, setValueState] = useState<string>(worker.name);
  const editing = bodyEditing[worker.id] === 'name';

  const handleEditConfirm = async () => {
    if (valueState !== worker.name) {
      handleUpdateWorker({
        ...worker,
        name: valueState,
      });
    }
    setBodyEditing({});
  };

  const handleEditCancel = () => {
    setBodyEditing({});
    setValueState(worker.name);
  };

  return (
    <TableCell
      className="worker-table-first-column"
      onClick={() => !editing && setBodyEditing({ [worker.id]: 'name' })}
      data-testid="worker-name-cell"
      data-worker-id={worker.id}
    >
      <div className="worker-name-cell">
        {editing ? (
          <Input
            type="text"
            value={valueState}
            onChange={(e) => setValueState(e.target.value)}
            onBlur={handleEditConfirm}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditConfirm();
              } else if (e.key === 'Escape') {
                handleEditCancel();
              }
            }}
            autoFocus
            className="h-8"
            data-testid={`worker-name-input-${worker.id}`}
            data-state="editing"
          />
        ) : (
          <div
            className="worker-name-text"
            data-testid={`worker-name-display-${worker.id}`}
            data-state="display"
            data-worker-name={worker.name || 'Unnamed Worker'}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{worker.name || 'Unnamed Worker'}</span>
              </TooltipTrigger>
              <TooltipContent>{worker.name || 'Unnamed Worker'}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TableCell>
  );
}

// Worker Table Header Component
function WorkerTableHeader({
  lng,
  selectedTeamId,
  specialties,
  defaultWorkerFields,
  dimensionsDisplayed,
  dimEntries,
  workerColumns,
  currentSort,
  onSort,
  onFilter,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
}: WorkerTableHeaderProps) {
  const { t } = useTranslation(lng, 'worker-page');

  return (
    <TableHeader className="worker-table-header">
      <TableRow>
        {/* First column header - Worker name */}
        <TableCell className="worker-table-first-header-cell" data-testid="worker-name-header-cell">
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="table-header-default">{t('name')}</span>
              </TooltipTrigger>
              <TooltipContent>{t('name_tooltip')}</TooltipContent>
            </Tooltip>
            {onSort && onFilter && (
              <ColumnSortFilterMenu
                column={workerColumns.find((col) => col.id === 'name')!}
                currentSort={currentSort?.columnId === 'name' ? currentSort : undefined}
                currentFilter={undefined}
                onSort={onSort}
                onFilter={onFilter}
              />
            )}
          </div>
        </TableCell>

        {/* Default worker fields */}
        {defaultWorkerFields.slice(1).map((field, index) =>
          field.name === 'specialties' ? (
            <WorkerSpecialtyHeaderCell
              key={index}
              lng={lng}
              teamId={selectedTeamId}
              specialties={specialties}
              column={workerColumns.find((col) => col.id === 'specialties')}
              currentSort={currentSort?.columnId === 'specialties' ? currentSort : undefined}
              onSort={onSort}
              onFilter={onFilter}
              handleAddSpecialty={handleAddSpecialty}
              handleUpdateSpecialty={handleUpdateSpecialty}
              handleDeleteSpecialty={handleDeleteSpecialty}
            />
          ) : (
            <TableCell
              key={index}
              className="worker-table-cell"
              data-testid={`worker-${field.name}-header-cell`}
            >
              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="table-header-default">{field.label}</span>
                  </TooltipTrigger>
                  <TooltipContent>{field.tooltip}</TooltipContent>
                </Tooltip>
                {onSort && onFilter && (
                  <ColumnSortFilterMenu
                    column={workerColumns.find((col) => col.id === field.name)!}
                    currentSort={currentSort?.columnId === field.name ? currentSort : undefined}
                    currentFilter={undefined}
                    onSort={onSort}
                    onFilter={onFilter}
                  />
                )}
              </div>
            </TableCell>
          ),
        )}

        {/* Dynamic dimensions */}
        {dimensionsDisplayed.map((dim, dIndex) => (
          <DimensionCell
            key={dIndex}
            lng={lng}
            selectedTeamId={selectedTeamId}
            dimensionTypeTable={DimensionType.WORKER}
            dimension={dim}
            dimEntries={dimEntries.filter((de) => de.dimensionId === dim.id)}
            column={workerColumns.find((col) => col.id === `dimension_${dim.id}`)}
            currentSort={currentSort?.columnId === `dimension_${dim.id}` ? currentSort : undefined}
            onSort={onSort}
            onFilter={onFilter}
            handleUpdateDimension={handleUpdateDimension}
            handleDeleteDimension={handleDeleteDimension}
            handleAddDimEntry={handleAddDimEntry}
            handleUpdateDimEntry={handleUpdateDimEntry}
            handleDeleteDimEntry={handleDeleteDimEntry}
            className={`custom-column ${
              dIndex === 0 && dimensionsDisplayed.length > 0 ? 'first-custom-column' : ''
            }`.trim()}
          />
        ))}

        {/* Actions column header */}
        <TableCell
          className="worker-table-actions-header"
          data-testid="worker-actions-header-cell"
        />
      </TableRow>
    </TableHeader>
  );
}

// Worker Table Row Component
function WorkerTableRow({
  lng,
  selectedTeamId,
  worker,
  specialties,
  defaultWorkerFields,
  dimensionsDisplayed,
  dimEntries,
  bodyEditing,
  setBodyEditing,
  handleUpdateWorker,
  handleDeleteWorker,
  handleUpdateAttribute,
}: WorkerTableRowProps) {
  const { t } = useTranslation(lng, 'worker-page');

  return (
    <TableRow className="worker-table-row" data-testid={`worker-row-${worker.id}`}>
      {/* First column - Worker name */}
      <WorkerNameCell
        worker={worker}
        bodyEditing={bodyEditing}
        setBodyEditing={setBodyEditing}
        handleUpdateWorker={handleUpdateWorker}
      />

      {/* Default worker fields (skip first one since it's in the name cell) */}
      {defaultWorkerFields.slice(1).map((field, index) => (
        <WorkerFieldCell
          key={index}
          lng={lng}
          worker={worker}
          workerField={field.name}
          specialties={specialties}
          editing={bodyEditing}
          setEditing={setBodyEditing}
          handleUpdateWorker={handleUpdateWorker}
        />
      ))}

      {/* Dynamic dimensions */}
      {dimensionsDisplayed.map((dim, dIndex) => {
        const attribute = worker.attributes.find((a) => a.dimensionId === dim.id);
        return (
          <AttributeCell
            key={dIndex}
            selectedTeamId={selectedTeamId}
            attribute={
              attribute
                ? attribute
                : {
                    id: '',
                    ownerType: AttributeOwnerType.WORKER,
                    ownerId: worker.id,
                    dimensionId: dim.id,
                    value: dim.entryType === DimensionEntryType.BOOL ? false : '',
                    dimEntryIds: [],
                  }
            }
            dimension={dim}
            dimEntries={dimEntries.filter((de) => de.dimensionId === dim.id)}
            editing={bodyEditing[worker.id] === dim.id}
            setEditing={setBodyEditing}
            handleUpdateAttribute={handleUpdateAttribute}
            className={dIndex === 0 && dimensionsDisplayed.length > 0 ? 'first-custom-column' : ''}
          />
        );
      })}

      {/* Actions column */}
      <TableCell className="worker-table-actions" data-testid="worker-actions-cell">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteWorker(worker.id)}
              data-testid={`worker-delete-button-${worker.id}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('delete_member_tooltip')}</TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
