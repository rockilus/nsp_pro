import React, { useState } from 'react';
import { useTranslation } from '../../../../app/i18n/client';
import { Check, X, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// Types
import { SpecialtyT } from '@/types/specialty';

export default function UpdateSpecialtiesInput({
  lng,
  specialties,
  teamId,
  listError,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty,
}: {
  lng: string;
  specialties: SpecialtyT[];
  teamId: string;
  listError: boolean;
  createSpecialty: (newSpecialty: SpecialtyT) => void;
  updateSpecialty: (specialty: SpecialtyT) => void;
  deleteSpecialty: (specialtyId: string) => void;
}) {
  const { t } = useTranslation(lng, 'shift-page');

  const [newSpecialty, setNewSpecialty] = useState<SpecialtyT>({
    id: '',
    teamId: teamId,
    name: '',
    deleted: false,
  });
  const [SpecialtyEditing, setSpecialtyEditing] = useState<SpecialtyT | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [errorEditing, setErrorEditing] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewSpecialty({ ...newSpecialty, name: event.target.value });
  };

  const handleAddOption = () => {
    if (newSpecialty.name.trim() !== '') {
      createSpecialty(newSpecialty);
      setNewSpecialty({
        id: '',
        teamId: teamId,
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

  const handleEditSpecialty = () => {
    if (SpecialtyEditing) {
      if (SpecialtyEditing.name.trim() === '') {
        setErrorEditing(true);
      } else {
        updateSpecialty(SpecialtyEditing);
        setSpecialtyEditing(null);
        setErrorEditing(false);
      }
    }
  };

  return (
    <div className="w-full" data-testid="update-specialties-input">
      <div className="flex flex-col gap-1">
        <Input
          placeholder={t('property_new_option')}
          value={newSpecialty.name}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className={error || listError ? 'border-destructive' : ''}
          data-testid="new-specialty-input"
        />
        {(error || listError) && (
          <p className="text-xs text-destructive">{t('property_new_option_helper_text')}</p>
        )}
      </div>
      <div className="mt-2" data-testid="specialties-list">
        {specialties.map((de, index) => (
          <div
            key={index}
            className="flex items-center pl-1"
            data-testid={`specialty-item-${de.id}`}
          >
            {SpecialtyEditing?.id === de.id ? (
              <div
                className="flex w-full items-center gap-1"
                data-testid={`specialty-editing-${de.id}`}
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <Input
                    value={SpecialtyEditing.name}
                    onChange={(e) => setSpecialtyEditing({ ...de, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEditSpecialty();
                      } else if (e.key === 'Escape') {
                        setSpecialtyEditing(null);
                      }
                    }}
                    className={errorEditing ? 'border-destructive' : ''}
                    data-testid={`specialty-edit-input-${de.id}`}
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
                  onClick={handleEditSpecialty}
                  data-testid={`specialty-confirm-edit-${de.id}`}
                  className="h-7 w-7"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSpecialtyEditing(null)}
                  data-testid={`specialty-cancel-edit-${de.id}`}
                  className="h-7 w-7"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex w-full items-center" data-testid={`specialty-display-${de.id}`}>
                <span className="flex-1" data-testid={`specialty-name-${de.id}`}>
                  {de.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSpecialtyEditing(de)}
                  data-testid={`specialty-edit-button-${de.id}`}
                  className="h-7 w-7"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSpecialty(de.id)}
                  data-testid={`specialty-delete-button-${de.id}`}
                  className="h-7 w-7"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
