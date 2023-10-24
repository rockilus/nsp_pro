import React, { useState } from "react";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

import { TreeNodeT, BuildBlockT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  tree: TreeNodeT;
  newBuild: BuildBlockT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  addBlock: (name: string, option: string | number) => void;
  setAtLeaf: (atLeaf: boolean) => void;
}

export default function TreeNavigation({
  tree,
  newBuild,
  workers,
  shifts,
  addBlock,
  setAtLeaf,
}: Props) {
  const handleOptionChange = (option: string) => {
    addBlock(tree.name, option);
    tree.children.length === 0 ? setAtLeaf(true) : setAtLeaf(false);
  };

  const getValue = () => {
    const buildBlock = newBuild[0] ? newBuild[0] : null;
    if (buildBlock && buildBlock.name === tree.name) {
      return buildBlock.value;
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

  const selectOther = () => {
    return (
      <Select
        value={getValue()}
        label={tree.name}
        onChange={(e) => handleOptionChange(e.target.value as string)}
      >
        {tree.options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    );
  };

  const selectWorker = () => {
    return (
      <Select
        value={getValue()}
        label="Worker"
        onChange={(e) => handleOptionChange(e.target.value as string)}
      >
        {workers.map((worker) => (
          <MenuItem key={worker.id} value={worker.id}>
            {worker.name}
          </MenuItem>
        ))}
      </Select>
    );
  };

  const selectShift = () => {
    return (
      <Select
        value={getValue()}
        label="Shift"
        onChange={(e) => handleOptionChange(e.target.value as string)}
      >
        {shifts.map((shift) => (
          <MenuItem key={shift.id} value={shift.id}>
            {shift.name}
          </MenuItem>
        ))}
      </Select>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
      {tree.name === "worker_id" && selectWorker()}
      {tree.name === "shift_id" && selectShift()}
      {tree.name !== "worker_id" && tree.name !== "shift_id" && selectOther()}
      {getChild() && (
        <TreeNavigation
          tree={getChild()}
          newBuild={newBuild.slice(1)}
          workers={workers}
          shifts={shifts}
          addBlock={addBlock}
          setAtLeaf={setAtLeaf}
        />
      )}
    </Box>
  );
}
