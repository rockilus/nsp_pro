import React, { useState } from "react";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

import { TreeNodeT, ConstraintBlockT } from "./types";

interface Props {
  tree: TreeNodeT;
  newBuild: ConstraintBlockT[];
  addBlock: (name: string, option: string | number) => void;
  setAtLeaf: (atLeaf: boolean) => void;
}

export default function TreeNavigation({
  tree,
  newBuild,
  addBlock,
  setAtLeaf,
}: Props) {
  const handleOptionChange = (option: string) => {
    addBlock(tree.name, option);
    tree.children.length === 0 ? setAtLeaf(true) : setAtLeaf(false);
  };

  const getValue = () => {
    const [name, option] = newBuild[0]
      ? Object.entries(newBuild[0])[0]
      : [null, null];
    if (name && name === tree.name) {
      return option;
    } else {
      return "";
    }
  };

  const getChild = () => {
    const child = tree.children.find((child) =>
      child.parentOptions.includes(getValue())
    );
    return child;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
      <Select
        value={getValue()}
        label={tree.name}
        onChange={(e) => handleOptionChange(e.target.value as string)}
        MenuProps={{
          PaperProps: {
            style: {
              width: 300, // Set the width of the menu items here
            },
          },
        }}
      >
        {tree.options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
      {getChild() && (
        <TreeNavigation
          tree={getChild()}
          newBuild={newBuild.slice(1)}
          addBlock={addBlock}
          setAtLeaf={setAtLeaf}
        />
      )}
    </Box>
  );
}
