import React, { useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
// Components
import BlockEditString from "./block-edit-string";
import GetBlockNameLabel from "../../../data-display/get-block-name-label";
import PopoverBoxAnchorElOver from "../../../inputs/popover-box-anchor-el-over";
import {
  blockDisplayName,
  blockDisplayPlaceholder,
  blockDislayValue,
} from "../../../data-display/block-display";
// Types
import { TemplateBlockT, BlockT } from "../../../../types/constraint";

export default function BlockDisplayString({
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

  const translateOptionName = (name: string): string => {
    const translations: Record<string, string> = {
      "at least": "operator_at_least",
      exactly: "operator_exactly",
      "at most": "operator_at_most",
      "per week": "timing_per_week",
      "per month": "timing_per_month",
      "per year": "timing_per_year",
      no: "operator_no",
      after: "timing_after",
      before: "timing_before",
      monday: "week_days.monday",
      tuesday: "week_days.tuesday",
      wednesday: "week_days.wednesday",
      thursday: "week_days.thursday",
      friday: "week_days.friday",
      saturday: "week_days.saturday",
      sunday: "week_days.sunday",
      "should only": "operator_should_only",
      "should not": "operator_should_not",
    };

    return translations[name] ? t(translations[name]) : name;
  };

  const blockDisplay = () => {
    return (
      <div>
        {block && block.value !== ""
          ? blockDislayValue(translateOptionName(block.value as string))
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
        <BlockEditString
          lng={lng}
          index={index}
          block={block}
          templateBlock={templateBlock}
          error={error}
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
