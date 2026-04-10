import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
// Components
import BlockDisplay from './constraint-blocks/block-display';
// Types
import {
  ConstraintT,
  TemplateT,
  BlockT,
  TemplateBlockT,
  ShiftWorkerOptionT,
  BlockNameOptions,
  BlockTypeOptions,
} from '../../../types/constraint';
import { WorkerT } from '../../../types/worker';
import { ShiftT } from '../../../types/shift';

export default function ConstraintEdit({
  lng,
  workers,
  shifts,
  constraint,
  template,
  handleAddConstraint,
  handleUpdateConstraint,
  'data-testid': dataTestId,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  constraint: ConstraintT;
  template: TemplateT | null;
  handleAddConstraint: (constraint: ConstraintT) => void;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
  'data-testid'?: string;
}) {
  // Use a key based on incoming props so the inner component remounts
  // whenever `constraint` or `template` change. This avoids calling
  // setState synchronously inside an effect.
  const formKey = JSON.stringify([constraint, template]);

  return (
    <ConstraintEditInner
      key={formKey}
      lng={lng}
      workers={workers}
      shifts={shifts}
      constraint={constraint}
      template={template}
      handleAddConstraint={handleAddConstraint}
      handleUpdateConstraint={handleUpdateConstraint}
      data-testid={dataTestId}
    />
  );
}

function ConstraintEditInner({
  lng,
  workers,
  shifts,
  constraint,
  template,
  handleAddConstraint,
  handleUpdateConstraint,
  'data-testid': dataTestId,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  constraint: ConstraintT;
  template: TemplateT | null;
  handleAddConstraint: (constraint: ConstraintT) => void;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
  'data-testid'?: string;
}) {
  const { t } = useTranslation(lng, 'constraint-page');
  const [errors, setErrors] = useState<number[]>([]);

  const initialBlockValue = (
    templateBlock: TemplateBlockT,
  ): string | number | string[] | ShiftWorkerOptionT[] => {
    if (templateBlock.type === BlockTypeOptions.STRING) {
      if (templateBlock.name === BlockNameOptions.TEXT) {
        return templateBlock.placeholder;
      } else {
        return '';
      }
    } else if (templateBlock.type === BlockTypeOptions.SHIFT_WORKER_OPTION) {
      return [];
    } else {
      if (templateBlock.options.length === 0 && templateBlock.type !== BlockTypeOptions.NUMBER) {
        return templateBlock.placeholder;
      } else if (Array.isArray(templateBlock.options) && templateBlock.options.length === 1) {
        return templateBlock.options[0] as string;
      } else {
        return templateBlock.type === BlockTypeOptions.LIST ? [] : '';
      }
    }
  };

  const initialConstraintState = useCallback((): ConstraintT => {
    if (constraint.id === '') {
      const blocks: BlockT[] = [];
      if (template && template.blocks) {
        for (let block of template.blocks) {
          blocks.push({
            name: block.name,
            type: block.type,
            value: initialBlockValue(block),
          });
        }
      }
      return { ...constraint, blocks: blocks };
    } else {
      return constraint;
    }
  }, [constraint, template]);

  // Initialize state lazily using the callback above. Because the inner
  // component is remounted when `constraint` or `template` change (via
  // the `key` on the parent), we don't need to call setState inside an
  // effect to sync props -> state.
  const [constraintState, setConstraintState] = useState<ConstraintT>(initialConstraintState);

  const validateConstraint = (): boolean => {
    const updatedErrors: number[] = [];
    if (template) {
      template.blocks.map((block, index) => {
        const value = constraintState.blocks[index].value;
        if (block.name === BlockNameOptions.TEXT) {
          return;
        }
        if (
          block.type === BlockTypeOptions.SHIFT_WORKER_OPTION ||
          block.type === BlockTypeOptions.LIST
        ) {
          if (Array.isArray(value) && value.length === 0) {
            updatedErrors.push(index);
          }
        } else if (
          block.type === BlockTypeOptions.STRING ||
          block.type === BlockTypeOptions.NUMBER
        ) {
          if (value === '') {
            updatedErrors.push(index);
          }
        }
      });
      setErrors(updatedErrors);
      return updatedErrors.length === 0;
    } else {
      return false;
    }
  };

  const handleRemoveError = (index: number): void => {
    const updatedErrors = errors.filter((error) => error !== index);
    setErrors(updatedErrors);
  };

  const handleSaveConstraint = () => {
    const valid = validateConstraint();
    if (!valid) {
      return;
    }
    if (constraint.id === '') {
      handleAddConstraint(constraintState);
    } else {
      handleUpdateConstraint(constraintState);
    }
  };

  const findBlockByName = (name: BlockNameOptions): BlockT | null => {
    const block = constraintState.blocks.find((block) => block.name === name);
    return block ? block : null;
  };

  const handleEditBlock = (block: BlockT) => {
    if (findBlockByName(block.name) === null) {
      setConstraintState({
        ...constraintState,
        blocks: [...constraintState.blocks, block],
      });
    } else {
      setConstraintState({
        ...constraintState,
        blocks: constraintState.blocks.map((b) => (b.name === block.name ? block : b)),
      });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
      data-testid={dataTestId || 'constraint-edit-form'}
    >
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {template?.blocks.map((templateBlock, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginRight: '5px',
            }}
            data-testid={`constraint-block-${index}`}
          >
            <BlockDisplay
              lng={lng}
              workers={workers}
              shifts={shifts}
              index={index}
              block={findBlockByName(templateBlock.name)}
              templateBlock={templateBlock}
              error={errors.includes(index)}
              handleEditBlock={handleEditBlock}
              handleRemoveError={handleRemoveError}
            />
          </div>
        ))}
      </div>
      <Button
        variant="contained"
        onClick={handleSaveConstraint}
        sx={{ textTransform: 'none', height: 35, width: 60 }}
        data-testid="save-constraint-button"
      >
        {constraint.id === '' ? t('add') : t('save')}
      </Button>
    </Box>
  );
}
