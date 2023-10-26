import React, { useState, useEffect } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ThermostatIcon from "@mui/icons-material/Thermostat";

import TreeNavigation from "./TreeNavigation";
import { useConstraintStore } from "../../stores/constraintStore";
import { TreeNodeT, BuildBlockT, ConstraintT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  constraint: ConstraintT;
  tree: TreeNodeT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintCreate({
  constraint,
  tree,
  workers,
  shifts,
}: Props) {
  const [constraintState, setConstraintState] =
    useState<ConstraintT>(constraint);
  const [atLeaf, setAtLeaf] = useState<boolean>(false);
  const [hardPanel, setHardPanel] = useState<boolean>(true);

  const addConstraint = useConstraintStore((state) => state.addConstraint);
  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );
  const deleteConstraint = useConstraintStore(
    (state) => state.deleteConstraint
  );

  const addBlock = (name: string, option: string | number) => {
    const newBlock: BuildBlockT = { name: name, value: option };
    const index = constraintState.buildBlocks.findIndex(
      (item) => item.name === name
    );
    if (index !== -1) {
      const updatedNewBuild = constraintState.buildBlocks.slice(0, index);
      setConstraintState({
        ...constraintState,
        buildBlocks: [...updatedNewBuild, newBlock],
      });
    } else {
      setConstraintState({
        ...constraintState,
        buildBlocks: [...constraintState.buildBlocks, newBlock],
      });
    }
  };

  const handleSave = () => {
    if (constraintState.id === "") {
      addConstraint(constraintState);
    } else {
      updateConstraint(constraintState);
    }
  };

  const handleSwitchHS = () => {
    const priority = hardPanel ? "no" : constraint.priority;
    setHardPanel(!hardPanel);
    setConstraintState({
      ...constraint,
      hard: !hardPanel,
      priority: priority,
    });
  };

  const selectHardSoft = () => {
    const variantH = hardPanel ? "contained" : "text";
    const variantS = hardPanel ? "text" : "contained";
    return (
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <Button
          variant={variantH}
          sx={{ textTransform: "none", marginRight: 1 }}
          onClick={handleSwitchHS}
        >
          Hard
        </Button>
        <Button
          variant={variantS}
          sx={{ textTransform: "none" }}
          onClick={handleSwitchHS}
        >
          Soft
        </Button>
      </Box>
    );
  };

  const selectPriority = () => {
    const priorityOptions = ["low", "medium", "high"];
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={constraintState.priority}
            label="Priority"
            onChange={(e) =>
              setConstraintState({
                ...constraintState,
                priority: e.target.value as string,
              })
            }
          >
            {priorityOptions.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Box style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginLeft: 2,
          marginRight: 2,
          marginBottom: 1,
        }}
      >
        {selectHardSoft()}
        <IconButton
          // onClick={handleClose}
          sx={{ marginRight: 2 }}
        >
          <CloseIcon color="disabled" />
        </IconButton>
      </Box>
      <TreeNavigation
        tree={tree}
        buildBlocks={constraintState.buildBlocks}
        workers={workers}
        shifts={shifts}
        addBlock={addBlock}
        setAtLeaf={setAtLeaf}
      />
      {!constraintState.hard && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            marginBottom: 1,
          }}
        >
          <ThermostatIcon sx={{ marginLeft: 2, marginRight: 1 }} />
          {selectPriority()}
        </Box>
      )}
      <Button
        variant="contained"
        color="primary"
        disabled={!atLeaf}
        startIcon={<AddIcon />}
        onClick={handleSave}
      >
        Create
      </Button>
    </Box>
  );
}
