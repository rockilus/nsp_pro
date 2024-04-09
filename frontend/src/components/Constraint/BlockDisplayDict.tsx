import React, { useState } from "react";
// Components
import BlockEditDict from "./BlockEditDict";
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

export default function BlockDisplayDict({
  block,
  templateBlock,
  handleEditBlock,
}: Props) {
  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {block && Array.isArray(block.value) && block.value.length !== 0
          ? blockDislayValue(
              block.value
                .map((item) =>
                  typeof item === "object" && "name" in item ? item.name : ""
                )
                .join(", ")
            )
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
        <BlockEditDict
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
