import React, { useState, useEffect } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TreeNavigation from "./TreeNavigation";
import { TreeNodeT, ConstraintBlockT } from "./types";

interface Props {
  tree: TreeNodeT;
}

export default function ConstraintCreate({ tree }: Props) {
  const [newBuild, setNewBuild] = useState<ConstraintBlockT[]>([]);
  const [atLeaf, setAtLeaf] = useState<boolean>(false);

  const addBlock = (name: string, option: string | number) => {
    const index = newBuild.findIndex((item) => item[name] !== undefined);
    if (index !== -1) {
      const updatedNewBuild = newBuild.slice(0, index);
      setNewBuild([...updatedNewBuild, { [name]: option }]);
    } else {
      setNewBuild((old) => [...old, { [name]: option }]);
    }
  };

  return (
    <Box style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <TreeNavigation
        tree={tree}
        newBuild={newBuild}
        addBlock={addBlock}
        setAtLeaf={setAtLeaf}
      />
      <Button
        variant="contained"
        color="primary"
        disabled={!atLeaf}
        startIcon={<AddIcon />}
      >
        Create
      </Button>
    </Box>
  );
}
