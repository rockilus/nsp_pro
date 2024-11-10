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
} from "../../../data-display/block-display";
// Utils
import {
  getShiftWorkerOptionDisplayName,
  expandBoolDimOptions,
  groupByCategoryName,
} from "../../shift-worker-option-utils/shift-worker-option-utils";
// Types
import {
  TemplateBlockT,
  BlockT,
  ShiftWorkerOptionT,
} from "../../../../types/constraint";

export default function BlockDisplayShiftWorkerOption({
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
          : blockDisplayPlaceholder(templateBlock.placeholder, error)}
        {blockDisplayName(GetBlockNameLabel(lng, templateBlock.name), error)}
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
        <BlockEditShiftWorkerOption
          lng={lng}
          index={index}
          block={block}
          templateBlock={templateBlock}
          error={error}
          shiftWorkerOptionDict={groupByCategoryName(
            expandBoolDimOptions(templateBlock.options as ShiftWorkerOptionT[])
          )}
          handleEditBlock={handleEditBlock}
          handleClose={handleClose}
          translateOptionName={translateOptionName}
          handleRemoveError={handleRemoveError}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
