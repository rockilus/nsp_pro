import React, { useState } from "react";
// Components
import BlockEditQty from "./block-edit-qty";
import GetBlockNameLabel from "../data-display/get-block-name-label";
import PopoverBoxAnchorElOver from "../inputs/popover-box-anchor-el-over";
import {
  blockDisplayName,
  blockDisplayPlaceholder,
  blockDislayValue,
} from "../data-display/block-dislay";
// Types
import { TemplateBlockT, BlockT } from "../../types/constraint";

interface Props {
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  handleEditBlock: (block: BlockT) => void;
}

export default function BlockDisplayNumber({
  block,
  templateBlock,
  handleEditBlock,
}: Props) {
  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {block && block.value !== ""
          ? blockDislayValue(block.value as number)
          : blockDisplayPlaceholder(templateBlock.placeholder)}
        {blockDisplayName(GetBlockNameLabel(templateBlock.name))}
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
        <BlockEditQty
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
