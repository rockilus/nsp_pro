import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Components
import WorkerPropertyCellList from "./worker-property-cell-list";
// Types
import { WorkerPropertyT, WorkerDimensionT } from "../../types/worker";

export default function WorkerPropertyCell({
  selectedTeamId,
  workerProperty,
  workerDimension,
  editing,
  setEditing,
  handleUpdateWorkerProperty,
}: {
  selectedTeamId: string;
  workerProperty: WorkerPropertyT;
  workerDimension: WorkerDimensionT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorkerProperty: (
    workerProperty: WorkerPropertyT,
    teamId: string
  ) => void;
}) {
  const [valueState, setValueState] = useState<
    string | number | boolean | string[]
  >(workerProperty.value);

  const handleEditConfirm = async () => {
    if (valueState !== workerProperty.value) {
      handleUpdateWorkerProperty(
        {
          ...workerProperty,
          value: valueState,
        },
        selectedTeamId
      );
    }
    setEditing({});
  };

  const handleToggle = () => {
    handleUpdateWorkerProperty(
      {
        ...workerProperty,
        value: !workerProperty.value,
      },
      selectedTeamId
    );
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(workerProperty.value);
  };

  return (
    <>
      <TableCell
        key={workerDimension.id}
        component="th"
        scope="row"
        onClick={() =>
          setEditing({ [workerProperty.workerId]: workerDimension.id })
        }
        sx={{ paddingY: 0 }}
      >
        {workerDimension.entryType === "list" ? (
          <WorkerPropertyCellList
            selectedTeamId={selectedTeamId}
            workerDimension={workerDimension}
            workerProperty={workerProperty}
            handleUpdateWorkerProperty={handleUpdateWorkerProperty}
          />
        ) : editing && workerDimension.entryType !== "bool" ? (
          workerDimension.entryType === "int" ? (
            <TextField
              fullWidth
              type="number"
              name={workerDimension.name}
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
              name={workerDimension.name}
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
        ) : workerDimension.entryType === "bool" ? (
          <Checkbox
            checked={
              typeof workerProperty.value === "boolean"
                ? workerProperty.value
                : workerProperty.value === 1
            }
            onClick={handleToggle}
          />
        ) : (
          workerProperty.value
        )}
      </TableCell>
    </>
  );
}
