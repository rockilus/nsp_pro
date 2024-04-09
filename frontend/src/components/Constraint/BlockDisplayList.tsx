import React, { useState } from "react";
// Components
import BlockEditList from "./BlockEditList";
import PopoverBoxAnchorElOver from "../SharedComponents/PopoverBoxAnchorElOver";
import {
  blockDisplayName,
  blockDisplayPlaceholder,
  blockDislayValue,
} from "../SharedComponents/blockDislay";
// Types
import { TemplateBlockT, BlockT } from "./types";

interface Props {
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  handleEditBlock: (block: BlockT) => void;
}

export default function BlockDisplayList({
  block,
  templateBlock,
  handleEditBlock,
}: Props) {
  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {block && Array.isArray(block.value) && block.value.length !== 0
          ? blockDislayValue(block.value.join(", "))
          : blockDisplayPlaceholder(templateBlock.placeholder)}
        {blockDisplayName(templateBlock.name)}
      </div>
    );
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <PopoverBoxAnchorElOver
      buttonContent={blockDisplay()}
      content={
        <BlockEditList
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
          handleClose={handleClose}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
