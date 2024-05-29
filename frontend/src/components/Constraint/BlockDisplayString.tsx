import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// Components
import BlockEditString from "./BlockEditString";
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

export default function BlockDisplayString({
  block,
  templateBlock,
  handleEditBlock,
}: Props) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const translateOptionName = (name: string): string => {
    switch (name) {
      case "at least":
        return t("constraint.operator_at_least");
      case "exactly":
        return t("constraint.operator_exactly");
      case "at most":
        return t("constraint.operator_at_most");
      default:
        return name;
    }
  };

  const blockDisplay = () => {
    return (
      <div>
        {block && block.value !== ""
          ? blockDislayValue(translateOptionName(block.value as string))
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
        <BlockEditString
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
