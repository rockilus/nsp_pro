import React, { useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
// Components
import BlockEditShiftWorkerOption from "./block-edit-shift-worker-option";
import GetBlockNameLabel from "../../../data-display/get-block-name-label";
import PopoverBoxAnchorElOver from "../../../inputs/popover-box-anchor-el-over";
import {
  blockDisplayName,
  blockDisplayPlaceholder,
  blockDislayValue,
} from "../../../data-display/block-dislay";
// Utils
import { getShiftWorkerOptionDisplayName } from "../../shift-worker-option-utils/shift-worker-option-utils";
// Types
import {
  TemplateBlockT,
  BlockT,
  ShiftWorkerOptionT,
} from "../../../../types/constraint";

export default function BlockDisplayShiftWorkerOption({
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
  const { t } = useTranslation(lng, "constraint-page");

  const [open, setOpen] = useState(false);

  const translateOptionName = (name: string) => {
    switch (name) {
      case "all workers":
        return t("all_workers");
      case "all shifts":
        return t("all_shifts");
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
                    ? translateOptionName(getShiftWorkerOptionDisplayName(item))
                    : ""
                )
                .join(", ")
            )
          : blockDisplayPlaceholder(templateBlock.placeholder)}
        {blockDisplayName(GetBlockNameLabel(lng, templateBlock.name))}
      </div>
    );
  };

  const handleClose = () => {
    setOpen(false);
  };

  const expandBoolDimOptions = (
    options: ShiftWorkerOptionT[]
  ): ShiftWorkerOptionT[] => {
    return options.flatMap((option) => {
      if (option.isBoolDim) {
        return [
          { ...option, name: true },
          { ...option, name: false },
        ];
      } else {
        return [option];
      }
    });
  };

  const groupByCategoryName = (
    options: ShiftWorkerOptionT[]
  ): { [key: string]: ShiftWorkerOptionT[] } => {
    return options.reduce((acc, option) => {
      if (!acc[option.categoryName]) {
        acc[option.categoryName] = [];
      }
      acc[option.categoryName].push(option);
      return acc;
    }, {} as { [key: string]: ShiftWorkerOptionT[] });
  };

  return (
    <PopoverBoxAnchorElOver
      buttonContent={blockDisplay()}
      content={
        <BlockEditShiftWorkerOption
          lng={lng}
          block={block}
          templateBlock={templateBlock}
          shiftWorkerOptionDict={groupByCategoryName(
            expandBoolDimOptions(templateBlock.options as ShiftWorkerOptionT[])
          )}
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
