import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
// Types
import { DimEntryT } from '@/types/dim-entry';

export default function NewDimensionDimEntriesInput({
  lng,
  dimEntries,
  listError,
  addDimEntry,
  removeDimEntry,
}: {
  lng: string;
  dimEntries: DimEntryT[];
  listError: boolean;
  addDimEntry: (newDimEntry: DimEntryT) => void;
  removeDimEntry: (index: number) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [newDimEntry, setNewDimEntry] = useState<DimEntryT>({
    id: '',
    dimensionId: '',
    name: '',
    deleted: false,
  });
  const [error, setError] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewDimEntry({ ...newDimEntry, name: event.target.value });
  };

  const handleAddOption = () => {
    if (newDimEntry.name.trim() !== '') {
      addDimEntry(newDimEntry);
      setNewDimEntry({ id: '', dimensionId: '', name: '', deleted: false });
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddOption();
    }
  };

  const handleDeleteOption = (index: number) => {
    removeDimEntry(index);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1">
        <Input
          placeholder={t('property_new_option')}
          value={newDimEntry.name}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className={error || listError ? 'border-destructive' : ''}
        />
        {(error || listError) && (
          <p className="text-xs text-destructive">{t('property_new_option_helper_text')}</p>
        )}
      </div>
      <div className="mt-2">
        {dimEntries.map((de, index) => (
          <div key={index} className="flex items-center py-0.5 pl-1">
            <span className="flex-1">{de.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteOption(index)}
              className="h-7 w-7"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
