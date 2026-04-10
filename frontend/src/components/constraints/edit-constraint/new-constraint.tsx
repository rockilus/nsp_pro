import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
// Components
import ConstraintEdit from './constraint-edit';
import TemplateList from './template-list/template-list';
// Styles
import '../../../styles/text-styles.css';
import '../constraint-tab.css';
import './new-constraint.css';
// Types
import { TemplateT, ConstraintT } from '../../../types/constraint';
import { WorkerT } from '../../../types/worker';
import { ShiftT } from '../../../types/shift';

export default function NewConstraint({
  lng,
  workers,
  shifts,
  selectedTeamId,
  templates,
  open,
  handleCloseAddConstraint,
  handleAddConstraint,
  handleUpdateConstraint,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  selectedTeamId: string;
  templates: TemplateT[];
  open: boolean;
  handleCloseAddConstraint: () => void;
  handleAddConstraint: (constraint: ConstraintT) => void;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
}) {
  const { t } = useTranslation(lng, 'constraint-page');

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateT | null>(null);

  const handleSelectedTemplate = (ct: TemplateT) => {
    setSelectedTemplate(ct);
  };

  // Reset selected template when dialog is closed
  const handleClose = () => {
    handleCloseAddConstraint();
    setSelectedTemplate(null);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="new-constraint-dialog-title"
      data-testid="new-constraint-dialog"
    >
      <DialogTitle id="new-constraint-dialog-title" data-testid="new-constraint-dialog-title">
        <div className="title-container">
          <span className="title">{t('new_constraint')}</span>
          <IconButton edge="end" onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <div className="constraint-edit-container">
          {selectedTemplate ? (
            <ConstraintEdit
              lng={lng}
              workers={workers}
              shifts={shifts}
              constraint={{
                id: '',
                teamId: selectedTeamId,
                constraintType: selectedTemplate.constraintType,
                templateId: selectedTemplate.id,
                language: selectedTemplate.language,
                blocks: [],
                text: '',
                hard: true,
                priority: 'medium',
                active: true,
                missingAttributes: [],
              }}
              template={selectedTemplate}
              handleAddConstraint={handleAddConstraint}
              handleUpdateConstraint={handleUpdateConstraint}
              data-testid="constraint-edit-form"
            />
          ) : (
            <span className="select-template-placeholder" data-testid="select-template-placeholder">
              {t('select_template')}
            </span>
          )}
        </div>

        <TemplateList
          lng={lng}
          templates={templates}
          selectedTemplate={selectedTemplate}
          handleSelectedTemplate={handleSelectedTemplate}
        />
      </DialogContent>
    </Dialog>
  );
}
