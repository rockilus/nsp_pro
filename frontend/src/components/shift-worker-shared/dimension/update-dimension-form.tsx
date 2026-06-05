import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// Component
import UpdateDimensionDimEntriesInput from './update-dimension-dim-entries-input';
import DialogDimensionDel from './dialog-dimension-del';
// Types
import { DimensionEntryType, DimensionT, DimensionType } from '../../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';

export default function UpdateDimensionForm({
  lng,
  selectedTeamId,
  dimensionTypeTable,
  dimension: dimension,
  dimEntries,
  setOpenParent,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
}: {
  lng: string;
  selectedTeamId: string;
  dimensionTypeTable: DimensionType;
  dimension: DimensionT;
  dimEntries: DimEntryT[];
  setOpenParent: (open: boolean) => void | null;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (DimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [name, setName] = useState<string>(dimension.name);
  const [nameError, setNameError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleUpdateDimensionName = async () => {
    if (name.trim() === '') {
      setNameError(true);
    } else {
      setNameError(false);
    }
    if (dimension.entryType === DimensionEntryType.DIM_ENTRIES && dimEntries.length === 0) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== '' &&
      (dimension.entryType !== DimensionEntryType.DIM_ENTRIES || dimEntries.length > 0) &&
      selectedTeamId
    ) {
      if (name !== dimension.name) {
        try {
          const newDimension: DimensionT = { ...dimension, name: name };
          await handleUpdateDimension(newDimension);
          if (setOpenParent) {
            setOpenParent(false);
          }
        } catch (error) {
          console.error('Failed to update dimension:', error);
        }
      } else {
        if (setOpenParent) {
          setOpenParent(false);
        }
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleUpdateDimensionName();
    }
  };

  const handleClickDelete = () => {
    if (dimension.dimTypes.length > 1 && dimension.dimTypes.includes(dimensionTypeTable)) {
      handleUpdateDimension({
        ...dimension,
        dimTypes: dimension.dimTypes.filter((dimType) => dimType !== dimensionTypeTable),
      });
    }
  };

  return (
    <div className="w-full" data-testid={`update-dimension-form-${dimension.id}`}>
      <div className="flex flex-col gap-1">
        <Input
          placeholder={t('name')}
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleKeyPress}
          className={nameError ? 'border-destructive' : ''}
          data-testid={`dimension-name-field-${dimension.id}`}
        />
        {nameError && <p className="text-xs text-destructive">{t('name_helper_text')}</p>}
      </div>
      {dimension.entryType === DimensionEntryType.DIM_ENTRIES && (
        <div className="mt-2" data-testid={`dimension-entries-section-${dimension.id}`}>
          <UpdateDimensionDimEntriesInput
            lng={lng}
            dimEntries={dimEntries}
            dimensionId={dimension.id}
            listError={listError}
            createDimEntry={handleAddDimEntry}
            updateDimEntry={handleUpdateDimEntry}
            deleteDimEntry={handleDeleteDimEntry}
          />
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <Button
          onClick={() => handleUpdateDimensionName()}
          data-testid={`dimension-save-button-${dimension.id}`}
          className="mr-1"
        >
          {t('save')}
        </Button>
        {dimension.dimTypes.length > 1 && dimension.dimTypes.includes(dimensionTypeTable) ? (
          <Button
            variant="outline"
            onClick={handleClickDelete}
            data-testid={`dimension-delete-button-${dimension.id}`}
            className="w-full"
          >
            {t('delete')}
          </Button>
        ) : (
          <DialogDimensionDel
            lng={lng}
            dimensionId={dimension.id}
            handleDeleteDimension={handleDeleteDimension}
          />
        )}
      </div>
    </div>
  );
}
