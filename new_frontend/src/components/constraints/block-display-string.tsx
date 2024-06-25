import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// Components
import BlockEditString from "./block-edit-string";
import GetBlockNameLabel from "../data-display/get-block-name-label";
import PopoverBoxAnchorElOver from "../inputs/popover-box-anchor-el-over";
import {
  blockDisplayName,
  blockDisplayPlaceholder,
  blockDislayValue,
} from "../data-display/block-dislay";
// Types
import { TemplateBlockT, BlockT } from "../../types/constraint";

export default function BlockDisplayString({
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

  const translateOptionName = (name: string): string => {
    const translations: Record<string, string> = {
      "at least": "constraint.operator_at_least",
      exactly: "constraint.operator_exactly",
      "at most": "constraint.operator_at_most",
      "per week": "constraint.timing_per_week",
      "per month": "constraint.timing_per_month",
      "per year": "constraint.timing_per_year",
      no: "constraint.operator_no",
      after: "constraint.timing_after",
      before: "constraint.timing_before",
      monday: "week_days.monday",
      tuesday: "week_days.tuesday",
      wednesday: "week_days.wednesday",
      thursday: "week_days.thursday",
      friday: "week_days.friday",
      saturday: "week_days.saturday",
      sunday: "week_days.sunday",
      "should only": "constraint.operator_should_only",
      "should not": "constraint.operator_should_not",
    };

    return translations[name] ? t(translations[name]) : name;
  };

  const blockDisplay = () => {
    return (
      <div>
        {block && block.value !== ""
          ? blockDislayValue(translateOptionName(block.value as string))
          : blockDisplayPlaceholder(templateBlock.placeholder)}
        {blockDisplayName(GetBlockNameLabel(lng, templateBlock.name))}
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
