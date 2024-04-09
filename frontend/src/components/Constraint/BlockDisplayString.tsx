import React, { useState } from "react";
// Components
import BlockEditString from "./BlockEditString";
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

export default function BlockDisplayString({
  block,
  templateBlock,
  handleEditBlock,
}: Props) {
  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {block && block.value !== ""
          ? blockDislayValue(block.value as string)
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
        <BlockEditString
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
