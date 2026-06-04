import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Component
import NewDimensionDimEntriesInput from './new-dimension-dim-entries-input';
import LinkDimensionList from './link-dimension-list';
// Styles
import '../../../styles/tab-container-styles.css';
// Types
import { DimensionType } from '@/types/dimension';
import { DimensionEntryType } from '@/types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { DimensionT } from '@/types/dimension';

export default function NewDimensionForm({
  lng,
  selectedTeamId,
  dimensionType,
  dimensions,
  dimEntries,
  setOpenParent,
  handleAddDimension,
  handleUpdateDimension,
}: {
  lng: string;
  selectedTeamId: string;
  dimensionType: DimensionType;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  setOpenParent: (open: boolean) => void | null;
  handleAddDimension: (newDimension: DimensionT, newDimEntries: DimEntryT[]) => Promise<boolean>;
  handleUpdateDimension: (dimension: DimensionT) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [name, setName] = useState<string>('');
  const [entryType, setEntryType] = useState<DimensionEntryType | null>(null);
  const [dimEntriesNewDim, setDimEntriesNewDim] = useState<DimEntryT[]>([]);
  const [nameError, setNameError] = useState<boolean>(false);
  const [entryTypeError, setEntryTypeError] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);

  const dimensionEntryTypeOptions: {
    value: DimensionEntryType;
    label: string;
  }[] = [
    { value: DimensionEntryType.BOOL, label: t('type_bool') },
    { value: DimensionEntryType.DIM_ENTRIES, label: t('type_list') },
  ];

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleTypeChange = (value: string) => {
    setDimEntriesNewDim([]);
    setEntryType(Number(value) as DimensionEntryType);
  };

  const handleAddDimEntry = (newDimEntry: DimEntryT) => {
    if (newDimEntry.name.trim() !== '') {
      setDimEntriesNewDim([...dimEntriesNewDim, newDimEntry]);
      setListError(false);
    } else {
      setListError(true);
    }
  };

  const handleRemoveDimEntry = (index: number) => {
    const updatedOptions = [...dimEntriesNewDim];
    updatedOptions.splice(index, 1);
    setDimEntriesNewDim(updatedOptions);
  };

  const handleAddElement = async () => {
    if (name.trim() === '') {
      setNameError(true);
    } else {
      setNameError(false);
    }
    if (entryType === null) {
      setEntryTypeError(true);
    } else {
      setEntryTypeError(false);
    }
    if (entryType === DimensionEntryType.DIM_ENTRIES && dimEntriesNewDim.length === 0) {
      setListError(true);
    } else {
      setListError(false);
    }

    if (
      name.trim() !== '' &&
      entryType !== null &&
      (entryType !== DimensionEntryType.DIM_ENTRIES || dimEntriesNewDim.length > 0) &&
      selectedTeamId
    ) {
      const newDimension: DimensionT = {
        id: '',
        teamId: selectedTeamId,
        dimTypes: [dimensionType],
        name: name,
        entryType: entryType,
        deleted: false,
      };
      const addedOK = await handleAddDimension(newDimension, dimEntriesNewDim);
      if (addedOK) {
        setName('');
        setEntryType(null);
        setDimEntriesNewDim([]);
        if (setOpenParent) {
          setOpenParent(false);
        }
      }
    }
  };

  return (
    <div className="w-full" data-testid="new-dimension-form">
      <div className="flex flex-col gap-1">
        <Input
          placeholder={t('name')}
          value={name}
          onChange={handleNameChange}
          className={nameError ? 'border-destructive' : ''}
          data-testid="new-dimension-name-field"
        />
        {nameError && <p className="text-xs text-destructive">Please enter a name</p>}
      </div>
      <div className="mt-2">
        <div className="flex flex-col gap-1" data-testid="new-dimension-type-select">
          <Select
            value={entryType !== null ? String(entryType) : undefined}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className={entryTypeError ? 'border-destructive' : ''}>
              <SelectValue placeholder={t('property_type')} />
            </SelectTrigger>
            <SelectContent>
              {dimensionEntryTypeOptions.map((option, index) => (
                <SelectItem
                  key={index}
                  value={String(option.value)}
                  data-testid={`new-dimension-type-option-${option.value}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {entryTypeError && (
            <p className="text-xs text-destructive" data-testid="new-dimension-type-error">
              {t('property_type_helper_text')}
            </p>
          )}
        </div>
      </div>
      {entryType === DimensionEntryType.DIM_ENTRIES && (
        <div className="mt-2" data-testid="new-dimension-tags-section">
          <NewDimensionDimEntriesInput
            lng={lng}
            dimEntries={dimEntriesNewDim}
            listError={listError}
            addDimEntry={handleAddDimEntry}
            removeDimEntry={handleRemoveDimEntry}
          />
        </div>
      )}
      <div className="mt-2.5 flex justify-end">
        <Button onClick={handleAddElement} data-testid="new-dimension-add-button">
          {t('add')}
        </Button>
      </div>
      <div className="divider" />
      <LinkDimensionList
        lng={lng}
        dimensionType={dimensionType}
        dimensions={dimensions}
        dimEntries={dimEntries}
        setOpenParent={setOpenParent}
        handleUpdateDimension={handleUpdateDimension}
      />
    </div>
  );
}
