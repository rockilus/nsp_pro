import React, { Dispatch, SetStateAction, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
// Components
import AttributeCellDimEntries from './attribute-cell-dim-entries';
// Types
import { DimensionEntryType, DimensionT } from '../../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { AttributeT } from '@/types/attribute';

export default function AttributeCell({
  selectedTeamId,
  attribute,
  dimension,
  dimEntries,
  editing,
  setEditing,
  handleUpdateAttribute,
  className = '',
}: {
  selectedTeamId: string;
  attribute: AttributeT;
  dimension: DimensionT;
  dimEntries: DimEntryT[];
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
  className?: string;
}) {
  const [valueState, setValueState] = useState<string | number | boolean>(attribute.value);

  const handleEditConfirm = async () => {
    if (valueState !== attribute.value) {
      handleUpdateAttribute({ ...attribute, value: valueState }, selectedTeamId);
    }
    setEditing({});
  };

  const handleToggle = () => {
    handleUpdateAttribute(
      {
        ...attribute,
        value: !attribute.value,
      },
      selectedTeamId,
    );
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(attribute.value);
  };

  const shouldCenter =
    dimension.entryType === DimensionEntryType.BOOL ||
    dimension.entryType === DimensionEntryType.INT;
  const cellClassName = shouldCenter ? `${className} shared-field-center`.trim() : className;

  return (
    <>
      <td
        className={`cursor-pointer py-0 ${cellClassName}`.trim()}
        data-testid={`attribute-cell-${attribute.ownerId}-${dimension.id}`}
        onClick={() =>
          dimension.entryType !== DimensionEntryType.DIM_ENTRIES &&
          setEditing({ [attribute.ownerId]: dimension.id })
        }
      >
        {dimension.entryType === DimensionEntryType.DIM_ENTRIES ? (
          <AttributeCellDimEntries
            selectedTeamId={selectedTeamId}
            dimension={dimension}
            dimEntries={dimEntries}
            attribute={attribute}
            handleUpdateAttribute={handleUpdateAttribute}
          />
        ) : editing && dimension.entryType !== DimensionEntryType.BOOL ? (
          dimension.entryType === DimensionEntryType.INT ? (
            <Input
              type="number"
              value={valueState as string | number}
              data-testid={`attribute-number-field-${attribute.ownerId}-${dimension.id}`}
              onChange={(e) => setValueState(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditConfirm();
                } else if (e.key === 'Escape') {
                  handleEditCancel();
                }
              }}
              autoFocus
              className="text-center"
            />
          ) : (
            <Input
              type="text"
              value={valueState as string}
              data-testid={`attribute-text-field-${attribute.ownerId}-${dimension.id}`}
              onChange={(e) => setValueState(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditConfirm();
                } else if (e.key === 'Escape') {
                  handleEditCancel();
                }
              }}
              autoFocus
            />
          )
        ) : dimension.entryType === DimensionEntryType.BOOL ? (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                typeof attribute.value === 'boolean' ? attribute.value : attribute.value === 1
              }
              data-testid={`attribute-checkbox-${attribute.ownerId}-${dimension.id}`}
              onCheckedChange={() => handleToggle()}
            />
          </div>
        ) : (
          attribute.value
        )}
      </td>
    </>
  );
}
