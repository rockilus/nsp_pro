import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Components
import AttributeCellDimEntries from "./attribute-cell-dim-entries";
// Types
import { DimensionEntryType, DimensionT } from "../../../types/dimension";
import { DimEntryT } from "@/types/dim-entry";
import { AttributeT } from "@/types/attribute";

export default function AttributeCell({
  selectedTeamId,
  attribute,
  dimension,
  dimEntries,
  editing,
  setEditing,
  handleUpdateAttribute,
  className = "",
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

  const shouldCenter =
    dimension.entryType === DimensionEntryType.BOOL ||
    dimension.entryType === DimensionEntryType.INT;
  const cellClassName = shouldCenter
    ? `${className} shared-field-center`.trim()
    : className;

  return (
    <>
      <TableCell
        key={dimension.id}
        component="th"
        scope="row"
        className={cellClassName}
        onClick={() => setEditing({ [attribute.ownerId]: dimension.id })}
        sx={{
          paddingY: 0,
          cursor:
            dimension.entryType === DimensionEntryType.DIM_ENTRIES
              ? "default"
              : "pointer",
        }}
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
            <TextField
              fullWidth
              type="number"
              name={dimension.name}
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
              name={dimension.name}
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
        ) : dimension.entryType === DimensionEntryType.BOOL ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Checkbox
              checked={
                typeof attribute.value === "boolean"
                  ? attribute.value
                  : attribute.value === 1
              }
              onClick={handleToggle}
            />
          </Box>
        ) : (
          attribute.value
        )}
      </TableCell>
    </>
  );
}
