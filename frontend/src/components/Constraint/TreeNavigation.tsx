import React from "react";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

import { TreeNodeT, BuildBlockT, BuildBlockNameT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  tree: TreeNodeT;
  buildBlocks: BuildBlockT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  addBlock: (name: BuildBlockNameT, option: string | number) => void;
  setAtLeaf: (atLeaf: boolean) => void;
}

export default function TreeNavigation({
  tree,
  buildBlocks,
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
    const buildBlock = buildBlocks[0] ? buildBlocks[0] : null;
    if (buildBlock && buildBlock.name === tree.name) {
      return buildBlock.value;
    } else {
      return "";
    }
  };

  const getChild = () => {
    const child = tree.children.find((child) =>
      child.parentOptions.includes(getValue() as string|number)
    );
    return child;
  };

  const selectOther = () => {
    return (
      <Select
        value={getValue()}
        label={tree.name}
        onChange={(e) => handleOptionChange(e.target.value as string)}
        sx={{ display: "inline-block", minWidth: "100px" }}
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
      {["shift_id", "shift_id_reference", "shift_id_relative"].includes(
        tree.name
      ) && selectShift()}
      {![
        "worker_id",
        "shift_id",
        "shift_id_reference",
        "shift_id_relative",
      ].includes(tree.name) && selectOther()}
      {getChild() && (
        <TreeNavigation
          tree={getChild() as TreeNodeT}
          buildBlocks={buildBlocks.slice(1)}
          workers={workers}
          shifts={shifts}
          addBlock={addBlock}
          setAtLeaf={setAtLeaf}
        />
      )}
    </Box>
  );
}
