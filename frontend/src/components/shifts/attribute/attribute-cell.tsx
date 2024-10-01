import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Components
import AttributeCellDimEntries from "./attribute-cell-dim-entries";
// Types
import {
  AttributeT,
  DimensionT,
  DimensionEntryType,
  DimEntryT,
} from "../../../types/shift";

export default function AttributeCell({
  selectedTeamId,
  attribute,
  shiftDimension,
  dimEntries,
  editing,
  setEditing,
  handleUpdateAttribute,
}: {
  selectedTeamId: string;
  attribute: AttributeT;
  shiftDimension: DimensionT;
  dimEntries: DimEntryT[];
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
}) {
  const [valueState, setValueState] = useState<string | number | boolean>(
    attribute.value
  );

  const handleEditConfirm = async () => {
    if (valueState !== attribute.value) {
      handleUpdateAttribute(
        { ...attribute, value: valueState },
        selectedTeamId
      );
    }
    setEditing({});
  };

  const handleToggle = () => {
    handleUpdateAttribute(
      {
        ...attribute,
        value: !attribute.value,
      },
      selectedTeamId
    );
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(attribute.value);
  };

  return (
    <>
      <TableCell
        key={shiftDimension.id}
        component="th"
        scope="row"
        onClick={() => setEditing({ [attribute.ownerId]: shiftDimension.id })}
        sx={{
          paddingY: 0,
          cursor:
            shiftDimension.entryType === DimensionEntryType.DIM_ENTRIES
              ? "default"
              : "pointer",
        }}
      >
        {shiftDimension.entryType === DimensionEntryType.DIM_ENTRIES ? (
          <AttributeCellDimEntries
            selectedTeamId={selectedTeamId}
            shiftDimension={shiftDimension}
            dimEntries={dimEntries}
            attribute={attribute}
            handleUpdateAttribute={handleUpdateAttribute}
          />
        ) : editing && shiftDimension.entryType !== DimensionEntryType.BOOL ? (
          shiftDimension.entryType === DimensionEntryType.INT ? (
            <TextField
              fullWidth
              type="number"
              name={shiftDimension.name}
              value={valueState}
              onChange={(e) => setValueState(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditConfirm();
                } else if (e.key === "Escape") {
                  handleEditCancel();
                }
              }}
              autoFocus
            />
          ) : (
            <TextField
              fullWidth
              type="text"
              name={shiftDimension.name}
              value={valueState}
              onChange={(e) => setValueState(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditConfirm();
                } else if (e.key === "Escape") {
                  handleEditCancel();
                }
              }}
              autoFocus
            />
          )
        ) : shiftDimension.entryType === DimensionEntryType.BOOL ? (
          <Checkbox
            checked={
              typeof attribute.value === "boolean"
                ? attribute.value
                : attribute.value === 1
            }
            onClick={handleToggle}
          />
        ) : (
          attribute.value
        )}
      </TableCell>
    </>
  );
}
