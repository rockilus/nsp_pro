import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Check, X, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// Types
import { DimEntryT } from '@/types/dim-entry';

export default function UpdateDimensionDimEntriesInput({
  lng,
  dimEntries,
  dimensionId,
  listError,
  createDimEntry,
  updateDimEntry,
  deleteDimEntry,
}: {
  lng: string;
  dimEntries: DimEntryT[];
  dimensionId: string;
  listError: boolean;
  createDimEntry: (newDimEntry: DimEntryT) => void;
  updateDimEntry: (dimEntry: DimEntryT) => void;
  deleteDimEntry: (dimEntryId: string) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [newDimEntry, setNewDimEntry] = useState<DimEntryT>({
    id: '',
    dimensionId: dimensionId,
    name: '',
    deleted: false,
  });
  const [DimEntryEditing, setDimEntryEditing] = useState<DimEntryT | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [errorEditing, setErrorEditing] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewDimEntry({ ...newDimEntry, name: event.target.value });
  };

  const handleAddOption = () => {
    if (newDimEntry.name.trim() !== '') {
      createDimEntry(newDimEntry);
      setNewDimEntry({
        id: '',
        dimensionId: dimensionId,
        name: '',
        deleted: false,
      });
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

  const handleEditDimEntry = () => {
    if (DimEntryEditing) {
      if (DimEntryEditing.name.trim() === '') {
        setErrorEditing(true);
      } else {
        updateDimEntry(DimEntryEditing);
        setDimEntryEditing(null);
        setErrorEditing(false);
      }
    }
  };

  return (
    <div className="w-full" data-testid={`dim-entries-input-${dimensionId}`}>
      <div className="flex flex-col gap-1">
        <Input
          placeholder={t('property_new_option')}
          value={newDimEntry.name}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className={error || listError ? 'border-destructive' : ''}
          data-testid={`new-dim-entry-field-${dimensionId}`}
        />
        {(error || listError) && (
          <p className="text-xs text-destructive">{t('property_new_option_helper_text')}</p>
        )}
      </div>
      <div className="mt-2" data-testid={`dim-entries-list-${dimensionId}`}>
        {dimEntries.map((de, index) => (
          <div
            key={index}
            className="flex items-center pl-1"
            data-testid={`dim-entry-item-${de.id}`}
          >
            {DimEntryEditing?.id === de.id ? (
              <div
                className="flex w-full items-center gap-1"
                data-testid={`dim-entry-editing-${de.id}`}
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <Input
                    value={DimEntryEditing.name}
                    onChange={(e) => setDimEntryEditing({ ...de, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEditDimEntry();
                      } else if (e.key === 'Escape') {
                        setDimEntryEditing(null);
                      }
                    }}
                    className={errorEditing ? 'border-destructive' : ''}
                    data-testid={`dim-entry-edit-field-${de.id}`}
                  />
                  {errorEditing && (
                    <p className="text-xs text-destructive">
                      {t('property_new_option_helper_text')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditDimEntry}
                  data-testid={`dim-entry-confirm-edit-${de.id}`}
                  className="h-7 w-7"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDimEntryEditing(null)}
                  data-testid={`dim-entry-cancel-edit-${de.id}`}
                  className="h-7 w-7"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <span className="flex-1">{de.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDimEntryEditing(de)}
                  data-testid={`dim-entry-edit-btn-${de.id}`}
                  className="h-7 w-7"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDimEntry(de.id)}
                  data-testid={`dim-entry-delete-btn-${de.id}`}
                  className="h-7 w-7"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
