'use client';

import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import { ShiftDemandTemplateCreateDTO } from '@/types/shift-demand-template';

interface CreateTemplateFormProps {
  onSubmit: (template: ShiftDemandTemplateCreateDTO) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const CreateTemplateForm: React.FC<CreateTemplateFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<ShiftDemandTemplateCreateDTO>({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Template name must be 100 characters or less';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleInputChange =
    (field: keyof ShiftDemandTemplateCreateDTO) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors({ ...errors, [field]: '' });
      }
    };

  return (
    <Card>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <Typography variant="h6" gutterBottom>
            Create Basic Template
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            This will create a basic template with just a name and description. You can add shift
            demands and configure the template pattern after creation.
          </Alert>

          <TextField
            fullWidth
            label="Template Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            error={!!errors.name}
            helperText={errors.name || 'Choose a descriptive name for your template'}
            margin="normal"
            required
            inputProps={{ maxLength: 100 }}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Description (Optional)"
            value={formData.description}
            onChange={handleInputChange('description')}
            error={!!errors.description}
            helperText={errors.description || 'Describe what this template is used for'}
            margin="normal"
            multiline
            rows={3}
            inputProps={{ maxLength: 500 }}
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: 120 }}>
              {loading ? 'Creating...' : 'Create Template'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
