import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import { ColumnFilter } from '../../../types/filter';

interface TextFilterProps {
  onApply: (filter: ColumnFilter) => void;
  onClose: () => void;
  columnId: string;
  label: string;
  currentValue?: string;
}

export default function TextFilter({
  onApply,
  onClose,
  columnId,
  label,
  currentValue,
}: TextFilterProps) {
  const [value, setValue] = useState(currentValue || '');

  const handleApply = () => {
    if (value.trim()) {
      onApply({
        id: columnId,
        type: 'text',
        value: value.trim(),
        label: `${label} contains "${value.trim()}"`,
      });
    }
    onClose();
  };

  return (
    <Box sx={{ p: 2, minWidth: 250 }}>
      <TextField
        fullWidth
        size="small"
        label={`Filter ${label}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleApply()}
        autoFocus
      />
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button onClick={handleApply} variant="contained" size="small">
          Apply
        </Button>
        <Button onClick={onClose} size="small">
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
