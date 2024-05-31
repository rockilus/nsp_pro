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

  // const translateOptionName = (name: string): string => {
  //   switch (name) {
  //     case "at least":
  //       return t("constraint.operator_at_least");
  //     case "exactly":
  //       return t("constraint.operator_exactly");
  //     case "at most":
  //       return t("constraint.operator_at_most");
  //     case "per week":
  //       return t("constraint.timing_per_week");
  //     case "per month":
  //       return t("constraint.timing_per_month");
  //     case "per year":
  //       return t("constraint.timing_per_year");
  //     case "no":
  //       return t("constraint.operator_no");
  //     case "after":
  //       return t("constraint.timing_after");
  //     case "before":
  //       return t("constraint.timing_before");
  //     case "monday":
  //       return t("week_days.monday");
  //     case "tuesday":
  //       return t("week_days.tuesday");
  //     case "wednesday":
  //       return t("week_days.wednesday");
  //     case "thursday":
  //       return t("week_days.thursday");
  //     case "friday":
  //       return t("week_days.friday");
  //     case "saturday":
  //       return t("week_days.saturday");
  //     case "sunday":
  //       return t("week_days.sunday");
  //     case "should only":
  //       return t("constraint.operator_should_only");
  //     case "should not":
  //       return t("constraint.operator_should_not");
  //     default:
  //       return name;
  //   }
  // };

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
