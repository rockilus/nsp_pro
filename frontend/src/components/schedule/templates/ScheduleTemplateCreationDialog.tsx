import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import { useTranslation } from '../../../app/i18n/client';
import {
  AssignmentTemplateCreateDTO,
  ASSIGNMENT_TEMPLATE_CONSTRAINTS,
} from '../../../types/assignment-template';
import { AssignmentT } from '../../../types/assignment';

interface ScheduleTemplateCreationDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  onTemplateCreated: (template: AssignmentTemplateCreateDTO) => Promise<void>;
  onError: (error: string) => void;
  initialAssignments?: AssignmentT[];
}

export function ScheduleTemplateCreationDialog({
  lng,
  open,
  onClose,
  onTemplateCreated,
  onError,
  initialAssignments,
}: ScheduleTemplateCreationDialogProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [nameError, setNameError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setSubmitError(null);
      setNameError(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setNameError(null);
    setSubmitError(null);

    if (!name || name.trim().length < 1) {
      setNameError(t('template_name_required'));
      return;
    }

    if (name.length > ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
      setNameError(t('template_name_too_long'));
      return;
    }

    setIsLoading(true);
    try {
      await onTemplateCreated({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('error_creating_template'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      data-testid="schedule-template-creation-dialog"
    >
      <DialogTitle>{t('create_new_template')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {initialAssignments && initialAssignments.length > 0 && (
            <Alert severity="info">
              {t('saving_as_template', { count: initialAssignments.length })}
            </Alert>
          )}

          <TextField
            autoFocus
            label={t('template_name')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            error={!!nameError}
            helperText={
              nameError || `${name.length}/${ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH}`
            }
            disabled={isLoading}
            required
            inputProps={{ 'data-testid': 'template-name-input' }}
            size="small"
          />

          <TextField
            label={t('template_description')}
            value={description}
            onChange={(e) => {
              if (e.target.value.length <= ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
                setDescription(e.target.value);
              }
            }}
            helperText={
              <Typography variant="caption">
                {description.length}/{ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
              </Typography>
            }
            disabled={isLoading}
            multiline
            rows={3}
            inputProps={{ 'data-testid': 'template-description-input' }}
            size="small"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading} sx={{ textTransform: 'none' }}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || !name.trim()}
          sx={{ textTransform: 'none' }}
          data-testid="submit-template-create-btn"
        >
          {isLoading ? t('creating') : t('create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
