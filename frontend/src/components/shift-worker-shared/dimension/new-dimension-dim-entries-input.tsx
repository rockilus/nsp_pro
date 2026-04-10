import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Box from '@mui/material/Box';
import CancelIcon from '@mui/icons-material/Cancel';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
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
    <Box sx={{ width: '100%' }}>
      <TextField
        label={t('property_new_option')}
        variant="outlined"
        value={newDimEntry.name}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        error={error || listError}
        helperText={error || listError ? t('property_new_option_helper_text') : ''}
        sx={{ width: '100%' }}
      />
      <Box mt={2}>
        {dimEntries.map((de, index) => (
          <Box key={index} display="flex" alignItems="center" sx={{ paddingLeft: 0.5 }}>
            <Box flexGrow={1}>{de.name}</Box>
            <IconButton onClick={() => handleDeleteOption(index)}>
              <CancelIcon />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
