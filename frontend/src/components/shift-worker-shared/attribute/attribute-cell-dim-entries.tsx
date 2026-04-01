import React, { useState } from 'react';
// MUI
import Chip from '@mui/material/Chip';
// Components
import DimEntryTypeCellEdit from './dim-entry-type-cell-edit';
import PopoverAnchorElOver from '../../inputs/popover-anchor-el-over';
// Types
import { DimensionEntryType, DimensionT } from '../../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { AttributeT } from '@/types/attribute';

export default function AttributeCellDimEntries({
  selectedTeamId,
  dimension,
  dimEntries,
  attribute,
  handleUpdateAttribute,
}: {
  selectedTeamId: string;
  dimension: DimensionT;
  dimEntries: DimEntryT[];
  attribute: AttributeT;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<DimEntryT[]>(
    dimEntries.filter((de) => attribute.dimEntryIds.includes(de.id)),
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddDimEntry = (dimEntry: DimEntryT) => {
    if (dimension.entryType === DimensionEntryType.DIM_ENTRIES && Array.isArray(valueState)) {
      const updatedValue = [...valueState, dimEntry];
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error('No team selected');
        return;
      }
      handleUpdateAttribute(
        {
          ...attribute,
          dimEntryIds: updatedValue.map((v) => v.id),
        },
        selectedTeamId,
      );
    } else {
      console.error('Cannot add list value to non-list attribute');
    }
  };

  const handleRemoveDimEntry = (dimEntry: DimEntryT) => {
    if (dimension.entryType === DimensionEntryType.DIM_ENTRIES) {
      const updatedValue = valueState.filter((v) => v.id !== dimEntry.id);
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error('No team selected');
        return;
      }
      handleUpdateAttribute(
        {
          ...attribute,
          dimEntryIds: updatedValue.map((v) => v.id),
        },
        selectedTeamId,
      );
    } else {
      console.error('Cannot remove list value from non-list attribute');
    }
  };

  return (
    <PopoverAnchorElOver
      buttonContent={attribute.dimEntryIds.map((deId, index) => (
        <Chip
          key={deId}
          label={dimEntries.find((de) => de.id === deId)?.name || ''}
          sx={{ cursor: 'pointer' }}
        />
      ))}
      content={
        <DimEntryTypeCellEdit
          selectedDimEntries={valueState}
          dimEntries={dimEntries}
          handleAddDimEntry={handleAddDimEntry}
          handleRemoveDimEntry={handleRemoveDimEntry}
          handleClose={handleClose}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
