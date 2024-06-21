import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Components
import WorkerPropertyCellList from "./WorkerPropertyCellList";
// Stores
import { useWorkerStore } from "../../stores/workerStore";
// Types
import { WorkerPropertyT, WorkerDimensionT } from "../../types/worker";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  workerProperty: WorkerPropertyT;
  workerDimension: WorkerDimensionT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function WorkerPropertyCell({
  team,
  workerProperty,
  workerDimension,
  editing,
  setEditing,
}: Props) {
  const [valueState, setValueState] = useState<
    string | number | boolean | string[]
  >(workerProperty.value);

  const updateWorkerProperty = useWorkerStore(
    (state) => state.updateWorkerProperty
  );

  const handleEditConfirm = async () => {
    if (valueState !== workerProperty.value) {
      updateWorkerProperty(team.id, { ...workerProperty, value: valueState });
    }
    setEditing({});
  };

  const handleToggle = () => {
    updateWorkerProperty(team.id, {
      ...workerProperty,
      value: !workerProperty.value,
    });
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
            workerDimension={workerDimension}
            workerProperty={workerProperty}
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
