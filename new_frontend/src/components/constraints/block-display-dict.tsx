import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// Components
import BlockEditDict from "./block-edit-dict";
import GetBlockNameLabel from "../data-display/get-block-name-label";
import PopoverBoxAnchorElOver from "../inputs/popover-box-anchor-el-over";
import {
  blockDisplayName,
  blockDisplayPlaceholder,
  blockDislayValue,
} from "../data-display/block-dislay";
// Types
import { TemplateBlockT, BlockT } from "../../types/constraint";

export default function BlockDisplayDict({
  lng,
  block,
  templateBlock,
  handleEditBlock,
}: {
  lng: string;
  block: BlockT | null;
  templateBlock: TemplateBlockT;
  handleEditBlock: (block: BlockT) => void;
}) {
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
