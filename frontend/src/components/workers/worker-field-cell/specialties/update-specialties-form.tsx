import React, { useState } from 'react';
import { useTranslation } from '../../../../app/i18n/client';
import { Button } from '@/components/ui/button';
// Component
import UpdateSpecialtiesInput from './update-specialties-input';
// Types
import { SpecialtyT } from '@/types/specialty';

export default function UpdateSpecialtiesForm({
  lng,
  teamId,
  specialties,
  setOpenParent,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
}: {
  lng: string;
  teamId: string;
  specialties: SpecialtyT[];
  setOpenParent: (open: boolean) => void | null;
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
}) {
  const { t } = useTranslation(lng, 'worker-page');

  const [listError, setListError] = useState<boolean>(false);

  const handleClose = async () => {
    if (specialties.length === 0) {
      setListError(true);
    } else {
      setListError(false);
      setOpenParent(false);
    }
  };

  return (
    <div className="w-full" data-testid="update-specialties-form">
      <span data-testid="update-specialties-title">{t('update_specialties')}</span>
      <div className="mt-2">
        <UpdateSpecialtiesInput
          lng={lng}
          specialties={specialties}
          teamId={teamId}
          listError={listError}
          createSpecialty={handleAddSpecialty}
          updateSpecialty={handleUpdateSpecialty}
          deleteSpecialty={handleDeleteSpecialty}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <Button onClick={handleClose} className="mr-1" data-testid="save-specialties-button">
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
