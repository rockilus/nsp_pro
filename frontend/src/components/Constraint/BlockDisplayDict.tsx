import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// Components
import BlockEditDict from "./BlockEditDict";
import GetBlockNameLabel from "../SharedComponents/GetBlockNameLabel";
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
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const translateOptionName = (name: string) => {
    switch (name) {
      case "all workers":
        return t("constraint.all_workers");
      case "all shifts":
        return t("constraint.all_shifts");
      default:
        return name;
    }
  };

  const blockDisplay = () => {
    return (
      <div>
        {block && Array.isArray(block.value) && block.value.length !== 0
          ? blockDislayValue(
              block.value
                .map((item) =>
                  typeof item === "object" && "name" in item
                    ? translateOptionName(item.name)
                    : ""
                )
                .join(", ")
            )
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
        <BlockEditDict
          block={block}
          templateBlock={templateBlock}
          handleEditBlock={handleEditBlock}
          handleClose={handleClose}
          translateOptionName={translateOptionName}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
