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
  expandBoolDimOptions,
  groupByCategoryName,
} from "../../shift-worker-option-utils/shift-worker-option-utils";
import { getShiftWorkerOptionDisplayText } from "../../../../utils/shift-worker-option-display";
// Types
import {
  TemplateBlockT,
  BlockT,
  ShiftWorkerOptionT,
  SWOIdTypes,
} from "../../../../types/constraint";
import { WorkerT } from "../../../../types/worker";
import { ShiftT } from "../../../../types/shift";

export default function BlockDisplayShiftWorkerOption({
  lng,
  workers,
  shifts,
  index,
  block,
  templateBlock,
  error,
  handleEditBlock,
  handleRemoveError,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
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
      case "Duties":
        return t("duties");
      case `${t("not")} duties`:
        return `${t("not")} ${t("duties").toLocaleLowerCase()}`;
      default:
        return name;
    }
  };

  const swoDisplayString = (swo: ShiftWorkerOptionT): string => {
    const displayText = getShiftWorkerOptionDisplayText(
      swo,
      workers,
      shifts,
      t("not")
    );
    return translateOptionName(displayText);
  };

  const blockDisplay = () => {
    const blockNames = [];
    let displayString = null;
    if (block && Array.isArray(block.value) && block.value.length !== 0) {
      for (let i = 0; i < block.value.length; i++) {
        const swo = block.value[i] as ShiftWorkerOptionT;
        blockNames.push(swoDisplayString(swo));
      }
      displayString = blockNames.join(", ");
    }

    return (
      <div>
        {displayString
          ? blockDislayValue(displayString)
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
          swoDisplayString={swoDisplayString}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
