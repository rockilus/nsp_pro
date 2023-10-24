import React, { useState, useEffect } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import TreeNavigation from "./TreeNavigation";
import { useConstraintStore } from "../../stores/constraintStore";
import { TreeNodeT, BuildBlockT, ConstraintT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  tree: TreeNodeT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintCreate({ tree, workers, shifts }: Props) {
  const [newBuild, setNewBuild] = useState<BuildBlockT[]>([]);
  const [atLeaf, setAtLeaf] = useState<boolean>(false);

  const addConstraint = useConstraintStore((state) => state.addConstraint);
  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );

  const addBlock = (name: string, option: string | number) => {
    const newBlock: BuildBlockT = { name: name, value: option };
    const index = newBuild.findIndex((item) => item.name === name);
    if (index !== -1) {
      const updatedNewBuild = newBuild.slice(0, index);
      setNewBuild([...updatedNewBuild, newBlock]);
    } else {
      setNewBuild((old) => [...old, newBlock]);
    }
  };

  const handleCreate = () => {
    const constraint: ConstraintT = {
      id: "",
      buildBlocks: newBuild,
      active: true,
    };
    addConstraint(constraint);
  };

  return (
    <Box style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <TreeNavigation
        tree={tree}
        newBuild={newBuild}
        workers={workers}
        shifts={shifts}
        addBlock={addBlock}
        setAtLeaf={setAtLeaf}
      />
      <Button
        variant="contained"
        color="primary"
        disabled={!atLeaf}
        startIcon={<AddIcon />}
        onClick={handleCreate}
      >
        Create
      </Button>
    </Box>
  );
}
