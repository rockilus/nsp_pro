import React, { useState } from "react";
// Components
import BlockEditQty from "./block-edit-qty";
import GetBlockNameLabel from "../../../data-display/get-block-name-label";
import PopoverBoxAnchorElOver from "../../../inputs/popover-box-anchor-el-over";
import {
  blockDisplayName,
  blockDisplayPlaceholder,
  blockDislayValue,
} from "../../../data-display/block-display";
// Types
import { TemplateBlockT, BlockT } from "../../../../types/constraint";

export default function BlockDisplayNumber({
  lng,
  index,
  block,
  templateBlock,
  error,
  handleEditBlock,
  handleRemoveError,
}: {
  lng: string;
  index: number;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  error: boolean;
  handleEditBlock: (block: BlockT) => void;
  handleRemoveError: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {block && block.value !== ""
          ? blockDislayValue(block.value as number)
          : blockDisplayPlaceholder(
              templateBlock.placeholder,
              error,
              `constraint-block-placeholder-${index}`
            )}
        {blockDisplayName(
          GetBlockNameLabel(lng, templateBlock.name),
          error,
          `constraint-block-name-${index}`
        )}
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
          index={index}
          block={block}
          templateBlock={templateBlock}
          error={error}
          handleEditBlock={handleEditBlock}
          handleClose={handleClose}
          handleRemoveError={handleRemoveError}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
